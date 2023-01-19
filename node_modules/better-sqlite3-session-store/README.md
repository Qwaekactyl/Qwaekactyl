# better-sqlite3-session-store

[![npm version](https://badge.fury.io/js/better-sqlite3-session-store.svg)](https://badge.fury.io/js/better-sqlite3-session-store) [![workflow status](https://github.com/TimDaub/better-sqlite3-session-store/workflows/Node.js%20CI/badge.svg)](https://github.com/TimDaub/better-sqlite3-session-store/workflows/Node.js%20CI/badge.svg)

> **better-sqlite3-sessions-store** provides a
> [better-sqlite3](https://github.com/JoshuaWise/better-sqlite3/) session
> storage for [express-session](https://github.com/expressjs/session).

## Install

```bash
$ npm i --save better-sqlite3-session-store
```

## Usage

```js
const sqlite = require("better-sqlite3");
const session = require("express-session")

const SqliteStore = require("better-sqlite3-session-store")(session)
const db = new sqlite("sessions.db", { verbose: console.log });

app.use(
  session({
    store: new SqliteStore({
      client: db, 
      expired: {
        clear: true,
        intervalMs: 900000 //ms = 15min
      }
    }),
    secret: "keyboard cat",
    resave: false,
  })
)
```

## License

See [License](./LICENSE).

## Changelog

### 0.0.2

- Bug fix: For almost all Store methods, when an error was caught, their
  execution wasn't stopped with e.g. a `return` statement

### 0.0.1

- Release initial version

## Inspiration

To build this library, I looked at other session stores:

- [connect-sqlite3](https://github.com/rawberg/connect-sqlite3)
- [connect-redis](https://github.com/tj/connect-redis/)
