"use strict";

const settings = require("../settings.json");

if (settings.api.client.oauth2.link.slice(-1) == "/")
  settings.api.client.oauth2.link = settings.api.client.oauth2.link.slice(0, -1);

if (settings.api.client.oauth2.callbackpath.slice(0, 1) !== "/")
  settings.api.client.oauth2.callbackpath = "/" + settings.api.client.oauth2.callbackpath;

if (settings.pterodactyl.domain.slice(-1) == "/")
  settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);

const fetch = require('node-fetch');

const indexjs = require("../index.js");
const arciotext = (require("./arcio.js")).text;

const fs = require("fs");

module.exports.load = async function(app, db) {
  app.get("/login", async (req, res) => {
    if (req.query.redirect) req.session.redirect = "/" + req.query.redirect;
    let newsettings = JSON.parse(fs.readFileSync("./settings.json"));
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${settings.api.client.oauth2.id}&redirect_uri=${encodeURIComponent(settings.api.client.oauth2.link + settings.api.client.oauth2.callbackpath)}&response_type=code&scope=identify%20email${newsettings.api.client.bot.joinguild.enabled == true ? "%20guilds.join" : ""}${newsettings.api.client.j4r.enabled == true ? "%20guilds" : ""}${settings.api.client.oauth2.prompt == false ? "&prompt=none" : (req.query.prompt ? (req.query.prompt == "none" ? "&prompt=none" : "") : "")}`);
  });

  app.get("/logout", (req, res) => {
    let theme = indexjs.get(req);
    req.session.destroy(() => {
      return res.redirect(theme.settings.redirect.logout || "/");
    });
  });

  app.get(settings.api.client.oauth2.callbackpath, async (req, res) => {
    let theme = indexjs.get(req);
    let customredirect = req.session.redirect;
    delete req.session.redirect;
    let failedcallback = theme.settings.redirect.failedcallback || "/";
    if (!req.query.code) return res.redirect(failedcallback + "?err=MISSINGCODE");
    let json = await fetch(
      'https://discord.com/api/oauth2/token',
      {
        method: "post",
        body: "client_id=" + settings.api.client.oauth2.id + "&client_secret=" + settings.api.client.oauth2.secret + "&grant_type=authorization_code&code=" + encodeURIComponent(req.query.code) + "&redirect_uri=" + encodeURIComponent(settings.api.client.oauth2.link + settings.api.client.oauth2.callbackpath),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    if (json.ok == true) {
      let codeinfo = JSON.parse(await json.text());
      let scopes = codeinfo.scope;
      let missingscopes = [];
      let newsettings = JSON.parse(fs.readFileSync("./settings.json"));

      if (scopes.replace(/identify/g, "") == scopes) missingscopes.push("identify");
      if (scopes.replace(/email/g, "") == scopes) missingscopes.push("email");
      if (newsettings.api.client.bot.joinguild.enabled == true) if (scopes.replace(/guilds.join/g, "") == scopes) missingscopes.push("guilds.join");
      if (missingscopes.length !== 0) return res.redirect(failedcallback + "?err=MISSINGSCOPES&scopes=" + missingscopes.join("%20"));
      let userjson = await fetch(
        'https://discord.com/api/users/@me',
        {
          method: "get",
          headers: {
            "Authorization": `Bearer ${codeinfo.access_token}`
          }
        }
      );
      let userinfo = JSON.parse(await userjson.text());
      let guildsjson = await fetch(
        'https://discord.com/api/users/@me/guilds',
        {
          method: "get",
          headers: {
            "Authorization": `Bearer ${codeinfo.access_token}`
          }
        }
      );
      let guildsinfo = JSON.parse(await guildsjson.text());
      if (userinfo.verified == true) {
        
        let ip = (newsettings.api.client.oauth2.ip["trust x-forwarded-for"] == true ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : req.connection.remoteAddress);
        ip = (ip ? ip : "::1").replace(/::1/g, "::ffff:127.0.0.1").replace(/^.*:/, '');
        
        if (newsettings.api.client.oauth2.ip.block.includes(ip)) return res.redirect(failedcallback + "?err=IPBLOCKED")

        if (newsettings.api.client.oauth2.ip["duplicate check"] == true) {
          let allips = await db.get("ips") || [];
          let mainip = await db.get("ip-" + userinfo.id);
          if (mainip) {
            if (mainip !== ip) {
              allips = allips.filter(ip2 => ip2 !== mainip);
              if (allips.includes(ip)) {
                return res.redirect(failedcallback + "?err=ANTIALT")
              }
              allips.push(ip);
              await db.set("ips", allips);
              await db.set("ip-" + userinfo.id, ip);
            }
          } else {
            if (allips.includes(ip)) {
              return res.redirect(failedcallback + "?err=ANTIALT")
            }
            allips.push(ip);
            await db.set("ips", allips);
            await db.set("ip-" + userinfo.id, ip);
          }
        }

        if (newsettings.api.client.oauth2.ip["cookie alt check"]) {
          let accountid = getCookie(req, "accountid");

          if (accountid) {
            if (accountid !== userinfo.id) {
              return res.redirect(failedcallback + "?err=ANTIALT");
            }
          }

          res.cookie('accountid', userinfo.id);
        }
        let j4r = newsettings.api.client.j4r.every;
        let newj4r = {
                "cpu": 0,
                "ram": 0,
                "disk": 0,
                "servers": 0
            }
        if (newsettings.api.client.j4r.enabled == true) {
            if (guildsinfo.message == '401: Unauthorized') return res.send("Please allow us to know what servers you are in to let the J4R system work properly.")
        	await guildsinfo.forEach(async (guild) => {
                if (newsettings.api.client.j4r.servers.indexOf(guild.id) >= 0) {
                    newj4r.cpu = newj4r.cpu + j4r.cpu
                    newj4r.ram = newj4r.ram + j4r.ram
                    newj4r.disk = newj4r.disk + j4r.disk
                    newj4r.servers = newj4r.servers + j4r.servers
                }
        	})
            db.set("j4r-" + userinfo.id, newj4r)
        }

        if (newsettings.api.client.bot.joinguild.enabled == true) {
          if (typeof newsettings.api.client.bot.joinguild.guildid == "string") {
            await fetch(
              `https://discord.com/api/guilds/${newsettings.api.client.bot.joinguild.guildid}/members/${userinfo.id}`,
              {
                method: "put",
                headers: {
                  'Content-Type': 'application/json',
                  "Authorization": `Bot ${newsettings.api.client.bot.token}`
                },
                body: JSON.stringify({
                  access_token: codeinfo.access_token
                })
              }
            );
            let checkmemberexist = await fetch(
              `https://discord.com/api/guilds/${guild}/members/${userinfo.id}`,
              {
                method: "get",
                headers: {
                  'Content-Type': 'application/json',
                  "Authorization": `Bot ${newsettings.api.client.bot.token}`
                }
              }
            );
            let checkmemberexistjson = checkmemberexist.json();
            if (checkmemberexistjson.message && checkmemberexistjson.message === "Unknown Member" && settings.api.client.bot.joinguild.forcejoin) return res.redirect(failedcallback + "?err=DISCORD");

            if (newsettings.api.client.bot.joinguild.registeredrole) {
              await fetch(
                `https://discord.com/api/guilds/${guild}/members/${userinfo.id}/roles/${newsettings.api.client.bot.joinguild.registeredrole}`,
                {
                  method: "put",
                  headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bot ${newsettings.api.client.bot.token}`
                  }
                }
              );
            }
          } else if (typeof newsettings.api.client.bot.joinguild.guildid == "object") {
            if (Array.isArray(newsettings.api.client.bot.joinguild.guildid)) {
              for (let guild of newsettings.api.client.bot.joinguild.guildid) {
                await fetch(
                  `https://discord.com/api/guilds/${guild}/members/${userinfo.id}`,
                  {
                    method: "put",
                    headers: {
                      'Content-Type': 'application/json',
                      "Authorization": `Bot ${newsettings.api.client.bot.token}`
                    },
                    body: JSON.stringify({
                      access_token: codeinfo.access_token
                    })
                  }
                );

                let checkmemberexist = await fetch(
                  `https://discord.com/api/guilds/${guild}/members/${userinfo.id}`,
                  {
                    method: "get",
                    headers: {
                      'Content-Type': 'application/json',
                      "Authorization": `Bot ${newsettings.api.client.bot.token}`
                    }
                  }
                );
                let checkmemberexistjson = checkmemberexist.json();
                if (checkmemberexistjson.message && checkmemberexistjson.message === "Unknown Member" && settings.api.client.bot.joinguild.forcejoin) return res.redirect(failedcallback + "?err=DISCORD");

                if (newsettings.api.client.bot.joinguild.registeredrole) {
                  await fetch(
                    `https://discord.com/api/guilds/${guild}/members/${userinfo.id}/roles/${newsettings.api.client.bot.joinguild.registeredrole}`,
                    {
                      method: "put",
                      headers: {
                        'Content-Type': 'application/json',
                        "Authorization": `Bot ${newsettings.api.client.bot.token}`
                      }
                    }
                  );
                }
              }
            } else {
              return res.send("Tell an administrator there is an error settings.json: api.client.bot.joinguild.guildid is not an array nor a string.");
            }
          } else {
            return res.send("Tell an administrator there is an error settings.json: api.client.bot.joinguild.guildid is not an array nor a string.");
          }
        }
        if (!await db.get("users-" + userinfo.id)) {
          if (newsettings.api.client.allow.newusers == true) {
            let genpassword = null;
            if (newsettings.api.client.passwordgenerator.signup == true) genpassword = makeid(newsettings.api.client.passwordgenerator["length"]);
            let accountjson = await fetch(
              settings.pterodactyl.domain + "/api/application/users",
              {
                method: "post",
                headers: {
                  'Content-Type': 'application/json',
                  "Authorization": `Bearer ${settings.pterodactyl.key}`
                },
                body: JSON.stringify({
                  username: userinfo.id,
                  email: userinfo.email,
                  first_name: userinfo.username,
                  last_name: "#" + userinfo.discriminator,
                  password: genpassword
                })
              }
            );
            if (await accountjson.status == 201) {
              let accountinfo = JSON.parse(await accountjson.text());
              let userids = await db.get("users") || [];
              userids.push(accountinfo.attributes.id);
              await db.set("users", userids);
              await db.set("users-" + userinfo.id, accountinfo.attributes.id);
              req.session.newaccount = true;
              req.session.password = genpassword;
            } else {
              let accountlistjson = await fetch(
                settings.pterodactyl.domain + "/api/application/users?include=servers&filter[email]=" + encodeURIComponent(userinfo.email),
                {
                  method: "get",
                  headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${settings.pterodactyl.key}`
                  }
                }
              );
              let accountlist = await accountlistjson.json();
              let user = accountlist.data.filter(acc => acc.attributes.email.toLowerCase() == userinfo.email.toLowerCase());
              if (user.length == 1) {
                let userid = user[0].attributes.id;
                let userids = await db.get("users") || [];
                if (userids.filter(id => id == userid).length == 0) {
                  userids.push(userid);
                  await db.set("users", userids);
                  await db.set("users-" + userinfo.id, userid);
                  req.session.pterodactyl = user[0].attributes;
                } else {
                  return res.redirect(failedcallback + "?err=ANOTHERACCOUNT");
                }
              } else {
                return res.redirect(failedcallback + "?err=UNKNOWN");
              };
            };
          } else {
            return res.redirect(failedcallback + "?err=DISABLED")
          }
        };

        let cacheaccount = await fetch(
          settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + userinfo.id)) + "?include=servers",
          {
            method: "get",
            headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
          }
        );
        if (await cacheaccount.statusText == "Not Found") return res.redirect(failedcallback + "?err=CANNOTGETINFO");
        let cacheaccountinfo = JSON.parse(await cacheaccount.text());
        req.session.pterodactyl = cacheaccountinfo.attributes;

        req.session.userinfo = userinfo;
        
        if(newsettings.api.client.webhook.auditlogs.enabled && !newsettings.api.client.webhook.auditlogs.disabled.includes("LOGIN")) {
          let params = JSON.stringify({
              embeds: [
                  {
                      title: "Login",
                      description: `**__User:__** ${req.session.userinfo.username}#${req.session.userinfo.discriminator} (${req.session.userinfo.id}) \n**IP:** ${newsettings.api.client.oauth2.ip["duplicate check"] == true ? await db.get("ip-" + req.session.userinfo.id) : "IP Checking is off"}`,
                      color: hexToDecimal("#ffff00")
                  }
              ]
          })
          fetch(`${newsettings.api.client.webhook.webhook_url}`, {
              method: "POST",
              headers: {
                  'Content-type': 'application/json',
              },
              body: params
          }).catch(e => console.warn(chalk.red("[WEBSITE] There was an error sending to the webhook: " + e)));
        }
        if (customredirect) return res.redirect(customredirect);
        return res.redirect(theme.settings.redirect.callback || "/");
      };
      res.redirect(failedcallback + "?err=UNVERIFIED");
    } else {
      res.redirect(failedcallback + "?err=INVALIDCODE");
    };
  });
};

function makeid(length) {
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function hexToDecimal(hex) {
  return parseInt(hex.replace("#",""), 16)
}

// Get a cookie.
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
