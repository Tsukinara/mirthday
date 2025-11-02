const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");
const { broadcastActivity } = require("../helpers/sse");

// Task codes that should be excluded after 2 releases
const RESTRICTED_TASK_CODES = ["ZLDS", "GQPQ", "KBLZ", "ZXKT", "FMUP", "ZTHY", "SSTW", "GICQ"];

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}

// Get all tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: { assignee: true },
    });
    // Remove 'code' field from each task for security
    const sanitizedTasks = tasks.map(({ code, ...task }) => task);
    res.json(sanitizedTasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Get single task by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(id) },
      include: { assignee: true },
    });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    // Remove 'code' field for security
    const { code, ...sanitizedTask } = task;
    res.json(sanitizedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// Create new task
router.post("/", async (req, res) => {
  const { objectiveId, status, code, assigneeId, prefixText, type, clueContent } = req.body;
  
  try {
    const newTask = await prisma.task.create({
      data: { objectiveId, status, code, assigneeId, prefixText, type, clueContent },
    });
    res.json(newTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Update task by ID
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { objectiveId, status, code, assigneeId, prefixText, type, clueContent } = req.body;
  
  try {
    // Build update data object, only including fields that are provided
    const updateData = {};
    if (objectiveId !== undefined) updateData.objectiveId = objectiveId;
    if (status !== undefined) updateData.status = status;
    if (code !== undefined) updateData.code = code;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (prefixText !== undefined) updateData.prefixText = prefixText;
    if (type !== undefined) updateData.type = type;
    if (clueContent !== undefined) updateData.clueContent = clueContent;
    
    const updatedTask = await prisma.task.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete task by ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedTask = await prisma.task.delete({
      where: { id: parseInt(id) },
    });
    res.json(deletedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Get task for a specific user
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const unsolvedTask = await prisma.task.findFirst({
      where: { assigneeId: parseInt(userId), status: 'UNSOLVED' },
      include: { assignee: true },
    });
    // Return unsolved task if exists, or null
    res.json(unsolvedTask || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user task" });
  }
});

// Check if unassigned tasks are available
router.get("/unassigned/available", async (req, res) => {
  try {
    const unassignedCount = await prisma.task.count({
      where: { assigneeId: null, status: 'UNSOLVED' },
    });
    
    res.json({ available: unassignedCount > 0, count: unassignedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to check unassigned tasks" });
  }
});

// Request a new task for a user
router.post("/request/:userId", async (req, res) => {
  const { userId } = req.params;
  
  try {
    let releasedTaskId = null;
    
    // Check if user already has an incomplete task
    const existingTask = await prisma.task.findFirst({
      where: { assigneeId: parseInt(userId), status: "UNSOLVED" },
    });
    
    // If user has an existing incomplete task, release it back to the pool
    if (existingTask) {
      releasedTaskId = existingTask.id; // Store the released task ID
      
      const updateData = { 
        assigneeId: null,
        assignedAt: null,
      };
      
      // If this is a restricted task code, increment the release count
      if (RESTRICTED_TASK_CODES.includes(existingTask.code)) {
        updateData.releaseCount = { increment: 1 };
      }
      
      await prisma.task.update({
        where: { id: existingTask.id },
        data: updateData,
      });
      console.log(`Released task ${existingTask.code} back to the pool for user ${userId}`);
    }
    
    // Find unassigned tasks
    const unassignedTasks = await prisma.task.findMany({
      where: { assigneeId: null, status: 'UNSOLVED' },
    });

    if (unassignedTasks.length === 0) {
      return res.json({ assigned: false, message: "All remaining tasks have already been assigned. Please assist other agents." });
    }

    // Filter out restricted tasks that have been released 2+ times
    // unless there are no other options
    const filteredTasks = unassignedTasks.filter(task => {
      if (RESTRICTED_TASK_CODES.includes(task.code) && task.releaseCount >= 2) {
        return false;
      }
      return true;
    });

    // If filtering removed all tasks, use the original list (fallback to all tasks)
    let tasksToSelectFrom = filteredTasks.length > 0 ? filteredTasks : unassignedTasks;

    // Exclude the task that was just released (unless it's the only one remaining)
    if (releasedTaskId && tasksToSelectFrom.length > 1) {
      tasksToSelectFrom = tasksToSelectFrom.filter(task => task.id !== releasedTaskId);
    }

    // Randomly select one
    const randomTask = tasksToSelectFrom[Math.floor(Math.random() * tasksToSelectFrom.length)];
    
    // Assign it to the user
    const assignedTask = await prisma.task.update({
      where: { id: randomTask.id },
      data: { 
        assigneeId: parseInt(userId),
        assignedAt: new Date(),
      },
      include: { assignee: true },
    });
    
    console.log(`Assigned task ${assignedTask.code} to user ${userId}`);
    
    res.json({ assigned: true, task: assignedTask });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to request new task" });
  }
});

// Verify task code
router.post("/verify/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const { code } = req.body;
  
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(taskId) },
      include: { objective: true },
    });
    
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Case-insensitive code comparison
    const isCorrect = task.code.toLowerCase() === code.toLowerCase();
    
    if (isCorrect && task.status === "UNSOLVED") {
      // Mark task as solved
      const updatedTask = await prisma.task.update({
        where: { id: parseInt(taskId) },
        data: { 
          status: "SOLVED",
          completedAt: new Date(),
        },
      });
      
      // Increment piecesFound for the objective
      await prisma.objective.update({
        where: { id: task.objectiveId },
        data: { 
          piecesFound: {
            increment: 1
          }
        },
      });
      
      // Fetch objective for activity logging
      const objective = await prisma.objective.findUnique({
        where: { id: task.objectiveId },
      });
      
      // Log task solved activity - get assignee info
      if (task.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: task.assigneeId },
        });
        
        if (assignee) {
          const activity = await prisma.activity.create({
            data: {
              type: 'TASK_SOLVED',
              message: `Agent ${toTitleCase(assignee.codename)} found a piece for objective: "${objective.name}"`,
              playerId: task.assigneeId,
            },
            include: {
              player: {
                select: {
                  name: true,
                  codename: true,
                },
              },
            },
          });
          broadcastActivity(activity);
        }
      }
      
      console.log(`Task ${task.code} solved, objective ${task.objective.type} piecesFound incremented`);
      
      res.json({ correct: true, task: updatedTask });
    } else if (isCorrect) {
      // Remove 'code' field for security
      const { code, objective, ...sanitizedTask } = task;
      res.json({ correct: true, task: sanitizedTask, message: "Task already completed" });
    } else {
      res.json({ correct: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to verify code" });
  }
});

// Admin endpoint: Mark N random tasks as completed
router.post("/admin/mark-random", async (req, res) => {
  const { count } = req.body;
  
  try {
    // Get all unsolved tasks
    const unsolvedTasks = await prisma.task.findMany({
      where: { status: 'UNSOLVED' },
    });
    
    if (unsolvedTasks.length === 0) {
      return res.json({ message: "No unsolved tasks available", markedCount: 0 });
    }
    
    // Determine how many to mark (can't mark more than available)
    const countToMark = Math.min(count || 0, unsolvedTasks.length);
    
    if (countToMark <= 0) {
      return res.json({ message: "Invalid count or no tasks to mark", markedCount: 0 });
    }
    
    // Randomly select tasks
    const shuffled = [...unsolvedTasks].sort(() => Math.random() - 0.5);
    const tasksToMark = shuffled.slice(0, countToMark);
    
    // Mark them as solved
    const taskIds = tasksToMark.map(t => t.id);
    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { 
        status: 'SOLVED',
        completedAt: new Date(),
      },
    });
    
    // For each task, increment the objective's piecesFound
    for (const task of tasksToMark) {
      await prisma.objective.update({
        where: { id: task.objectiveId },
        data: {
          piecesFound: {
            increment: 1
          }
        },
      });
      
      // Fetch objective for activity logging
      const objective = await prisma.objective.findUnique({
        where: { id: task.objectiveId },
      });
      
      // Log activity for each marked task
      if (task.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: task.assigneeId },
        });
        
        if (assignee) {
          const activity = await prisma.activity.create({
            data: {
              type: 'TASK_SOLVED',
              message: `Agent ${toTitleCase(assignee.codename)} found a piece for objective: "${objective.name}"`,
              playerId: task.assigneeId,
            },
            include: {
              player: {
                select: {
                  name: true,
                  codename: true,
                },
              },
            },
          });
          broadcastActivity(activity);
        }
      }
    }
    
    console.log(`Admin marked ${countToMark} random tasks as completed`);
    
    res.json({ 
      message: `Successfully marked ${countToMark} task(s) as completed`,
      markedCount: countToMark,
      totalUnsolved: unsolvedTasks.length 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to mark random tasks" });
  }
});

module.exports = router;

