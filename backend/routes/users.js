const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");
const { AGENT_CODENAMES } = require("../constants");

// Task codes that should be excluded after 2 releases
const RESTRICTED_TASK_CODES = ["ZLDS", "GQPQ", "KBLZ", "ZXKT", "FMUP", "ZTHY", "SSTW", "GICQ"];

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Create new user
router.post("/", async (req, res) => {
  const { name, codename, pin } = req.body;
  
  // Validate codename (case-insensitive)
  const lowerCodename = codename.toLowerCase();
  if (!AGENT_CODENAMES.includes(lowerCodename)) {
    return res.status(400).json({ error: `Invalid codename. Must be one of: ${AGENT_CODENAMES.join(', ')}` });
  }
  
  // Validate PIN is exactly 4 digits
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: "PIN must be exactly 4 numerical digits" });
  }
  
  try {
    // Check if user is registering as admin
    const role = lowerCodename === 'admin' ? 'ADMIN' : 'PLAYER';
    
    const newUser = await prisma.user.create({
      data: { name, codename: lowerCodename, pin, role },
    });

    // If event is started and user is a PLAYER, assign a random unassigned task
    if (role === 'PLAYER') {
      const eventStatus = await prisma.eventStatus.findFirst();
      if (eventStatus && (eventStatus.status === 'IN_PROGRESS' || eventStatus.status === 'OBJECTIVES_COMPLETE')) {
        // Find unassigned tasks
        const unassignedTasks = await prisma.task.findMany({
          where: { assigneeId: null, status: 'UNSOLVED' },
        });

        if (unassignedTasks.length > 0) {
          // Filter out restricted tasks that have been released 2+ times
          // unless there are no other options
          const filteredTasks = unassignedTasks.filter(task => {
            if (RESTRICTED_TASK_CODES.includes(task.code) && task.releaseCount >= 2) {
              return false;
            }
            return true;
          });

          // If filtering removed all tasks, use the original list (fallback to all tasks)
          const tasksToSelectFrom = filteredTasks.length > 0 ? filteredTasks : unassignedTasks;

          // Randomly select one
          const randomTask = tasksToSelectFrom[Math.floor(Math.random() * tasksToSelectFrom.length)];
          
          // Assign it to the new player
          await prisma.task.update({
            where: { id: randomTask.id },
            data: { 
              assigneeId: newUser.id,
              assignedAt: new Date(),
            },
          });
          
          console.log(`Assigned task ${randomTask.code} to new player ${newUser.codename}`);
        }
      }
    }

    res.json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Get single user by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: { tasks: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update user by ID
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, codename, pin } = req.body;
  try {
    const updateData = { name, pin };
    if (codename) {
      updateData.codename = codename.toLowerCase();
    }
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user by ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedUser = await prisma.user.delete({
      where: { id: parseInt(id) },
    });
    res.json(deletedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = router;

