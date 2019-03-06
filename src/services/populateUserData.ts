import { Request, Response, NextFunction } from "express";
const authService = require("./authService");
module.exports = (req: Request, res: Response, next: NextFunction) => {

    console.log(req.path);

    // return data from this route before user is authenticated
    if (req.path === "/organisaationimet") {
        console.log(next());
        next();
    }

    if (!authService.getUserData(req.headers)) {
        console.log("User is not authenticated");
        next();
    } else {
        console.log("User is authenticated");
        req.session.userData = authService.getUserData(req.headers);
        console.log(req.session.userData);
        req.session.userData.uid = req.headers["shib-uid"];
        if (!req.session.language) {
            req.session.language = "FI";
        }
        req.session.userData.ip = req.headers["x-forwarded-for"] || (req.connection && req.connection.remoteAddress) || "";
        next();
    }
};