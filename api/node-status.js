const newsettings = require("../settings");
const fetch = require('node-fetch');

// Store the nodes and their statuses
let nodes = [];

// Function to fetch node statuses and update the 'nodes' array
async function updateNodeStatus() {
  try {
    const response = await fetch(newsettings.pterodactyl.domain + "/api/application/nodes", {
      "method": "GET",
      "headers": {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${newsettings.pterodactyl.key}`
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
        const healthResponse = await fetch("https://" + data.attributes.fqdn + ":" + data.attributes.daemon_listen + "/health", {
          "method": "GET",
          "headers": {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${newsettings.pterodactyl.key}`
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
