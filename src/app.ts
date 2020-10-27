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
const redisClient = redis.createClient();

app.use(cookieParser());
app.use(session({
    store: new RedisStore( {client: redisClient} ),
    secret: sessionSecret,
    cookie: { maxAge: 8 * 60 * 60 * 1000, secure: false, httpOnly: false }, // 8 hours,
    resave: true,
    autoreconnect: true,
    saveUninitialized: false
}));


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
app.disable("etag");

export default app;