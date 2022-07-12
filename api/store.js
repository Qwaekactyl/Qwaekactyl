const indexjs = require("../index.js");
const arciotext = (require("./arcio.js")).text;
const adminjs = require("./admin.js");
const fs = require("fs");
const ejs = require("ejs");

module.exports.load = async function(app, db) {
  app.get("/buyram", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let newsettings = await enabledCheck(req, res);
    if (newsettings) {
      let amount = req.query.amount;

      if (!amount) return res.send("missing amount");

      amount = parseFloat(amount);

      if (isNaN(amount)) return res.send("amount is not a number");

      if (amount < 1 || amount > 10) return res.send("amount must be 1-10");
      
      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedpurchaseram || "/";

      let usercoins = await db.get("coins-" + req.session.userinfo.id) || 0;

      let per = newsettings.api.client.coins.store.ram.per * amount;
      let cost = newsettings.api.client.coins.store.ram.cost * amount;

      if (usercoins < cost) return res.redirect(failedcallback + "?err=CANNOTAFFORD");

      let newusercoins = usercoins - cost;

      let extra = await db.get("extra-" + req.session.userinfo.id) || {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      };

      extra.ram = extra.ram + per;

      if (extra.ram > 999999999999999) return res.redirect(failedcallback + "?err=MAXIMUMRAM");

      if (newusercoins == 0) {
        await db.delete("coins-" + req.session.userinfo.id);
      } else {
        await db.set("coins-" + req.session.userinfo.id, newusercoins);
      }

      if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0) {
        await db.delete("extra-" + req.session.userinfo.id);
      } else {
        await db.set("extra-" + req.session.userinfo.id, extra);
      }

      adminjs.suspend(req.session.userinfo.id);

      res.redirect((theme.settings.redirect.purchaseram || "/") + "?err=none");
    }
  });

  app.get("/buydisk", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let newsettings = await enabledCheck(req, res);
    if (newsettings) {
      let amount = req.query.amount;

      if (!amount) return res.send("missing amount");

      amount = parseFloat(amount);

      if (isNaN(amount)) return res.send("amount is not a number");

      if (amount < 1 || amount > 10) return res.send("amount must be 1-10");
      
      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedpurchasedisk || "/";

      let usercoins = await db.get("coins-" + req.session.userinfo.id) || 0;

      let per = newsettings.api.client.coins.store.disk.per * amount;
      let cost = newsettings.api.client.coins.store.disk.cost * amount;

      if (usercoins < cost) return res.redirect(failedcallback + "?err=CANNOTAFFORD");

      let newusercoins = usercoins - cost;

      let extra = await db.get("extra-" + req.session.userinfo.id) || {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      };

      extra.disk = extra.disk + per;

      if (extra.disk > 999999999999999) return res.redirect(failedcallback + "?err=MAXIMUMDISK");

      if (newusercoins == 0) {
        await db.delete("coins-" + req.session.userinfo.id);
      } else {
        await db.set("coins-" + req.session.userinfo.id, newusercoins);
      }

      if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0) {
        await db.delete("extra-" + req.session.userinfo.id);
      } else {
        await db.set("extra-" + req.session.userinfo.id, extra);
      }

      adminjs.suspend(req.session.userinfo.id);

      res.redirect((theme.settings.redirect.purchasedisk || "/") + "?err=none");
    }
  });

  app.get("/buycpu", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let newsettings = await enabledCheck(req, res);
    if (newsettings) {
      let amount = req.query.amount;

      if (!amount) return res.send("missing amount");

      amount = parseFloat(amount);

      if (isNaN(amount)) return res.send("amount is not a number");

      if (amount < 1 || amount > 10) return res.send("amount must be 1-10");
      
      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedpurchasecpu || "/";

      let usercoins = await db.get("coins-" + req.session.userinfo.id) || 0;

      let per = newsettings.api.client.coins.store.cpu.per * amount;
      let cost = newsettings.api.client.coins.store.cpu.cost * amount;

      if (usercoins < cost) return res.redirect(failedcallback + "?err=CANNOTAFFORD");

      let newusercoins = usercoins - cost;

      let extra = await db.get("extra-" + req.session.userinfo.id) || {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      };

      extra.cpu = extra.cpu + per;

      if (extra.cpu > 999999999999999) return res.redirect(failedcallback + "?err=MAXIMUMCPU");

      if (newusercoins == 0) {
        await db.delete("coins-" + req.session.userinfo.id);
      } else {
        await db.set("coins-" + req.session.userinfo.id, newusercoins);
      }

      if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0) {
        await db.delete("extra-" + req.session.userinfo.id);
      } else {
        await db.set("extra-" + req.session.userinfo.id, extra);
      }

      adminjs.suspend(req.session.userinfo.id);

      res.redirect((theme.settings.redirect.purchasecpu || "/") + "?err=none");
    }
  });

  app.get("/buyservers", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");
    
    let newsettings = await enabledCheck(req, res);
    if (newsettings) {
      let amount = req.query.amount;

      if (!amount) return res.send("missing amount");

      amount = parseFloat(amount);

      if (isNaN(amount)) return res.send("amount is not a number");

      if (amount < 1 || amount > 10) return res.send("amount must be 1-10");
      
      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedpurchaseservers || "/";

      let usercoins = await db.get("coins-" + req.session.userinfo.id) || 0;

      let per = newsettings.api.client.coins.store.servers.per * amount;
      let cost = newsettings.api.client.coins.store.servers.cost * amount;

      if (usercoins < cost) return res.redirect(failedcallback + "?err=CANNOTAFFORD");

      let newusercoins = usercoins - cost;

      let extra = await db.get("extra-" + req.session.userinfo.id) || {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      };

      extra.servers = extra.servers + per;

      if (extra.servers > 999999999999999) return res.redirect(failedcallback + "?err=MAXIMUMSERVERS");

      if (newusercoins == 0) {
        await db.delete("coins-" + req.session.userinfo.id);
      } else {
        await db.set("coins-" + req.session.userinfo.id, newusercoins);
      }

      if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0) {
        await db.delete("extra-" + req.session.userinfo.id);
      } else {
        await db.set("extra-" + req.session.userinfo.id, extra);
      }

      adminjs.suspend(req.session.userinfo.id);

      res.redirect((theme.settings.redirect.purchaseservers || "/") + "?err=none");
    }
  });

  async function enabledCheck(req, res) {
    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.coins.store.enabled == true) return newsettings;
    let theme = indexjs.get(req);
    ejs.renderFile(
      `./themes/${theme.name}/${theme.settings.notfound}`, 
      await eval(indexjs.renderdataeval),
      null,
    function (err, str) {
      delete req.session.newaccount;
      if (err) {
        console.log(`[WEBSITE] An error has occured on path ${req._parsedUrl.pathname}:`);
        console.log(err);
        return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
      };
      res.status(404);
      res.send(str);
    });
    return null;
  }
}