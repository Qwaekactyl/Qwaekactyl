"use strict";

const fs = require("fs");
const fetch = require('node-fetch');
const chalk = require("chalk");
const arciotext = (require("./api/arcio.js")).text;
const rateLimit = require('express-rate-limit');
const bodyParser = require("body-parser")

console.log(chalk.green("[Qwaekactyl] Starting Qwaekactyl"));
console.log(chalk.green("[Qwaekactyl] Files loading..."));


const settings = require("./settings");
console.log(chalk.green("[Qwaekactyl] Settings loading..."));

const defaultthemesettings = {
  index: "index.ejs",
  notfound: "index.ejs",
  redirect: {},
  pages: {},
  mustbeloggedin: [],
  mustbeadmin: [],
  variables: {}
};

console.log(chalk.green("[Qwaekactyl] Settings loaded..."));

module.exports.renderdataeval =
  `(async () => {
    let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
    const JavaScriptObfuscator = require('javascript-obfuscator');
    let renderdata = {
      req: req,
      settings: newsettings,
      userinfo: req.session.userinfo,
      packagename: req.session.userinfo ? await db.get("package-" + req.session.userinfo.id) ? await db.get("package-" + req.session.userinfo.id) : newsettings.api.client.packages.default : null,
      extraresources: !req.session.userinfo ? null : (await db.get("extra-" + req.session.userinfo.id) ? await db.get("extra-" + req.session.userinfo.id) : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      }),
      j4r: !req.session.userinfo ? null : (await db.get("j4r-" + req.session.userinfo.id) ? await db.get("j4r-" + req.session.userinfo.id) : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      }),
      packages: req.session.userinfo ? newsettings.api.client.packages.list[await db.get("package-" + req.session.userinfo.id) ? await db.get("package-" + req.session.userinfo.id) : newsettings.api.client.packages.default] : null,
      coins: newsettings.api.client.coins.enabled == true ? (req.session.userinfo ? (await db.get("coins-" + req.session.userinfo.id) ? await db.get("coins-" + req.session.userinfo.id) : 0) : 0) : 0,
      pterodactyl: req.session.pterodactyl,
      theme: theme.name,
      extra: theme.settings.variables,
      referid: req.session.userinfo ? await db.get("referiduser-" + req.session.userinfo.id) : null
    };
    if (newsettings.api.arcio.enabled == true && req.session.arcsessiontoken) {
      renderdata.arcioafktext = JavaScriptObfuscator.obfuscate(\`
        let token = "\${req.session.arcsessiontoken}";
        let everywhat = \${newsettings.api.arcio["afk page"].every};
        let gaincoins = \${newsettings.api.arcio["afk page"].coins};
        let arciopath = "\${newsettings.api.arcio["afk page"].path.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, "\\\\\\"")}";
        \${arciotext}
      \`);
    };
    return renderdata;
  })();`;


const db = require("./db.js");

console.log(chalk.green("[Qwaekactyl] Database loading..."))

module.exports.db = db;
console.log(chalk.green("[Qwaekactyl] Database loaded..."))

const session = require("express-session");
console.log(chalk.green("[Qwaekactyl] session loading..."))
console.log(chalk.green("[Qwaekactyl] session DB loading..."))
const sqlite = require("better-sqlite3");

const SqliteStore = require("better-sqlite3-session-store")(session);
const session_db = new sqlite("sessions.db");
console.log(chalk.green("[Qwaekactyl] session loaded..."))
console.log(chalk.green("[Qwaekactyl] session DB loaded..."))

const express = require("express");
console.log(chalk.green("[Qwaekactyl] express loading..."))
const app = express();
console.log(chalk.green("[Qwaekactyl] express loaded..."))


app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())

app.set('trust proxy', true);

const expressWs = require('express-ws')(app);
console.log(chalk.green("[Qwaekactyl] Express addons loading..."))

const ejs = require("ejs");

const indexjs = require("./index.js");
console.log(chalk.green("[Qwaekactyl] Express addons loaded..."))




