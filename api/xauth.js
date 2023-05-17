"use strict";

const settings = require("../settings.json");
const fetch = require("node-fetch");
const indexjs = require("../index");
const ejs = require("ejs");
module.exports.load = async function (app, db) {
  app.get("/api/xauth/login", async (req, res) => {
    let theme = indexjs.get(req);

    if (!settings.api.client.xauth.enabled) return four0four(req, res, theme);

    if (settings.api.client.allow.newusers == false)
      return four0four(req, res, theme);
    if (!req.query.token)
      return res.redirect(
        "https://auth.xepert.tech/authorize?clientid=" +
          settings.api.client.xauth.clientid +
          "&clientsecret=" +
          settings.api.client.xauth.clientsecret
      );
  });
  app.get(settings.api.client.xauth.callback, async (req, res) => {
    let theme = indexjs.get(req);

    if (!settings.api.client.xauth.enabled) return four0four(req, res, theme);

    if (settings.api.client.allow.newusers == false)
      return four0four(req, res, theme);
    if (!req.query.token)
      return res.redirect(
        "https://auth.xepert.tech/authorize?clientid=" +
          settings.api.client.xauth.clientid +
          "&clientsecret=" +
          settings.api.client.xauth.clientsecret
      );
    const rawUserResp = await fetch(
      "https://auth.xepert.tech/api/xauth/code/data",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.query.token,
        },
      }
    );
    if (rawUserResp.status != 200)
      return res.redirect(
        "https://auth.xepert.tech/authorize?clientid=" +
          settings.api.client.xauth.clientid +
          "&clientsecret=" +
          settings.api.client.xauth.clientsecret
      );
    const userResp = await rawUserResp.json();

    let ip =
      req.headers["x-forwarded-for"] ||
      req.headers["x-real-ip"] ||
      req.headers["x-client-ip"] ||
      req.headers["x-forwarded"] ||
      req.socket.remoteAddress;

    let allips = (await db.get("ips")) ? await db.get("ips") : [];
    let mainip = await db.get(`ip-${userResp.email}`);
    if (mainip) {
      if (mainip !== ip) {
        allips = allips.filter((ip2) => ip2 !== mainip);
        if (allips.includes(ip)) {
          return res.send("You Cannot Create Alts!");
        }
        allips.push(ip);
        await db.set("ips", allips);
        await db.set(`ip-${userResp.email}`, ip);
      }
    } else {
      if (allips.includes(ip)) {
        return res.send("You Cannot Create Alts!");
      }
      allips.push(ip);
      await db.set("ips", allips);
      await db.set(`ip-${userResp.email}`, ip);
    }

    if (settings.api.client.oauth2.ip["cookie alt check"]) {
      let accountid = getCookie(req, "accountid");

      if (accountid) {
        if (accountid !== userResp.email) {
          return res.send("You Cannot Create Alts!");
        }
      }

      res.cookie("accountid", userResp.email);
    }

    let usernamehash = userResp.user + makenumber(4);
    const usernamenew = String(usernamehash);

    const userinfo = {
      username: usernamenew,
      id: userResp.email,
      email: userResp.email,
      password: makeid(8),
      type: "xauth",
    };

    if (await db.get(`users-${userResp.email}`)) {
      let cacheaccount = await fetch(
        settings.pterodactyl.domain +
          "/api/application/users/" +
          (await db.get("users-" + userinfo.id)) +
          "?include=servers",
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      if ((await cacheaccount.statusText) == "Not Found")
        return res.redirect(failedcallback + "?err=CANNOTGETINFO");
      let cacheaccountinfo = JSON.parse(await cacheaccount.text());
      req.session.pterodactyl = cacheaccountinfo.attributes;
      const user = await db.get("userinfo-" + userinfo.email);
      if (!user) return res.redirect("/?err=user_not_found");
      req.session.userinfo = user;
      return res.redirect("/dashboard");
    }
    const accountjson = await fetch(
      `${settings.pterodactyl.domain}/api/application/users`,
      {
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
        body: JSON.stringify({
          username: userinfo.username,
          email: userinfo.email,
          first_name: userinfo.username,
          last_name: "(xauth)",
          password: userinfo.password,
        }),
      }
    );
    if (accountjson.status == 201) {
      const accountinfo = JSON.parse(await accountjson.text());
      await db.set(`users-${userinfo.email}`, accountinfo.attributes.id);
    } else {
      let accountlistjson = await fetch(
        `${
          settings.pterodactyl.domain
        }/api/application/users?include=servers&filter[email]=${encodeURIComponent(
          userinfo.email
        )}`,
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pterodactyl.key}`,
          },
        }
      );
      const accountlist = await accountlistjson.json();
      const user = accountlist.data.filter(
        (acc) => acc.attributes.email == userinfo.email
      );
      if (user.length == 1) {
        let userid = user[0].attributes.id;
        await db.set(`users-${userinfo.id}`, userid);
      } else {
        return res.send(
          "An error has occured when attempting to create your account."
        );
      }
    }
    let cacheaccount = await fetch(
      `${settings.pterodactyl.domain}/api/application/users/${await db.get(
        `users-${userinfo.email}`
      )}?include=servers`,
      {
        method: "get",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pterodactyl.key}`,
        },
      }
    );
    if ((await cacheaccount.statusText) == "Not Found")
      return res.send(
        "An error has occured while attempting to get your user information."
      );
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    await db.set(`userinfo-${userinfo.email}`, userinfo);
    await db.set(`username-${userinfo.id}`, usernamehash);
    await db.set("passwords-" + userinfo.id, userinfo.password);
    let userdb = await db.get("userlist");
    userdb = userdb ? userdb : [];
    if (!userdb.includes(`${userinfo.id}`)) {
      userdb.push(`${userinfo.id}`);
      await db.set("userlist", userdb);
    }
    req.session.newaccount = true;
    req.session.password = userinfo.password;
    req.session.pterodactyl = cacheaccountinfo.attributes;
    req.session.userinfo = userinfo;

    return res.redirect("/dashboard");
  });

  async function four0four(req, res, theme) {
    ejs.renderFile(
      `./themes/${theme.name}/${theme.settings.notfound}`,
      await eval(indexjs.renderdataeval),
      null,
      function (err, str) {
        delete req.session.newaccount;
        if (err) {
          console.log(
            `[WEBSITE] An error has occured on path ${req._parsedUrl.pathname}:`
          );
          console.log(err);
          return res.send(
            "An error has occured while attempting to load this page. Please contact an administrator to fix this."
          );
        }
        res.status(404);
        res.send(str);
      }
    );
  }
};

function makeid(length) {
  let result = "";
  let characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function hexToDecimal(hex) {
  return parseInt(hex.replace("#", ""), 16);
}

// Get a cookie.
function getCookie(req, cname) {
  let cookies = req.headers.cookie;
  if (!cookies) return null;
  let name = cname + "=";
  let ca = cookies.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return decodeURIComponent(c.substring(name.length, c.length));
    }
  }
  return "";
}

function makenumber(length) {
  let result = "";
  let characters = "0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
