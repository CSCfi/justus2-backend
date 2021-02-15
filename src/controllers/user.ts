import { Request, Response, NextFunction } from "express";
import { authService as authService } from "../services/authService";
import { UserObject } from "../types/User";

// Database connection from db.ts
const connection = require("../db");
const db = connection.db;

const organisationConfig = require("../config/organization_config");
const domainMapping = organisationConfig.domainMappings;

const oh = require("../objecthandlers");

export const getUser = async (req: Request, res: Response, next: NextFunction) => {

    try {

        let userData: UserObject["perustiedot"];

        if (req.session.userData) {
            userData = req.session.userData;
            userData["showPublicationInput"] = <boolean>undefined;
            userData["jukuriUser"] = <boolean>undefined;
        } else {

            userData = await authService.getUserData(req.headers);

            if (!userData || !userData.domain) {
                return res.status(401).send("Unauthorized");
            }

            req.session.userData = {};

            req.session["userData"].domain = userData.domain;
            req.session["userData"].organisaatio = userData.organisaatio;
            req.session["userData"].email = userData.email;
            req.session["userData"].seloste = userData.seloste;
            req.session["userData"].rooli = userData.rooli;
            req.session["userData"].nimi = userData.nimi;
            req.session["userData"].owner = userData.owner;
            req.session["userData"].ip = req.headers["x-forwarded-for"] || (req.connection && req.connection.remoteAddress) || "";
            req.session["userData"].uid = req.headers["shib-uid"];
        }

        if (!req.session.language) {
            req.session.language = "FI";
        }

        userData.kieli = req.session.language;
        const userDataToClient = await oh.ObjectHandlerUser(userData, req.session.language);
        res.status(200).send(userDataToClient);

    } catch (e) {
        res.status(500).send("Could not get user data");
    }
};


export const postLanguage = (req: Request, res: Response) => {

    if (req.body.lang === "EN" || req.body.lang === "SV" || req.body.lang === "FI") {
        // req.session.language = {};
        const lang = req.body.lang;
        console.log("Before post " + JSON.stringify(req.session.language));
        req.session.language = lang;
        console.log("The new language according to req session = " + req.session.language);
        console.log("The JSONSTRINGIFIED session " + JSON.stringify(req.session));
        res.status(200).send("Language switched to " + req.session.language);
    } else {
        res.status(400).send("Wrong lang parameter posted");

    }
};

export const impersonateUser = async(req: Request, res: Response) => {

    if (!req.session.userData || !req.session.userData.owner) {
        return res.status(403).send("Permission denied");
    }

    const organizationCode = req.body.organizationId;
    req.session.userData.organisaatio = organizationCode;
    req.session.userData.rooli = req.body.role;

    Object.keys(domainMapping).forEach(function (val, key) {
        if (domainMapping[key].code === organizationCode) {
            req.session.userData.email = domainMapping[key].email;
            req.session.userData.seloste = domainMapping[key].seloste;
            if (!domainMapping[key].jukuriData) {
                req.session.userData.jukuriUser = undefined;
            }
        }
    });

    const userDataToClient = await oh.ObjectHandlerUser(req.session.userData, req.session.language);
    res.status(200).send(userDataToClient);

};


export const logout = (req: Request, res: Response, next: NextFunction) => {
    req.session.destroy(err => {
        if (err) {
            console.log(err);
            return next(err);
        }
        res.clearCookie("connect.sid", {path: "/"}).status(200).send("Logout successful and cookie deleted.");
        // res.status(200).send("Logout successful");
    });
};

export const dbHealthCheck = async (req: Request, res: Response, next: NextFunction) => {

    const testQuery = "SELECT 1;";

    try {
        const response = await db.one(testQuery);
        console.log(response);
        if (response) {
            return res.status(200).send("DB connection OK!");
        } else {
            return res.status(503).send("Database seems to be up but no data is returned.");
        }
    } catch (e) {
        console.log(e);
        return res.status(503).send("ERROR!");
    }

};
