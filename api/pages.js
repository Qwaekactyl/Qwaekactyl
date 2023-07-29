const indexjs = require("../index.js");
const arciotext = (require("./arcio.js")).text;
const ejs = require("ejs");
const express = require("express");
const settings = require("../settings.json");
const fetch = require('node-fetch');

module.exports.load = async function(app, db) {
  app.all("/", async (req, res) => {
    if (req.session.pterodactyl) if (req.session.pterodactyl.id !== await db.get("users-" + req.session.userinfo.id)) return res.redirect("/")
    let theme = indexjs.get(req);
    if (theme.settings.mustbeloggedin.includes(req._parsedUrl.pathname)) if (!req.session.userinfo || !req.session.pterodactyl) return res.redirect("/");
    if (theme.settings.mustbeadmin.includes(req._parsedUrl.pathname)) {
      ejs.renderFile(
        `./themes/${theme.name}/${theme.settings.notfound}`, 
        await eval(indexjs.renderdataeval),
        null,
      async function (err, str) {
        delete req.session.newaccount;
        if (!req.session.userinfo || !req.session.pterodactyl) {
          if (err) {
            console.log(`[Qwakeactyl] An error has occured on path ${req._parsedUrl.pathname}:`);
            console.log(err);
            return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
          };
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
            console.log(`[Qwakeactyl] An error has occured on path ${req._parsedUrl.pathname}:`);
            console.log(err);
            return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
          };
          return res.send(str);
        };
        let cacheaccountinfo = JSON.parse(await cacheaccount.text());
      
        req.session.pterodactyl = cacheaccountinfo.attributes;
        if (cacheaccountinfo.attributes.root_admin !== true) {
          if (err) {
            console.log(`[Qwakeactyl] An error has occured on path ${req._parsedUrl.pathname}:`);
            console.log(err);
            return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
          };
          return res.send(str);
        };
  
        ejs.renderFile(
          `./themes/${theme.name}/${theme.settings.index}`, 
          await eval(indexjs.renderdataeval),
          null,
        function (err, str) {
          if (err) {
            console.log(`[Qwakeactyl] An error has occured on path ${req._parsedUrl.pathname}:`);
            console.log(err);
            return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
          };
          delete req.session.newaccount;
          res.send(str);
        });
      });
      return;
    };
    ejs.renderFile(
      `./themes/${theme.name}/${theme.settings.index}`, 
      await eval(indexjs.renderdataeval),
      null,
    function (err, str) {
      if (err) {
        console.log(`[Qwakeactyl] An error has occured on path ${req._parsedUrl.pathname}:`);
        console.log(err);
        return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
      };
      delete req.session.newaccount;
      res.send(str);
    });
  });

  app.use('/assetsnew', express.static('./assets'));
  app.use('/assetslogin', express.static('./assets/login'));
};
