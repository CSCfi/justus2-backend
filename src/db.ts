const promise = require("bluebird");
// Options used for our pgp const
const options = {
    promiseLib: promise
};

// Initializing postgres connection by using pg-promise
const pgp = require("pg-promise")(options);

// Connection string for the database, move this to a ENV.variable later
const conString = process.env.PG_URL;
// const db will be used for all queries etc. db.any, db.none and so on
const db = pgp(conString);

module.exports = {
    pgp: pgp,
    db: db
};



