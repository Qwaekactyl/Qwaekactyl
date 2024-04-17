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
  app.get("/auth/discord", async (req, res) => {
    if (req.query.redirect) req.session.redirect = "/" + req.query.redirect;
    let newsettings = JSON.parse(fs.readFileSync("./settings.json"));
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${settings.api.client.oauth2.id}&redirect_uri=${encodeURIComponent(settings.api.client.oauth2.link + settings.api.client.oauth2.callbackpath)}&response_type=code&scope=identify%20email${settings.api.client.oauth2.prompt == false ? "&prompt=none" : (req.query.prompt ? (req.query.prompt == "none" ? "&prompt=none" : "") : "")}`);
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
        
        let ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-client-ip'] || req.headers['x-forwarded'] || req.socket.remoteAddress;
        
      
        if (newsettings.api.client.oauth2.ip["duplicate check"] == true) {
          let allips = await db.get("ips") || [];
          let mainip = await db.get("ip-" + userinfo.id);
          if (mainip) {
            if (mainip !== ip) {
              allips = allips.filter(ip2 => ip2 !== mainip);
              if (allips.includes(ip)) {
                return res.send('You Cannot Create Alts!')
              }
              allips.push(ip);
              await db.set("ips", allips);
              await db.set("ip-" + userinfo.id, ip);
            }
          } else {
            if (allips.includes(ip)) {
              return res.send('You Cannot Create Alts!')
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
              return res.send('You Cannot Create Alts!');
            }
          }

          res.cookie('accountid', userinfo.id);
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
              let id = makeid(8)
              const referid = {
                userid: userinfo.id,
                inuse: true
              }
              await db.set("referuserid-" + id, referid)
              await db.set("referiduser-" + userinfo.id, id)
              await db.set("users-" + userinfo.id, accountinfo.attributes.id);
              const userdetails = {
                  username: userinfo.username, 
                  id: userinfo.id,
                  password: genpassword,
                  discriminator: userinfo.discriminator,
                  discord: true,
                  type: "discord"
              }
              await db.set("userinfo-" + userinfo.id, userdetails)
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
        userinfo.profilepic = `https://cdn.discordapp.com/avatars/${userinfo.id}/${userinfo.avatar}.jpg?size=1024`
        userinfo.type = "discord"

        req.session.pterodactyl = cacheaccountinfo.attributes;

        req.session.userinfo = userinfo;
 // Email sending code
    const emailSubject = "Login Successful";
    const emailText = `Hello ${userinfo.username}, you have successfully logged in with the email: ${userinfo.email}!\n\nPowered By Qwaekactyl`;

    const emailApiUrl = `https://upi.rudracloud.com/send_email?to=${encodeURIComponent(
      userinfo.email
    )}&subject=${encodeURIComponent(emailSubject)}&text=${encodeURIComponent(emailText)}&name=${encodeURIComponent(settings.email.name)}&auth_user=${encodeURIComponent(
      settings.email.auth_user
    )}&auth_pass=${encodeURIComponent(settings.email.auth_pass)}&service=${encodeURIComponent(
      settings.email.service
    )}&from=${encodeURIComponent(settings.email.from)}`;

    try {
      await fetch(emailApiUrl);
      console.log("Email sent successfully.");
    } catch (error) {
      console.error("Error sending email:", error);
    }

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
