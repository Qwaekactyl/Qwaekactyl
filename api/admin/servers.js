const settings = require("../../settings");
const fetch = require("node-fetch");
const indexjs = require("../../index.js");
const ejs = require("ejs");

module.exports.load = async function(app, db) {

  app.get("/api/admin/servers?per_page=69", async (req, res) => {

    const server = [];
    const Serverinfo = new Promise(async (resolve, reject) => {
      const response = await fetch(settings.pterodactyl.domain + "/api/application/servers", {
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
          node: data.attributes.node,
          egg: data.attributes.egg
        };
        return body;
      });

      Promise.all(promises).then((servers) => {
        server.push(...servers);
        resolve();
      }).catch((error) => {
        reject(error);
      });
    });

    Serverinfo.then(() => {
      res.send(server);
    }).catch((error) => {
      console.error(error);
    });
  })

  app.get('/api/admin/servers/suspend', async (req, res) => {
    if (!req.query.id) return res.send("invalid id.")

    let theme = indexjs.get(req);
    if (!req.session.pterodactyl) return four0four(req, res, theme);

    let cacheaccount = await fetch(settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + req.session.userinfo.id)) + "?include=servers", {
      method: "GET",
      headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
    });

    if (await cacheaccount.statusText == "Not Found") return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true) return four0four(req, res, theme);

    try {
      await fetch(settings.pterodactyl.domain + `/api/application/servers/${req.query.id}/suspend`, {
        "method": "POST",
        "headers": {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.pterodactyl.key}`
        }
      })
        .then(response => {
          if (response.status == 204) {
            let successredirect = theme.settings.redirect.suspended || "/";
            res.redirect(successredirect + "?err=none");
          }
        })
    } catch (err) {
      console.log(err)
    }
  })

  app.get('/api/admin/servers/details', async (req, res) => {
    if (!req.query.id) return res.send("Invalid Id")
    let server = {}
    await fetch(settings.pterodactyl.domain + `/api/application/servers/${req.query.id}`, {
      "method": "GET",
      "headers": {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.pterodactyl.key}`
      }
    }).then(response => response.json())
      .then(json => {
        server.id = json.attributes.id
        server.uuid = json.attributes.uuid
        server.name = json.attributes.name
        server.suspend = json.attributes.suspended
        server.memory = json.attributes.limits.memory
        server.disk = json.attributes.limits.disk
        server.cpu = json.attributes.limits.cpu
        server.node = json.attributes.node
        server.egg = json.attributes.egg
      })

    res.send(server)
  })

  async function four0four(req, res, theme) {
    ejs.renderFile(
      `./themes/${theme.name}/${theme.settings.notfound}`,
      await eval(indexjs.renderdataeval),
      null,
      function(err, str) {
        delete req.session.newaccount;
        if (err) {
          console.log(`[WEBSITE] An error has occured on path ${req._parsedUrl.pathname}:`);
          console.log(err);
          return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
        };
        res.status(404);
        res.send(str);
      });
  }
};