module.exports.app = app;
console.log(chalk.green("[Qwaekactyl] Website loading..."))


app.use(session({
  secret: 'qwaekactyl-kartik-2023',
  resave: true,
  saveUninitialized: true,
  store: new SqliteStore({
    client: session_db, 
    expired: {
      clear: true,
      intervalMs: 900000
    }
  })
}));






  
app.listen(settings.website.port, function() {
console.log(chalk.green("[Qwaekactyl]") + chalk.white(" Qwaekactyl CP Started "));
console.log(chalk.green("[Qwaekactyl]") + chalk.white(" Any Issue?? our contact support here :- https://discord.gg/QNR2Mq3fFf" ));
 });


let ipratelimit = {};

var cache = 0;

setInterval(
  async function() {
    if (cache - .1 < 0) return cache = 0;
    cache = cache - .1;
  }, 100
)

app.use(async (req, res, next) => {
  if (req.session.userinfo && req.session.userinfo.id && !(await db.get("users-" + req.session.userinfo.id))) {
    let theme = indexjs.get(req);

    req.session.destroy(() => {
      return res.redirect(theme.settings.redirect.logout || "/");
    });

    return;
  }

  let manager = {
    "/callback": 2,
    "/create": 1,
    "/delete": 1,
    "/modify": 1,
    "/updateinfo": 1,
    "/setplan": 2,
    "/admin": 1,
    "/regen": 1,
    "/renew": 1,
    "/api/userinfo": 1,
    "/userinfo": 2,
    "/remove_account": 1,
    "/create_coupon": 1,
    "/revoke_coupon": 1,
    "/getip": 1
  };
  if (manager[req._parsedUrl.pathname]) {
    if (cache > 0) {
      setTimeout(async () => {
        let allqueries = Object.entries(req.query);
        let querystring = "";
        for (let query of allqueries) {
          querystring = querystring + "&" + query[0] + "=" + query[1];
        }
        querystring = "?" + querystring.slice(1);
        if (querystring == "?") querystring = "";
        res.redirect((req._parsedUrl.pathname.slice(0, 1) == "/" ? req._parsedUrl.pathname : "/" + req._parsedUrl.pathname) + querystring);
      }, 1000);
      return;
    } else {
      let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());

      if (newsettings.api.client.ratelimits.enabled == true) {

        let ip = (newsettings.api.client.ratelimits["trust x-forwarded-for"] == true ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : req.connection.remoteAddress);
        ip = (ip ? ip : "::1").replace(/::1/g, "::ffff:127.0.0.1").replace(/^.*:/, '');
      
        if (ipratelimit[ip] && ipratelimit[ip] >= newsettings.api.client.ratelimits.requests) {

          res.send(`<html><head><title>You are being rate limited.</title></head><body>You have exceeded rate limits.</body></html>`);
          return;
        }
      
        ipratelimit[ip] = (ipratelimit[ip] ? ipratelimit[ip] : 0) + 1;
      
        setTimeout(
          async function() {
            ipratelimit[ip] = ipratelimit[ip] - 1;
            if (ipratelimit[ip] <= 0) ipratelimit[ip] = 0;
          }, newsettings.api.client.ratelimits["per second"] * 1000
        );
  
      };

      cache = cache + manager[req._parsedUrl.pathname];
    }
  };
  next();
});

function loadApiFiles(directory, app, db) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const filePath = `${directory}/${file}`;
    if (fs.statSync(filePath).isDirectory()) {
      loadApiFiles(filePath, app, db);
    } else if (file.endsWith('.js')) {
      const apiFile = require(`./${filePath}`);
      apiFile.load(app, db);
    }
  }
}

loadApiFiles('./api', app, db);

