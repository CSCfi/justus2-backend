import { Request, Response, NextFunction } from "express";
const authService = require("./authService");
module.exports = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userData) {
    req.session.userData = authService.getUserData(req.headers);
    req.session.userData.uid = authService.parseDomainFromHeadersData(req.headers["shib-uid"]);
    req.session.userData.ip = req.headers["x-forwarded-for"] || (req.connection && req.connection.remoteAddress) || "";
    next();
    }
    else {
        next();
    }
};