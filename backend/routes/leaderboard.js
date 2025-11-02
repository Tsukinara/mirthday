const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");

// Get leaderboard (top 10 agents by pieces found)
router.get("/", async (req, res) => {
  try {
    // Get all players (excluding admins) with their solved tasks
    const players = await prisma.user.findMany({
      where: { role: "PLAYER" },
      include: {
        tasks: {
          where: { status: "SOLVED" },
        },
      },
    });

    // Calculate pieces found for each player
    const leaderboard = players
      .map((player) => ({
        id: player.id,
        name: player.name,
        codename: player.codename,
        piecesFound: player.tasks.length,
      }))
      .sort((a, b) => b.piecesFound - a.piecesFound)
      .slice(0, 10); // Top 10

    res.json(leaderboard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

module.exports = router;

