import { Request, Response, NextFunction } from "express";
const authService = require("./authService");
module.exports = (req: Request, res: Response, next: NextFunction) => {

    if (!authService.getUserData(req.headers)) {
        next();
    } else {
        req.session.userData = authService.getUserData(req.headers);
        req.session.userData.uid = req.headers["shib-uid"];
        if (!req.session.language) {
            req.session.language = "FI";
        }
        req.session.userData.ip = req.headers["x-forwarded-for"] || (req.connection && req.connection.remoteAddress) || "";
        next();
    }
};