const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");
const { addSSEClient, removeSSEClient, getSSEClientCount } = require("../helpers/sse");

// Get recent activities
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50; // Default to 50 most recent
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        player: {
          select: {
            name: true,
            codename: true,
          },
        },
      },
    });
    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// SSE endpoint for real-time activity updates
router.get("/stream", (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Add this client to the list of connected clients
  addSSEClient(res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  
  // Handle client disconnect
  req.on('close', () => {
    removeSSEClient(res);
    console.log(`SSE client disconnected. ${getSSEClientCount()} clients connected`);
  });
  
  console.log(`SSE client connected. ${getSSEClientCount()} clients total`);
});

module.exports = router;

