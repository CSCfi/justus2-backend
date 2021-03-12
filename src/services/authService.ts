import { IncomingHttpHeaders } from "http";
import { UserObject } from "../types/User";

const organisationConfig = require("../config/organization_config");
const domainMapping = organisationConfig.domainMappings;


const conn = require("./../db");
const utf8 = require("utf8");

class AuthService {

    getUserData = async (headers: IncomingHttpHeaders) => {

        if (!headers["shib-group"]) {
            return undefined;
        }

        const domain =  this.parseDomainFromHeadersData(headers["shib-group"]);

        if (!domain) {
            return undefined;
        }

        const name = utf8.decode(headers["shib-sn"]) + " " + utf8.decode(headers["shib-givenname"]);
        const uid = headers["shib-uid"].toString();

        const userData: UserObject["perustiedot"] = {
            "domain": "",
            "organisaatio": "",
            "email": "",
            "seloste": undefined,
            "rooli": "",
            "nimi": name,
            "uid": uid,
            "kieli": "",
            "showHrData": undefined,
            "showPublicationInput": undefined,
            "jukuriUser": undefined,
            "owner": undefined

        };

        console.log(headers);
        const role = this.getRole(headers["shib-group"]);

        Object.keys(domainMapping).forEach(function (val, key) {

            if (domainMapping[key].domain.includes(domain)) {
                userData.domain = domain;
                userData.organisaatio = domainMapping[key].code;
                userData.email = domainMapping[key].email;
                // array
                userData.seloste = domainMapping[key].seloste;
                userData.rooli = role;
            } else {
                return undefined;
            }
        });

        if (userData.organisaatio === "00000" && userData.rooli === "owner") {
            userData["owner"] = true;
        }

        console.log(userData);

        return userData;

    };


    parseDomainFromHeadersData = (data: any) => {
        const domain = data.match(/(;|^)(@[^;]+)($|;)/);
        if (domain !== null) {
            return domain[2];
        } else {
            return false;
        }
    };


    getRole = (data: any) => {

        console.log("In get role function");
        console.log(data);

        if (data.match(/\/justus#justus-owners($|;)/) !== null) {
            return "owner";
        }
        else if (data.match(/\/justus#([^;]*)-admins($|;)/) !== null) {
            return "admin";
        }
        else {
            return "member";
        }

    };

    hasAccessToPublication = async (user: any, id: any) => {

        if (!user) {
            return false;
        }

        let access: boolean = false;

        if (user.rooli === "owner") {
            access = true;

        } else {
            access = false;
            const params = {"code": user.organisaatio, "uid":  user.uid, "julkaisuid": id};

            let query;
            const select = "SELECT julkaisu.id FROM julkaisu" +
                " INNER JOIN kaytto_loki AS kl on julkaisu.accessid = kl.id" +
                " WHERE organisaatiotunnus = ${code} AND julkaisu.id = ${julkaisuid}";

            if (user.rooli === "admin") {
                query = select;
            }

            if (user.rooli === "member") {
                query = select + " AND kl.uid = ${uid} AND julkaisu.julkaisuntila = ''";
            }

            const data = await conn.db.any(query, params);

            if (data.length > 0) {
                access = true;
            }
        }
        return access;

    }

    hasOrganisation = async (user: any) => {

        if (!user) {
            return false;
        }

        if (!user.organisaatio) {
            return false;
        } else {
            return true;
        }
    }


     isAdmin = async (user: any) => {

        if (!user) {
            return false;
        }

        if (user.rooli === "owner" || user.rooli === "admin") {
            return true;
        } else {
            return false;
        }
    }

}

export const authService = new AuthService();
