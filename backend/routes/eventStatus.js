const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");
const { initializeObjectivesFromCSV, initializeTasksFromCSV, initializeAllTasks } = require("../helpers/csvLoader");
const { broadcast } = require("../helpers/sse");

// Get event status
router.get("/", async (req, res) => {
  try {
    let eventStatus = await prisma.eventStatus.findFirst();
    if (!eventStatus) {
      eventStatus = await prisma.eventStatus.create({
        data: { status: 'NOT_STARTED' },
      });
    }
    // Add backward compatibility field
    const response = {
      ...eventStatus,
      eventStarted: eventStatus.status === 'IN_PROGRESS' || eventStatus.status === 'OBJECTIVES_COMPLETE' || eventStatus.status === 'FINAL_TASK_COMPLETE',
    };
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch event status" });
  }
});

// Update event status
router.put("/", async (req, res) => {
  const { status: newStatus } = req.body;
  
  // Backward compatibility: check for eventStarted boolean
  const targetStatus = newStatus || (req.body.eventStarted ? 'IN_PROGRESS' : 'NOT_STARTED');
  
  try {
    let eventStatus = await prisma.eventStatus.findFirst();
    const previousStatus = eventStatus?.status || 'NOT_STARTED';
    
    // If starting the event (NOT_STARTED -> IN_PROGRESS), initialize data
    if (targetStatus === 'IN_PROGRESS' && previousStatus === 'NOT_STARTED') {
      console.log("Initializing event data from CSVs...");
      
      try {
        // Initialize objectives first
        const objectives = await initializeObjectivesFromCSV();
        console.log(`Parsed ${objectives.length} objectives from CSV`);
        
        if (objectives.length === 0) {
          throw new Error("No valid objectives were parsed from CSV. Check CSV file format and column names.");
        }
        
        await prisma.objective.deleteMany({});
        for (const obj of objectives) {
          try {
            const created = await prisma.objective.create({ data: obj });
            console.log(`Created objective: ${created.name}, answer: "${created.answer}"`);
          } catch (createError) {
            console.error(`Error creating objective ${obj.name}:`, createError);
            throw createError;
          }
        }
        console.log("Objectives initialized");
        
        // Then initialize all tasks
        const tasks = await initializeTasksFromCSV();
        await initializeAllTasks(tasks);
        console.log("Tasks initialized");
      } catch (initError) {
        console.error("Error during initialization:", initError);
        throw initError;
      }
    }
    
    // If stopping the event (any status -> NOT_STARTED), clear all data except admin
    if (targetStatus === 'NOT_STARTED' && previousStatus !== 'NOT_STARTED') {
      console.log("Stopping event - clearing all data except admin...");
      await prisma.task.deleteMany({});
      await prisma.objective.deleteMany({});
      await prisma.vote.deleteMany({});
      await prisma.user.deleteMany({
        where: { role: { not: "ADMIN" } },
      });
      console.log("All data cleared except admin users");
    }
    
    if (!eventStatus) {
      eventStatus = await prisma.eventStatus.create({
        data: { status: targetStatus },
      });
    } else {
      eventStatus = await prisma.eventStatus.update({
        where: { id: eventStatus.id },
        data: { status: targetStatus },
      });
    }
    
    // Add backward compatibility field
    const response = {
      ...eventStatus,
      eventStarted: eventStatus.status === 'IN_PROGRESS' || eventStatus.status === 'OBJECTIVES_COMPLETE' || eventStatus.status === 'FINAL_TASK_COMPLETE',
    };
    
    // Broadcast the status change to all connected SSE clients
    broadcast({
      type: 'EVENT_STATUS_CHANGED',
      eventStatus: response,
    });
    
    console.log(`Event status changed to: ${targetStatus}`);
    res.json(response);
  } catch (error) {
    console.error("Error updating event status:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to update event status",
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

