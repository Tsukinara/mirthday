const { initializeObjectivesFromCSV, initializeTasksFromCSV, initializeAllTasks } = require('./helpers/csvLoader');
const prisma = require('./prismaClient');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Initialize objectives from CSV
    const objectives = await initializeObjectivesFromCSV();
    
    // Clear existing objectives and create new ones
    await prisma.objective.deleteMany({});
    console.log('Cleared existing objectives');
    
    for (const objective of objectives) {
      await prisma.objective.create({
        data: objective,
      });
    }
    console.log(`Created ${objectives.length} objectives`);
    
    // Initialize tasks from CSV
    const tasks = await initializeTasksFromCSV();
    await initializeAllTasks(tasks);
    
    // Initialize event status if it doesn't exist
    const eventStatus = await prisma.eventStatus.findFirst();
    if (!eventStatus) {
      await prisma.eventStatus.create({
        data: {
          status: 'NOT_STARTED'
        }
      });
      console.log('Created initial event status');
    }
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
