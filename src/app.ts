import express, { NextFunction } from "express";
import compression from "compression";  // compresses requests
import lusca from "lusca";
import dotenv from "dotenv";
import flash from "express-flash";
import path from "path";
import expressValidator from "express-validator";

if (typeof process.env.NODE_ENV === "undefined" || process.env.NODE_ENV != "prod") {
    // Load environment variables from .env file, where API keys and passwords are configured
    dotenv.config({ path: ".env.variables" });
}
const redis = require("redis");
const client = redis.createClient();
// Create express server
const app = express();
// const cookieSession = require("cookie-session");
const morgan = require("morgan");

// Require bodyparser for every request
const bodyParser = require("body-parser");

// Controllers (route handlers)
import * as homeController from "./controllers/home";

const apiRouter = require("./routes/routes");
const session = require ("express-session");
const RedisStore = require("connect-redis")(session);


app.use(session({
  store: new RedisStore(),
  secret: "test",
  cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  resave: true,
  autoreconnect: true,
  saveUninitialized: true,

}));

// CONNECT TO PSQL INSIDE VAGRANT "psql -h 10.10.10.10 -U appaccount -d justus"
// psql -h 10.10.10.10 -U appaccount -d justus < node_modules/connect-pg-simple/table.sql
app.use(morgan("dev"));
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set("port", 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
// app.use(require("./services/populateUserData"));
app.get("/", homeController.index);
app.use("/", apiRouter);
app.use(expressValidator);
app.use(flash);
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection);

export default app;