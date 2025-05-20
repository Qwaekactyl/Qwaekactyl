const settings = require("../settings.json");
const fetch = require('node-fetch');

// Store the nodes and their statuses
let nodes = [];

// Function to fetch node statuses and update the 'nodes' array
async function updateNodeStatus() {
  const url = settings.status.url; // Ensure this is an absolute URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Invalid URL: Only absolute URLs are supported');
  }

  try {
    const response = await fetch(url, {
      "method": "GET",
      "headers": {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.pterodactyl.key}`
      }
    });
    const json = await response.json();

    const promises = json.data.map(async (data) => {
      const body = {
        id: data.attributes.id,
        name: data.attributes.name,
        memory: data.attributes.memory,
        disk: data.attributes.disk
      };

      try {
        const fqdn = data.attributes.fqdn.startsWith('http') ? data.attributes.fqdn : `https://${data.attributes.fqdn}`;
        const healthUrl = `${fqdn}:${data.attributes.daemon_listen}/health`;

        const healthResponse = await fetch(healthUrl, {
          "method": "GET",
          "headers": {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.pterodactyl.key}`
          }
        });
        if (healthResponse.status >= 500 && healthResponse.status <= 599) {
          body.status = 'offline';
        } else {
          body.status = 'online';
        }
      } catch (error) {
        body.status = "offline";
      }
      return body;
    });

    Promise.all(promises).then((updatedNodes) => {
      nodes = updatedNodes;
    }).catch((error) => {
      console.error(error);
    });
  } catch (error) {
    console.error(error);
  }
}

// Initial fetch to populate the 'nodes' array
updateNodeStatus();

// Update the node status every 30 seconds
const interval = 30 * 1000; // 30 seconds in milliseconds
setInterval(updateNodeStatus, interval);

// Function to handle API requests for node statuses
module.exports.load = async function(app, db) {
  app.get("/api/nodes", (req, res) => {
    // Check if node statuses have been fetched at least once
    if (nodes.length === 0) {
      res.status(500).send("Node statuses are not available yet. Please try again later.");
    } else {
      res.send(nodes);
    }
  });
};
