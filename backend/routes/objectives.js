const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");
const { OBJECTIVE_TYPES } = require("../constants");
const { broadcastActivity } = require("../helpers/sse");

// Helper function to sanitize objective based on status
function sanitizeObjective(objective) {
  if (objective.status === "SOLVED") {
    // Include answer if solved
    return objective;
  } else {
    // Exclude answer if not solved
    const { answer, ...sanitized } = objective;
    return sanitized;
  }
}

// Get all objectives
router.get("/", async (req, res) => {
  try {
    const objectives = await prisma.objective.findMany();
    const sanitizedObjectives = objectives.map(sanitizeObjective);
    res.json(sanitizedObjectives);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch objectives" });
  }
});

// Admin endpoint: Get all objectives without sanitization (must be before /:id)
router.get("/admin/all", async (req, res) => {
  try {
    const objectives = await prisma.objective.findMany();
    res.json(objectives);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch objectives" });
  }
});

// Get single objective by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const objective = await prisma.objective.findUnique({
      where: { id: parseInt(id) },
    });
    if (!objective) {
      return res.status(404).json({ error: "Objective not found" });
    }
    const sanitizedObjective = sanitizeObjective(objective);
    res.json(sanitizedObjective);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch objective" });
  }
});

// Verify objective answer
router.post("/verify/:id", async (req, res) => {
  const { id } = req.params;
  const { answer } = req.body;
  
  try {
    const objective = await prisma.objective.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!objective) {
      return res.status(404).json({ error: "Objective not found" });
    }
    
    // Case-insensitive comparison
    const isCorrect = objective.answer.toLowerCase().trim() === answer.toLowerCase().trim();
    
    if (isCorrect && objective.status !== "SOLVED") {
      // Mark objective as solved
      const updatedObjective = await prisma.objective.update({
        where: { id: parseInt(id) },
        data: { status: "SOLVED" },
      });
      
      // Check if all objectives are now complete
      const allObjectives = await prisma.objective.findMany();
      const allComplete = allObjectives.every(obj => obj.status === 'SOLVED');
      
      // If all objectives complete, update event status to OBJECTIVES_COMPLETE
      if (allComplete) {
        const eventStatus = await prisma.eventStatus.findFirst();
        if (eventStatus && eventStatus.status !== 'OBJECTIVES_COMPLETE' && eventStatus.status !== 'FINAL_TASK_COMPLETE') {
          await prisma.eventStatus.update({
            where: { id: eventStatus.id },
            data: { status: 'OBJECTIVES_COMPLETE' },
          });
          console.log("All objectives complete! Event status updated to OBJECTIVES_COMPLETE");
        }
      }
      
      // Log objective cleared activity
      const activity = await prisma.activity.create({
        data: {
          type: 'OBJECTIVE_CLEARED',
          message: `Objective: "${objective.name}" has been cleared`,
        },
      });
      broadcastActivity(activity);
      
      console.log(`Objective ${objective.name} solved`);
      
      res.json({ correct: true, objective: updatedObjective });
    } else if (isCorrect) {
      res.json({ correct: true, objective: objective, message: "Objective already solved" });
    } else {
      res.json({ correct: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to verify answer" });
  }
});

// Create new objective
router.post("/", async (req, res) => {
  const { type, status, answer, totalPieces, piecesFound } = req.body;
  
  // Validate objective type
  if (!OBJECTIVE_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid objective type. Must be one of: ${OBJECTIVE_TYPES.join(', ')}` });
  }
  
  try {
    const newObjective = await prisma.objective.create({
      data: { type, status, answer, totalPieces, piecesFound },
    });
    res.json(newObjective);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create objective" });
  }
});

// Update objective by ID
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { type, status, answer, totalPieces, piecesFound } = req.body;
  
  // Validate objective type if provided
  if (type && !OBJECTIVE_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid objective type. Must be one of: ${OBJECTIVE_TYPES.join(', ')}` });
  }
  
  try {
    const updatedObjective = await prisma.objective.update({
      where: { id: parseInt(id) },
      data: { type, status, answer, totalPieces, piecesFound },
    });
    res.json(updatedObjective);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update objective" });
  }
});

// Delete objective by ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedObjective = await prisma.objective.delete({
      where: { id: parseInt(id) },
    });
    res.json(deletedObjective);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete objective" });
  }
});

module.exports = router;

