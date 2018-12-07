import { Request, Response, NextFunction } from "express";
const authService = require("./authService");

module.exports = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userData) {
    req.session.userData = authService.getUserData(req.headers);
    next();
    }
    else {
        next();
    }
};