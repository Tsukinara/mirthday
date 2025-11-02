// backend/index.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables from .env
dotenv.config();

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const eventStatusRoutes = require("./routes/eventStatus");
const usersRoutes = require("./routes/users");
const objectivesRoutes = require("./routes/objectives");
const tasksRoutes = require("./routes/tasks");
const leaderboardRoutes = require("./routes/leaderboard");
const activitiesRoutes = require("./routes/activities");
const votesRoutes = require("./routes/votes");

// Basic test route
app.get("/", async (req, res) => {
  res.json({ message: "Hello from backend!" });
});

// Use routes
app.use("/event-status", eventStatusRoutes);
app.use("/users", usersRoutes);
app.use("/objectives", objectivesRoutes);
app.use("/tasks", tasksRoutes);
app.use("/leaderboard", leaderboardRoutes);
app.use("/activities", activitiesRoutes);
app.use("/votes", votesRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
