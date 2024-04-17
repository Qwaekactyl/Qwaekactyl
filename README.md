![Qwakeactyl](https://media.discordapp.net/attachments/1134455968156106762/1134456211371208744/image.png?width=823&height=443)

<hr>

# Qwaekactyl V3.0| The Best Dashboard For Splitting Resources In Pterodactyl Panel

Making a free or paid host and need a way for users to sign up, earn coins, manage servers? Try out Qwaekactyl.
To get started, scroll down and follow the guide

All features:
- Resource Management (gift, use it to create servers, etc)
- Coins (AFK Page earning)
- Coupons (Gives resources & coins to a user)
- Servers (create, view, edit servers)
- User System (auth, regen password, etc)
- Store (buy resources with coins)
- Dashboard (view resources & servers from one area)
- Join for Resources (join discord servers for resources)
- Admin (set/add/remove coins & resources, create/revoke coupons & etc)
- API (for a lot things)
- Legal (tos/pp in footer & its own page)
- User Friendly
- Arcio Widget Supported
- Donate Nav
- Social nav
- Gift Resources
- Admin Area For Admins
- Status Page for Hetrixtool
- Node Status Page
- Multi Login (Email,Discord,Google,Apple)

# What's New
- New User UI
- New Admin UI
- Recoded all API
- Added New Status Page
- Added Multi Login
- New Donate Page
- Added Alert email Notification for user On login
- Added New Multi Socail Media
- Added Referral System
- Added Fastest CDN
- Added New Greating Msg on Dashboard
- Fixed Many Bugs


# Warning

We cannot force you to keep the "Powered by Qwaekactyl" in the footer, but please consider keeping it. It helps getting more visibility to the project and so getting better. We won't do technical support for installations without the notice in the footer.

# Disclaimer

We are not responsible for any damages.

# Installation

<h2>Installing Dependencies</h2>

```bash
$ sudo apt update && sudo apt upgrade
$ sudo apt install git
$ curl -fsSL https://deb.nodesource.com/setup_14.x | sudo bash -
$ apt install nodejs
$ npm -v
$ git clone https://github.com/Qwaekactyl/Qwaekactyl.git
$ cd Qwaekactyl
$ npm install
$ apt install nginx
$ sudo apt install certbot
$ sudo apt install -y python3-certbot-nginx
```

# Setup your domain to client panel

1. You have to install some packages

```bash
$ apt install nginx
$ sudo apt install certbot
$ sudo apt install -y python3-certbot-nginx
````

2. When these packages are installed, You have to add ssl to your domain :- using following commands

```bash
$ certbot certonly -d <your domain>
```
> Now  type 1 and enter to get ssl

3. Now Doing above all works now you have to setup nginx config. 

   > use this command first
   ```bash
   $ systemctl stop nginx
   $ nano /etc/nginx/sites-enabled/imp.conf
   ```
   > using this cmd a blank file will open for edit and now paste the give config by editing your domain
# Nginx Proxy Config
```Nginx
server {
    listen 80;
    server_name <domain>;
    return 301 https://$server_name$request_uri;
}
server {
    listen 443 ssl http2;
location /afkwspath {
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_pass "http://localhost:<port>/afkwspath";
}
    
    server_name <domain>;
ssl_certificate /etc/letsencrypt/live/<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols SSLv3 TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
location / {
      proxy_pass http://localhost:<port>/;
      proxy_buffering off;
      proxy_set_header X-Real-IP $remote_addr;
  }
}
```

> Now press ^x and press y

4. Now your config is setup now u have to run nginx

```bash
$ systemctl start nginx
```
> Doing this you have successfully setup your domain ssl and point your domain to running client panel
> Note :- make sure you have point your domain to your vps ip.

# Start Command
```bash
$ npm start
```

<hr>

# Themes

![normal](https://media.discordapp.net/attachments/1134455968156106762/1134800093946585138/image.png?width=831&height=443)

# Credits

This Project Is Created And Managed By [Qwaekactyl]([https://discord.gg/KYUPXPv4](https://discord.gg/DmV7drZD))'s Developers.

This Project was not possible without [Dashactyl](https://github.com/Votion-Development/Dashactyl)

# Support
[Qwaekactyl Support Server](https://discord.gg/ubVuhS8wjV)

