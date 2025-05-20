const settings = require("../settings.json");
const validator = require("email-validator");
const indexjs = require("../index.js");
const nodemailer = require("nodemailer");

async function sendEmail(to, subject, body) {
  const emailServiceUrl = settings.email.serviceUrl || "http://localhost:1358"; // Default to localhost if not set
  if (!emailServiceUrl.startsWith('http://') && !emailServiceUrl.startsWith('https://')) {
    console.log('Invalid URL: Only absolute URLs are supported');
  }

  try {
    const response = await fetch(`${emailServiceUrl}/auth/email/send`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.email.auth_pass}`
      },
      body: JSON.stringify({
        to,
        subject,
        body
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

module.exports.load = async function(app, db) {
  app.get("/auth/email/login", async (req, res) => {
    if (!req.query.email || !req.query.password) return res.send("Invalid Information");
    const userinfo = await db.get(`userinfo-${req.query.email}`);
    const user = await db.get(`users-${req.query.email}`);
    const passwords = await db.get(`passwords-${req.query.email}`);
    if (!user) return res.send({ error: "Invalid Email." });
    if (passwords !== req.query.password) return res.send({ error: "Invalid Password." });

    let cacheaccount = await fetch(
      `${settings.pterodactyl.domain}/api/application/users/${await db.get(`users-${req.query.email}`)}?include=servers`,
      {
        method: "get",
        headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
      }
    );
    if (await cacheaccount.statusText == "Not Found") return res.send("An error has occured while attempting to get your user information.");
    cacheaccount = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccount.attributes;
    req.session.userinfo = userinfo;

    const userEmail = req.query.email;

    try {
      await sendEmail(userEmail, "Login Successful", `Hello, you have successfully logged in with the email: ${userEmail}!\n\nPowered By Qwaekactyl`);
      console.log("Email sent successfully.");
    } catch (error) {
      console.error("Error sending email:", error);
    }

    return res.redirect("/dashboard");
  });

  app.get("/auth/email/register", async (req, res) => {
    let theme = indexjs.get(req);

    if (settings.api.client.allow.newusers == false) return four0four(req, res, theme);

    if (!req.query.email || !req.query.password || !req.query.username) return res.send("Missing information");
    if (await db.get(`user-${req.query.email}`)) return res.send("Already registered.");
    if (validator.validate(req.query.email) == false) return res.send("Invalid Email");

    let ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-client-ip'] || req.headers['x-forwarded'] || req.socket.remoteAddress;

    let allips = await db.get("ips") ? await db.get("ips") : [];
    let mainip = await db.get(`ip-${req.query.email}`);
    if (mainip) {
      if (mainip !== ip) {
        allips = allips.filter(ip2 => ip2 !== mainip);
        if (allips.includes(ip)) {
          return res.send("You Cannot Create Alts!");
        }
        allips.push(ip);
        await db.set("ips", allips);
        await db.set(`ip-${req.query.email}`, ip);
      }
    } else {
      if (allips.includes(ip)) {
        return res.send("You Cannot Create Alts!");
      }
      allips.push(ip);
      await db.set("ips", allips);
      await db.set(`ip-${req.query.email}`, ip);
    }

    if (settings.api.client.oauth2.ip["cookie alt check"]) {
      let accountid = getCookie(req, "accountid");

      if (accountid) {
        if (accountid !== req.query.mail) {
          return res.send('You Cannot Create Alts!');
        }
      }

      res.cookie('accountid', req.query.mail);
    }

    let usernamehash = req.query.username + makenumber(4);

    usernamenew = String(usernamehash);

    const userinfo = {
      username: usernamenew,
      id: req.query.email,
      password: req.query.password,
      discriminator: null,
      discord: false,
      type: "email"
    };
    const accountjson = await fetch(
      `${settings.pterodactyl.domain}/api/application/users`, {
      method: "post",
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${settings.pterodactyl.key}`
      },
      body: JSON.stringify({
        username: usernamenew,
        email: req.query.email,
        first_name: usernamenew,
        last_name: "(credentials)",
        password: req.query.password
      })
    }
    );
    if (accountjson.status == 201) {
      const accountinfo = JSON.parse(await accountjson.text());
      await db.set(`users-${req.query.email}`, accountinfo.attributes.id);
    } else {
      let accountlistjson = await fetch(
        `${settings.pterodactyl.domain}/api/application/users?include=servers&filter[email]=${encodeURIComponent(req.query.email)}`, {
        method: "get",
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${settings.pterodactyl.key}`
        }
      }
      );
      const accountlist = await accountlistjson.json();
      const user = accountlist.data.filter(acc => acc.attributes.email == req.query.email);
      if (user.length == 1) {
        let userid = user[0].attributes.id;
        await db.set(`users-${userinfo.id}`, userid);
      } else {
        return res.send("An error has occured when attempting to create your account.");
      };
    }
    let cacheaccount = await fetch(
      `${settings.pterodactyl.domain}/api/application/users/${await db.get(`users-${req.query.email}`)}?include=servers`,
      {
        method: "get",
        headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
      }
    );
    if (await cacheaccount.statusText == "Not Found") return res.send("An error has occured while attempting to get your user information.");
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    await db.set(`userinfo-${req.query.email}`, userinfo);
    await db.set(`username-${userinfo.id}`, usernamehash);
    await db.set('passwords-' + userinfo.id, req.query.password);

    let userdb = await db.get("userlist");
    userdb = userdb ? userdb : [];
    if (!userdb.includes(`${userinfo.id}`)) {
      userdb.push(`${userinfo.id}`);
      await db.set("userlist", userdb);
    }

    req.session.pterodactyl = cacheaccountinfo.attributes;
    req.session.userinfo = userinfo;

    const userEmail = req.query.email;

    try {
      await sendEmail(userEmail, "Registration Successful", `Hello, you have successfully registered with the email: ${userEmail}!\n\nPowered By Qwaekactyl`);
      console.log("Email sent successfully.");
    } catch (error) {
      console.error("Error sending email:", error);
    }

    return res.redirect("/dashboard");
  });

  function makenumber(length) {
    let result = '';
    let characters = '0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

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
}

