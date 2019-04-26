import express, { NextFunction } from "express";
import compression from "compression";  // compresses requests
import lusca from "lusca";
import dotenv from "dotenv";
import flash from "express-flash";
import path from "path";
import expressValidator from "express-validator";

dotenv.config({ path: ".env.variables" });
const sessionSecret = process.env.SESSION_SECRET;

const redis = require("redis");
const client = redis.createClient();

// Create express server
const app = express();
const morgan = require("morgan");

// Require bodyparser for every request
const bodyParser = require("body-parser");

// Controllers (route handlers)
import * as homeController from "./controllers/home";

const apiRouter = require("./routes/routes");
const session = require ("express-session");
const cookieParser = require("cookie-parser");
const RedisStore = require("connect-redis")(session);

app.use(cookieParser());
app.use(session({
    store: new RedisStore(),
    secret: sessionSecret,
    cookie: { maxAge: 24 * 60 * 60 * 1000, secure: false }, // 1 day
    resave: true,
    autoreconnect: true,
    saveUninitialized: true,

}));

console.log(process.env.NODE_ENV);


// CONNECT TO PSQL INSIDE VAGRANT "psql -h 10.10.10.10 -U appaccount -d justus"
// psql -h 10.10.10.10 -U appaccount -d justus < node_modules/connect-pg-simple/table.sql
app.use(morgan("dev"));
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set("port", 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(require("./services/populateUserData"));
app.get("/", homeController.index);
app.use("/", apiRouter);
app.use(expressValidator);
app.use(flash);
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection);

export default app;