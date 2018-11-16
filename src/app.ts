import express, { NextFunction } from "express";
import compression from "compression";  // compresses requests
import lusca from "lusca";
import dotenv from "dotenv";
import flash from "express-flash";
import path from "path";
import expressValidator from "express-validator";
import { SESSION_SECRET } from "./util/secrets";


if (typeof process.env.NODE_ENV === "undefined" || process.env.NODE_ENV != "prod") {
    // Load environment variables from .env file, where API keys and passwords are configured
    dotenv.config({ path: ".env.example" });
}

// Create express server
const app = express();

const morgan = require("morgan");

// Require bodyparser for every request
const bodyParser = require("body-parser");

// Controllers (route handlers)
import * as homeController from "./controllers/home";
const apiRouter = require("./routes/routes");
const session = require ("express-session");
const RedisStore = require("connect-redis")(session);


// app.use(session({
//   store: new RedisStore(),
//   secret: SESSION_SECRET,
//   cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
//   resave: true,
//   autoreconnect: true,
//   saveUninitialized: true,

// }));

// CONNECT TO PSQL INSIDE VAGRANT "psql -h 10.10.10.10 -U appaccount -d justus"
// psql -h 10.10.10.10 -U appaccount -d justus < node_modules/connect-pg-simple/table.sql
app.use(morgan("dev"));
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set("port", 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.get("/", homeController.index);
app.use("/", apiRouter);
app.use(expressValidator);
app.use(flash);
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection);
// app.use(compression());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({extended: true}));



export default app;