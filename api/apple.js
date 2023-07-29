const settings = require("../settings.json");
const fetch = require("node-fetch");
const jwt_decode = require('jwt-decode'); // Add jwt-decode library for decoding Apple ID token
const { v4: uuidv4 } = require('uuid'); // Add uuid library for generating unique IDs
const indexjs = require("../index.js");
const fs = require("fs");

module.exports.load = async function(app, db) {
  const appleAuthUrl = 'https://appleid.apple.com/auth/authorize';
  const appleTokenUrl = 'https://appleid.apple.com/auth/token';

  const appleClientId = settings.api.client.apple.clientid;
  const appleClientSecret = settings.api.client.apple.clientsecret;
  const appleRedirectURL = settings.api.client.apple.link + "/auth/apple/callback";
  const appleScopes = ['name', 'email'];

  app.get('/auth/apple', (req, res) => {
    const authorizeUrl = `${appleAuthUrl}?response_type=code&response_mode=form_post&client_id=${appleClientId}&scope=${encodeURIComponent(appleScopes.join(' '))}&redirect_uri=${encodeURIComponent(appleRedirectURL)}`;
    res.redirect(authorizeUrl);
  });

  app.post('/auth/apple/callback', async (req, res) => {
    const { code } = req.body;
    try {
      const tokenParams = new URLSearchParams();
      tokenParams.append('client_id', appleClientId);
      tokenParams.append('client_secret', appleClientSecret);
      tokenParams.append('code', code);
      tokenParams.append('grant_type', 'authorization_code');
      tokenParams.append('redirect_uri', appleRedirectURL);

      const tokenResponse = await fetch(appleTokenUrl, {
        method: 'post',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams,
      });

      const tokenData = await tokenResponse.json();
      const { id_token } = tokenData;

      // You can now decode the ID token and get user information
      const appleUserInfo = jwt_decode(id_token);
      const { email, sub, given_name, family_name } = appleUserInfo;

      // Generate a unique user ID for Apple login
      const userid = `apple_${uuidv4()}`;

      let theme = indexjs.get(req);
      let failedcallback = theme.settings.redirect.failedcallback || "/";

      let newsettings = JSON.parse(fs.readFileSync("./settings.json"));
      let genpassword = null;
      if (newsettings.api.client.passwordgenerator.signup == true) {
        genpassword = makeid(newsettings.api.client.passwordgenerator["length"]);
      }

      const userinfo = {
        username: given_name,
        id: userid,
        password: genpassword,
        discriminator: null,
        discord: false,
        type: "apple",
        profilepic: null // You may need to fetch profile picture separately, as Apple does not provide it in the ID token
      }

      if (!await db.get("users-" + userid)) {
        if (newsettings.api.client.allow.newusers == true) {

          let ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-client-ip'] || req.headers['x-forwarded'] || req.socket.remoteAddress;

          // ... Rest of the code for checking IP ...

          // ... Rest of the code for account creation ...

          // After successful user creation, you can set the session and redirect to the dashboard
          req.session.newaccount = true;
          req.session.password = genpassword;
        } else {
          return res.redirect(failedcallback + "?err=DISABLED")
        }
      }

      // ... Rest of the code for retrieving user information and setting the session ...
       // Get the user's email
  const userEmail = email;
  const emailSubject = "Registration Successful";
  const emailText = `Hello, you have successfully Logged in with the email: ${userEmail}!\n\nPowered By Qwaekactyl `;

  const emailApiUrl = `https://api.qwaekactyl.xyz/send_email?to=${encodeURIComponent(
    userEmail
  )}&subject=${encodeURIComponent(emailSubject)}&text=${encodeURIComponent(
    emailText
  )}&name=${encodeURIComponent(settings.email.name)}&auth_user=${encodeURIComponent(
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
      return res.redirect("/dashboard");
    } catch (error) {
      console.error(error);
      res.status(400).send('Error during Apple authentication');
    }
  });

  // ... Rest of your code ...
}

function makeid(length) {
  let result = '';
  let characters = 'ABCEDFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
