const settings = require("../settings");
const fetch = require('node-fetch');
const indexjs = require("../index.js");
const arciotext = (require("./arcio.js")).text;
const adminjs = require("./admin/suspend.js");
const renew = require("./renewal.js");
const fs = require("fs");

if (settings.pterodactyl) if (settings.pterodactyl.domain) {
  if (settings.pterodactyl.domain.slice(-1) == "/") settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
};

module.exports.load = async function(app, db) {
  app.get("/updateinfo", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login")
    let cacheaccount = await fetch(
      settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + req.session.userinfo.id)) + "?include=servers",
      {
        method: "get",
        headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
      }
    );
    if (await cacheaccount.statusText == "Not Found") return res.send("An error has occured while attempting to update your account information and server list.");
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (req.query.redirect) if (typeof req.query.redirect == "string") return res.redirect("/" + req.query.redirect);
    let theme = indexjs.get(req);
    res.redirect(theme.settings.redirect.updateservers || "/");
  });

  app.get("/create", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");
    
    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.create == true) {
      let redirectlink = theme.settings.redirect.failedcreateserver || "/"; // fail redirect link
      
      if (req.query.name && req.query.ram && req.query.disk && req.query.cpu && req.query.egg && req.query.location) {
        try {
          decodeURIComponent(req.query.name)
        } catch(err) {
          return res.redirect(`${redirectlink}?err=COULDNOTDECODENAME`);
        }

        let packagename = await db.get("package-" + req.session.userinfo.id);
        let package = newsettings.api.client.packages.list[packagename ? packagename : newsettings.api.client.packages.default];

        let extra = 
        await db.get("extra-" + req.session.userinfo.id) ||
          {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0
          };
          let j4r =
          await db.get("j4r-" + req.session.userinfo.id) ?
            await db.get("j4r-" + req.session.userinfo.id) :
            {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0
            };

        let ram2 = 0;
        let disk2 = 0;
        let cpu2 = 0;
        let servers2 = req.session.pterodactyl.relationships.servers.data.length;
        for (let i = 0, len = req.session.pterodactyl.relationships.servers.data.length; i < len; i++) {
          ram2 = ram2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.memory;
          disk2 = disk2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.disk;
          cpu2 = cpu2 + req.session.pterodactyl.relationships.servers.data[i].attributes.limits.cpu;
        };

        if (servers2 >= package.servers + extra.servers + j4r.servers) return res.redirect(`${redirectlink}?err=TOOMUCHSERVERS`);

        let name = decodeURIComponent(req.query.name);
        if (name.length < 1) return res.redirect(`${redirectlink}?err=LITTLESERVERNAME`);
        if (name.length > 191) return res.redirect(`${redirectlink}?err=BIGSERVERNAME`);
  
        let location = req.query.location;

        if (Object.entries(newsettings.api.client.locations).filter(vname => vname[0] == location).length !== 1) return res.redirect(`${redirectlink}?err=INVALIDLOCATION`);

        let requiredpackage = Object.entries(newsettings.api.client.locations).filter(vname => vname[0] == location)[0][1].package;
        if (requiredpackage) if (!requiredpackage.includes(packagename ? packagename : newsettings.api.client.packages.default)) return res.redirect(`${redirectlink}?err=PREMIUMLOCATION`);


        let egg = req.query.egg;
  
        let egginfo = newsettings.api.client.eggs[egg];
        if (!newsettings.api.client.eggs[egg]) return res.redirect(`${redirectlink}?err=INVALIDEGG`);
        let ram = parseFloat(req.query.ram);
        let disk = parseFloat(req.query.disk);
        let cpu = parseFloat(req.query.cpu);
        if (!isNaN(ram) && !isNaN(disk) && !isNaN(cpu)) {
          if (ram2 + ram > package.ram + extra.ram + j4r.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDRAM&num=${package.ram + extra.ram + j4r.ram - ram2}`);
        if (disk2 + disk > package.disk + extra.disk + j4r.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDDISK&num=${package.disk + extra.disk + j4r.disk - disk2}`);
        if (cpu2 + cpu > package.cpu + extra.cpu + j4r.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDCPU&num=${package.cpu + extra.cpu + j4r.cpu - cpu2}`);
          if (egginfo.minimum.ram) if (ram < egginfo.minimum.ram) return res.redirect(`${redirectlink}?err=TOOLITTLERAM&num=${egginfo.minimum.ram}`);
          if (egginfo.minimum.disk) if (disk < egginfo.minimum.disk) return res.redirect(`${redirectlink}?err=TOOLITTLEDISK&num=${egginfo.minimum.disk}`);
          if (egginfo.minimum.cpu) if (cpu < egginfo.minimum.cpu) return res.redirect(`${redirectlink}?err=TOOLITTLECPU&num=${egginfo.minimum.cpu}`);
          if (egginfo.maximum) {
            if (egginfo.maximum.ram) if (ram > egginfo.maximum.ram) return res.redirect(`${redirectlink}?err=TOOMUCHRAM&num=${egginfo.maximum.ram}`);
            if (egginfo.maximum.disk) if (disk > egginfo.maximum.disk) return res.redirect(`${redirectlink}?err=TOOMUCHDISK&num=${egginfo.maximum.disk}`);
            if (egginfo.maximum.cpu) if (cpu > egginfo.maximum.cpu) return res.redirect(`${redirectlink}?err=TOOMUCHCPU&num=${egginfo.maximum.cpu}`);
          }
  
          let specs = egginfo.info;
          specs["user"] = (await db.get("users-" + req.session.userinfo.id));
          if (!specs["limits"]) specs["limits"] = {
            swap: 0,
            io: 500,
            backups: 0
          };
          specs.name = name;
          specs.limits.memory = ram;
          specs.limits.disk = disk;
          specs.limits.cpu = cpu;
          if (!specs["deploy"]) specs.deploy = {
            locations: [],
            dedicated_ip: false,
            port_range: []
          }
          specs.deploy.locations = [location];
  
          let serverinfo = await fetch(
            settings.pterodactyl.domain + "/api/application/servers",
            {
              method: "post",
              headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}`, "Accept": "application/json" },
              body: JSON.stringify(await specs)
            }
          );
          if (await serverinfo.statusText !== "Created") {
            console.log(await serverinfo.text());
            return res.redirect(`${redirectlink}?err=ERRORONCREATE`);
          }
          let serverinfotext = JSON.parse(await serverinfo.text());
          let newpterodactylinfo = req.session.pterodactyl;
          newpterodactylinfo.relationships.servers.data.push(serverinfotext);
          req.session.pterodactyl = newpterodactylinfo;
          if (settings.api.client.allow.renewsuspendsystem.enabled == true) {
            renew.set(serverinfotext.attributes.id);
          }

          return res.redirect(theme.settings.redirect.createserver || "/");
        } else {
          res.redirect(`${redirectlink}?err=NOTANUMBER`);
        }
      } else {
        res.redirect(`${redirectlink}?err=MISSINGVARIABLE`);
      }
    } else {
      res.redirect(theme.settings.redirect.createserverdisabled || "/");
    }
  });

  app.get("/modify", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.modify == true) {
      if (!req.query.id) return res.send("Missing server id.");

      let redirectlink = theme.settings.redirect.failedmodifyserver || "/"; // fail redirect link
  
      let checkexist = req.session.pterodactyl.relationships.servers.data.filter(name => name.attributes.id == req.query.id);
      if (checkexist.length !== 1) return res.send("Invalid server id.");
  
      let ram = req.query.ram ? (isNaN(parseFloat(req.query.ram)) ? undefined : parseFloat(req.query.ram)) : undefined;
      let disk = req.query.disk ? (isNaN(parseFloat(req.query.disk)) ? undefined : parseFloat(req.query.disk)) : undefined;
      let cpu = req.query.cpu ? (isNaN(parseFloat(req.query.cpu)) ? undefined : parseFloat(req.query.cpu)) : undefined;
  
      if (ram || disk || cpu) {
        let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
  
        let packagename = await db.get("package-" + req.session.userinfo.id);
        let package = newsettings.api.client.packages.list[packagename ? packagename : newsettings.api.client.packages.default];
  
        let pterorelationshipsserverdata = req.session.pterodactyl.relationships.servers.data.filter(name => name.attributes.id.toString() !== req.query.id);
  
        let ram2 = 0;
        let disk2 = 0;
        let cpu2 = 0;
        for (let i = 0, len = pterorelationshipsserverdata.length; i < len; i++) {
          ram2 = ram2 + pterorelationshipsserverdata[i].attributes.limits.memory;
          disk2 = disk2 + pterorelationshipsserverdata[i].attributes.limits.disk;
          cpu2 = cpu2 + pterorelationshipsserverdata[i].attributes.limits.cpu;
        }
        let attemptegg = null;
        //let attemptname = null;
        
        for (let [name, value] of Object.entries(newsettings.api.client.eggs)) {
          if (value.info.egg == checkexist[0].attributes.egg) {
            attemptegg = newsettings.api.client.eggs[name];
            //attemptname = name;
          };
        };
        let egginfo = attemptegg ? attemptegg : null;
  
        if (!egginfo) return res.redirect(`${redirectlink}?id=${req.query.id}&err=MISSINGEGG`);

        let extra = await db.get("extra-" + req.session.userinfo.id) ||
          {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0
          };
          let j4r = await db.get("j4r-" + req.session.userinfo.id) ||
            {
              ram: 0,
              disk: 0,
              cpu: 0,
              servers: 0
            };
  
            if (ram2 + ram > package.ram + extra.ram + j4r.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDRAM&num=${package.ram + extra.ram + j4r.ram - ram2}`);
            if (disk2 + disk > package.disk + extra.disk + j4r.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDDISK&num=${package.disk + extra.disk + j4r.disk - disk2}`);
            if (cpu2 + cpu > package.cpu + extra.cpu + j4r.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=EXCEEDCPU&num=${package.cpu + extra.cpu + j4r.cpu - cpu2}`);
        if (egginfo.minimum.ram) if (ram < egginfo.minimum.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLERAM&num=${egginfo.minimum.ram}`);
        if (egginfo.minimum.disk) if (disk < egginfo.minimum.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLEDISK&num=${egginfo.minimum.disk}`);
        if (egginfo.minimum.cpu) if (cpu < egginfo.minimum.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOLITTLECPU&num=${egginfo.minimum.cpu}`);
        if (egginfo.maximum) {
          if (egginfo.maximum.ram) if (ram > egginfo.maximum.ram) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHRAM&num=${egginfo.maximum.ram}`);
          if (egginfo.maximum.disk) if (disk > egginfo.maximum.disk) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHDISK&num=${egginfo.maximum.disk}`);
          if (egginfo.maximum.cpu) if (cpu > egginfo.maximum.cpu) return res.redirect(`${redirectlink}?id=${req.query.id}&err=TOOMUCHCPU&num=${egginfo.maximum.cpu}`);
        };
  
        let limits = {
          memory: ram ? ram : checkexist[0].attributes.limits.memory,
          disk: disk ? disk : checkexist[0].attributes.limits.disk,
          cpu: cpu ? cpu : checkexist[0].attributes.limits.cpu,
          swap: egginfo ? checkexist[0].attributes.limits.swap : 0,
          io: egginfo ? checkexist[0].attributes.limits.io : 500
        };
  
        let serverinfo = await fetch(
          settings.pterodactyl.domain + "/api/application/servers/" + req.query.id + "/build",
          {
            method: "patch",
            headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}`, "Accept": "application/json" },
            body: JSON.stringify({
              limits: limits,
              feature_limits: checkexist[0].attributes.feature_limits,
              allocation: checkexist[0].attributes.allocation
            })
          }
        );
        if (await serverinfo.statusText !== "OK") return res.redirect(`${redirectlink}?id=${req.query.id}&err=ERRORONMODIFY`);
        let text = JSON.parse(await serverinfo.text());
        pterorelationshipsserverdata.push(text);
        req.session.pterodactyl.relationships.servers.data = pterorelationshipsserverdata;
        let theme = indexjs.get(req);
        adminjs.suspend(req.session.userinfo.id);

        res.redirect(theme.settings.redirect.modifyserver || "/");
      } else {
        res.redirect(`${redirectlink}?id=${req.query.id}&err=MISSINGVARIABLE`);
      }
    } else {
      res.redirect(theme.settings.redirect.modifyserverdisabled || "/");
    }
  });

  app.get("/delete", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login")

    if (!req.query.id) return res.send("Missing id.");

    let theme = indexjs.get(req);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.allow.server.delete == true) {
      if (req.session.pterodactyl.relationships.servers.data.filter(server => server.attributes.id == req.query.id).length == 0) return res.send("Could not find server with that ID.");

      let deletionresults = await fetch(
        settings.pterodactyl.domain + "/api/application/servers/" + req.query.id,
        {
          method: "delete",
          headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${settings.pterodactyl.key}`
          }
        }
      );
      let ok = await deletionresults.ok;
      if (ok !== true) return res.send("An error has occur while attempting to delete the server.");
      let pterodactylinfo = req.session.pterodactyl;
      pterodactylinfo.relationships.servers.data = pterodactylinfo.relationships.servers.data.filter(server => server.attributes.id.toString() !== req.query.id);
      req.session.pterodactyl = pterodactylinfo;

      if (settings.api.client.allow.renewsuspendsystem.enabled == true) {
        renew.delete(req.query.id);
      }

      adminjs.suspend(req.session.userinfo.id);

      res.redirect(theme.settings.redirect.deleteserver || "/");

  
    } else {
      res.redirect(theme.settings.redirect.deleteserverdisabled || "/");
    }
  });
};
function hexToDecimal(hex) {
  return parseInt(hex.replace("#",""), 16)
}