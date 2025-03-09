todo
- severside auth, serverside class - full account-scope and get-user, mailer
- mailer, mail metódusok: onRegister comfirm, reset password etc for mailer frontend client

feat: Implement server-side auth and session management

- Finished CSR features: getAccount (JWT-based), getSession (DB fetch)
- Added session management: cookie (sessionId), localStorage (JWT), multi-device support
- Implemented session logic: login starts session in DB, logout removes cookie/JWT
- Added database utilities: listInlineQuery for SQL/NoSQL, default schema in server.js
- Completed getUser method for user scope
- Created MongoDB, MySQLDB, Database class in database.ts for ssr
- In progress: Server-side client class with getSession(ssr) for SSR user object retrieval
- Todo: Full server-side auth class, mailer service with register/reset methods