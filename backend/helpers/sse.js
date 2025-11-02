// SSE broadcasting helper
let sseClients = [];

function broadcast(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => client.write(message));
}

function broadcastActivity(activity) {
  // Legacy function for backward compatibility
  broadcast(activity);
}

function addSSEClient(client) {
  sseClients.push(client);
}

function removeSSEClient(client) {
  const index = sseClients.indexOf(client);
  if (index !== -1) {
    sseClients.splice(index, 1);
  }
}

function getSSEClientCount() {
  return sseClients.length;
}

module.exports = {
  broadcast,
  broadcastActivity,
  addSSEClient,
  removeSSEClient,
  getSSEClientCount,
};

