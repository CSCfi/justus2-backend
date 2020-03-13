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

const csvParser = require("./services/csvReader");


app.use(cookieParser());
app.use(session({
    store: new RedisStore(),
    secret: sessionSecret,
    cookie: { maxAge: 8 * 60 * 60 * 1000, secure: false }, // 8 hours,
    resave: true,
    autoreconnect: true,
    saveUninitialized: false,
    rolling: true
}));


// csvParser.readCSV();
// csvParser.writeCSV();

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
// app.use(require("./services/csvReader"));
app.get("/", homeController.index);
app.use("/", apiRouter);
app.use(expressValidator);
app.use(flash);
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection);
app.disable("etag");

export default app;