app.all("*", async (req, res) => {
  if (req.session.pterodactyl) if (req.session.pterodactyl.id !== await db.get("users-" + req.session.userinfo.id)) return res.redirect("/");
  let theme = indexjs.get(req);

  let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
  if (newsettings.api.arcio.enabled == true) if (theme.settings.generateafktoken.includes(req._parsedUrl.pathname)) req.session.arcsessiontoken = Math.random().toString(36).substring(2, 15);
  
  if (theme.settings.mustbeloggedin.includes(req._parsedUrl.pathname)) if (!req.session.userinfo || !req.session.pterodactyl) return res.redirect("/");
  if (theme.settings.mustbeadmin.includes(req._parsedUrl.pathname)) {
    ejs.renderFile(
      `./themes/${theme.name}/${theme.settings.notfound}`, 
      await eval(indexjs.renderdataeval),
      null,
    async function (err, str) {
      delete req.session.newaccount;
      delete req.session.password;
      if (!req.session.userinfo || !req.session.pterodactyl) {
        if (err) {
          console.log(chalk.red(`[Qwaekactyl] An error has occured on path ${req._parsedUrl.pathname}:`));
          console.log(err);
          return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
        };
        res.status(404);
        return res.send(str);
      };

      let cacheaccount = await fetch(
        settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + req.session.userinfo.id)) + "?include=servers",
        {
          method: "get",
          headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
        }
      );
      if (await cacheaccount.statusText == "Not Found") {
        if (err) {
          console.log(chalk.red(`[Qwaekactyl] An error has occured on path ${req._parsedUrl.pathname}:`));
          console.log(err);
          return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
        };
        return res.send(str);
      };
      let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    
      req.session.pterodactyl = cacheaccountinfo.attributes;
      if (cacheaccountinfo.attributes.root_admin !== true) {
        if (err) {
          console.log(chalk.red(`[Qwaekactyl] An error has occured on path ${req._parsedUrl.pathname}:`));
          console.log(err);
          return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
        };
        return res.send(str);
      };

      ejs.renderFile(
        `./themes/${theme.name}/${theme.settings.pages[req._parsedUrl.pathname.slice(1)] ? theme.settings.pages[req._parsedUrl.pathname.slice(1)] : theme.settings.notfound}`, 
        await eval(indexjs.renderdataeval),
        null,
      function (err, str) {
        delete req.session.newaccount;
        delete req.session.password;
        if (err) {
          console.log(`[Qwaekactyl] An error has occured on path ${req._parsedUrl.pathname}:`);
          console.log(err);
          return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
        };
        res.status(404);
        res.send(str);
      });
    });
    return;
  };
  ejs.renderFile(
    `./themes/${theme.name}/${theme.settings.pages[req._parsedUrl.pathname.slice(1)] ? theme.settings.pages[req._parsedUrl.pathname.slice(1)] : theme.settings.notfound}`, 
    await eval(indexjs.renderdataeval),
    null,
  function (err, str) {
    delete req.session.newaccount;
    delete req.session.password;
    if (err) {
      console.log(chalk.red(`[Qwaekactyl] An error has occured on path ${req._parsedUrl.pathname}:`));
      console.log(err);
      return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
    };
    res.status(404);
    res.send(str);
  });
});

module.exports.get = function(req) {
  let defaulttheme = JSON.parse(fs.readFileSync("./settings.json")).defaulttheme;
  let tname = encodeURIComponent(getCookie(req, "theme"));
  let name = (
    tname ?
      fs.existsSync(`./themes/${tname}`) ?
        tname
      : defaulttheme
    : defaulttheme
  )
  return {
    settings: (
      fs.existsSync(`./themes/${name}/pages.json`) ?
        JSON.parse(fs.readFileSync(`./themes/${name}/pages.json`).toString())
      : defaultthemesettings
    ),
    name: name
  };
};

module.exports.islimited = async function() {
  return cache <= 0 ? true : false;
}

module.exports.ratelimits = async function(length) {
  cache = cache + length
}


function getCookie(req, cname) {
  let cookies = req.headers.cookie;
  if (!cookies) return null;
  let name = cname + "=";
  let ca = cookies.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return decodeURIComponent(c.substring(name.length, c.length));
    }
  }
  return "";
}
try {
  // code that might throw an error
} catch (error) {
  // code to handle the error
  console.error(error);
}

