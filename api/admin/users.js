const settings = require("../../settings");
const fetch = require("node-fetch");

module.exports.load = async function(app, db) {

  app.get("/api/admin/users/details", async (req,res) => {

    if(!req.query.id) return res.send("Invalid Id")
    await fetch(settings.pterodactyl.domain + "/api/application/users/" + req.query.id, {
    "method": "GET",
    "headers": {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.pterodactyl.key}`
    }
    })
    .then(response => response.json())
    .then(json => {
        async function data() {
          let body = {
            id: req.query.id
        }
        body.email = json.attributes.email
        body.uuid = json.attributes.uuid
        body.username = json.attributes.username
        body.first_name = json.attributes.first_name
        body.last_name = json.attributes.last_name
        body.admin = json.attributes.root_admin

        let package = await db.get("package-" + req.query.id) ? await db.get("package-" + req.query.id) : settings.api.client.packages.list.default
        let extra = await db.get("extra-" + req.query.id) ? await db.get("extra-" + req.query.id) : {
          ram: 0,
          disk: 0,
          cpu: 0,
          servers: 0
        }
        body.ram = package.ram + extra.ram
        body.disk = package.disk + extra.disk
        body.cpu = package.cpu + extra.cpu
        body.servers = package.servers + extra.servers
        res.send(body)
        }

        data();
    })

  })

  app.get("/api/admin/users", async (req,res) => {

    const user = [];
    const Userinfo = new Promise(async (resolve, reject) => {
    const response = await fetch(settings.pterodactyl.domain + "/api/application/users?per_page=1000000000000000", {
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
        username: data.attributes.username,
        admin: data.attributes.root_admin,
        email: data.attributes.email
    };
    return body;
});

Promise.all(promises).then((users) => {
    user.push(...users);
    resolve();
}).catch((error) => {
    reject(error);
});
});

Userinfo.then(() => {
res.send(user);
}).catch((error) => {
console.error(error);
});
  })
};
