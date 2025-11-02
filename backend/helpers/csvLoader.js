const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const prisma = require("../prismaClient");

// Helper function to initialize objectives from CSV
async function initializeObjectivesFromCSV() {
  return new Promise((resolve, reject) => {
    const objectives = [];
    const csvPath = path.join(__dirname, "..", "objectives.csv");
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        // Map CSV columns to objective fields
        const objective = {
          name: row.name,
          type: row.objective.toUpperCase(),
          answer: row.answer,
          difficulty: parseInt(row.difficulty),
          status: "UNSOLVED",
          totalPieces: 0,
          piecesFound: 0,
        };
        objectives.push(objective);
      })
      .on("end", () => {
        console.log(`Loaded ${objectives.length} objectives from CSV`);
        resolve(objectives);
      })
      .on("error", (error) => {
        console.error("Error reading CSV:", error);
        reject(error);
      });
  });
}

// Helper function to initialize tasks from CSV
async function initializeTasksFromCSV() {
  return new Promise((resolve, reject) => {
    const tasks = [];
    const csvPath = path.join(__dirname, "..", "tasks.csv");
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        // Map CSV columns to task fields
        const task = {
          code: row.code,
          objective: row.objective.toUpperCase(),
          contents: row.contents,
          location: row.location || "Not yet hidden",
          prefix: row.prefix || "Not yet hidden. Contact Matt if you see this message.",
          type: row.type || null,
          clueContent: row.clue_content || null
        };
        tasks.push(task);
      })
      .on("end", () => {
        console.log(`Loaded ${tasks.length} tasks from CSV`);
        resolve(tasks);
      })
      .on("error", (error) => {
        console.error("Error reading CSV:", error);
        reject(error);
      });
  });
}

// Helper function to initialize all tasks from CSV with null assignees
async function initializeAllTasks(tasks) {
  try {
    // Get all objectives to map task objective to objective ID
    const objectives = await prisma.objective.findMany();
    const objectiveMap = {};
    objectives.forEach((obj) => {
      objectiveMap[obj.type] = obj.id;
    });

    // Clear existing tasks
    await prisma.task.deleteMany({});
    console.log("Cleared existing tasks");

    // Initialize all tasks with null assignees
    for (const task of tasks) {
      await prisma.task.create({
        data: {
          objectiveId: objectiveMap[task.objective],
          code: task.code,
          contents: task.contents,
          location: task.location,
          prefixText: task.prefix,
          type: task.type,
          clueContent: task.clueContent,
          status: "UNSOLVED",
          assigneeId: null,
        },
      });
    }

    console.log(`Initialized ${tasks.length} tasks`);

    // Update totalPieces for each objective based on task count
    for (const obj of objectives) {
      const taskCount = await prisma.task.count({
        where: { objectiveId: obj.id },
      });
      
      await prisma.objective.update({
        where: { id: obj.id },
        data: { totalPieces: taskCount },
      });
      
      console.log(`Updated objective ${obj.type}: ${taskCount} total pieces`);
    }
  } catch (error) {
    console.error("Error initializing tasks:", error);
    throw error;
  }
}

module.exports = {
  initializeObjectivesFromCSV,
  initializeTasksFromCSV,
  initializeAllTasks,
};

