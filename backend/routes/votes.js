const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");
const { broadcast } = require("../helpers/sse");

// Cast a vote
router.post("/cast", async (req, res) => {
  try {
    const { voterId, codename } = req.body;

    if (!voterId || !codename) {
      return res.status(400).json({ error: "voterId and codename are required" });
    }

    // Check if event is in FINALE state (voting disabled)
    const eventStatus = await prisma.eventStatus.findFirst();
    if (eventStatus && eventStatus.status === 'FINALE') {
      return res.status(400).json({ error: "Voting has ended" });
    }

    // Get voter
    const voter = await prisma.user.findUnique({
      where: { id: parseInt(voterId) },
    });

    if (!voter) {
      return res.status(404).json({ error: "Voter not found" });
    }

    // Check if voter has votes remaining
    const votesCast = await prisma.vote.count({
      where: { voterId: parseInt(voterId) },
    });

    if (votesCast >= voter.votes) {
      return res.status(400).json({ error: "No votes remaining" });
    }

    // Find recipient by codename (convert to lowercase since that's how they're stored)
    const recipient = await prisma.user.findUnique({
      where: { codename: codename.toLowerCase() },
    });

    if (!recipient) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Cast vote
    const vote = await prisma.vote.create({
      data: {
        voterId: parseInt(voterId),
        recipientId: recipient.id,
      },
      include: {
        recipient: {
          select: {
            id: true,
            name: true,
            codename: true,
          },
        },
      },
    });

    // Broadcast vote activity
    broadcast({
      type: 'VOTE_CAST',
      message: `${voter.codename} voted for ${recipient.codename}`,
    });

    res.json({ success: true, vote });
  } catch (error) {
    console.error("Error casting vote:", error);
    res.status(500).json({ error: "Failed to cast vote" });
  }
});

// Get vote leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    // Get vote counts grouped by recipient
    const votesByRecipient = await prisma.vote.groupBy({
      by: ['recipientId'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 16,
    });

    // Get full user details for the top recipients
    const leaderboard = await Promise.all(
      votesByRecipient.map(async (voteCount) => {
        const user = await prisma.user.findUnique({
          where: { id: voteCount.recipientId },
          select: {
            id: true,
            name: true,
            codename: true,
          },
        });
        return {
          ...user,
          voteCount: voteCount._count.id,
        };
      })
    );

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching vote leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch vote leaderboard" });
  }
});

// Get voter's remaining votes
router.get("/remaining/:voterId", async (req, res) => {
  try {
    const { voterId } = req.params;
    const voter = await prisma.user.findUnique({
      where: { id: parseInt(voterId) },
      select: { votes: true },
    });

    if (!voter) {
      return res.status(404).json({ error: "Voter not found" });
    }

    const votesCast = await prisma.vote.count({
      where: { voterId: parseInt(voterId) },
    });

    res.json({ 
      totalVotes: voter.votes,
      votesCast: votesCast,
      votesRemaining: voter.votes - votesCast,
    });
  } catch (error) {
    console.error("Error fetching remaining votes:", error);
    res.status(500).json({ error: "Failed to fetch remaining votes" });
  }
});

// Get winners (users who voted for ADMIN)
router.get("/winners", async (req, res) => {
  try {
    // Find admin user
    const admin = await prisma.user.findUnique({
      where: { codename: 'admin' },
    });

    if (!admin) {
      return res.json([]);
    }

    // Get all users who voted for admin
    const votesForAdmin = await prisma.vote.findMany({
      where: { recipientId: admin.id },
      include: {
        voter: {
          select: {
            id: true,
            name: true,
            codename: true,
          },
        },
      },
    });

    // Return unique voters
    const winners = Array.from(
      new Map(votesForAdmin.map(v => [v.voterId, v.voter])).values()
    );

    res.json(winners);
  } catch (error) {
    console.error("Error fetching winners:", error);
    res.status(500).json({ error: "Failed to fetch winners" });
  }
});

// Get user stats
router.get("/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's completed tasks with timestamps
    const completedTasks = await prisma.task.findMany({
      where: {
        assigneeId: parseInt(userId),
        status: 'SOLVED',
      },
      select: {
        id: true,
        assignedAt: true,
        completedAt: true,
      },
    });

    // Calculate stats
    const tasksCompleted = completedTasks.length;
    const avgCompletionSeconds = tasksCompleted > 0
      ? completedTasks.reduce((sum, task) => {
          const timeMs = new Date(task.completedAt) - new Date(task.assignedAt);
          return sum + timeMs;
        }, 0) / tasksCompleted / 1000 // Convert to seconds
      : 0;

    // Check if user won (voted for admin)
    const admin = await prisma.user.findUnique({
      where: { codename: 'admin' },
    });

    let isWinner = false;
    if (admin) {
      const voteForAdmin = await prisma.vote.findFirst({
        where: {
          voterId: parseInt(userId),
          recipientId: admin.id,
        },
      });
      isWinner = !!voteForAdmin;
    }

    res.json({
      tasksCompleted,
      avgCompletionSeconds: Math.round(avgCompletionSeconds),
      isWinner,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

// Admin: Give more votes to a player
router.post("/admin/give-votes", async (req, res) => {
  try {
    const { userId, additionalVotes } = req.body;

    if (!userId || additionalVotes === undefined) {
      return res.status(400).json({ error: "userId and additionalVotes are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        votes: user.votes + parseInt(additionalVotes),
      },
      select: {
        id: true,
        name: true,
        codename: true,
        votes: true,
      },
    });

    res.json({ 
      success: true, 
      message: `Gave ${additionalVotes} votes to ${updatedUser.codename}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error giving votes:", error);
    res.status(500).json({ error: "Failed to give votes" });
  }
});

module.exports = router;

