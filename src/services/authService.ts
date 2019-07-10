const organisationConfig = require("./../organization_config");
const domainMapping = organisationConfig.domainMappings;

const conn = require("./../db");
const utf8 = require("utf8");

const getUserData = function (headers: any) {


    if (!headers["shib-group"]) {
        return false;
    }

    const domain =  parseDomainFromHeadersData(headers["shib-group"]);

        if (!domain) {
            return false;
        }

        const name = utf8.decode(headers["shib-sn"]) + " " + utf8.decode(headers["shib-givenname"]);
        const userData = {
            "domain": "",
            "organisaatio": "",
            "email": "",
            "rooli": "",
            "nimi": name,
            "showPublicationInput": <boolean> undefined,
            "jukuriUser": <boolean> undefined
        };

        const role = getRole(headers["shib-group"]);

        let domainMapped = false;

        Object.keys(domainMapping).forEach(function (val, key) {
            if (domainMapping[key].domain === domain) {
                userData.domain = domain;
                userData.organisaatio = domainMapping[key].code;
                userData.email = domainMapping[key].email;
                userData.rooli = role;
                domainMapped = true;
            } else {
                return false;
            }
        });

        if (!domainMapped) {
            return false;
        } else {
            return userData;
        }
};


const getOrganisationId = function(params: any) {

    const domain =  parseDomainFromHeadersData(params);
    let organisationCode = "";

    if (!domain) {
        return false;
    }

    Object.keys(domainMapping).forEach(function (val, key) {
        if (domainMapping[key].domain === domain) {
            organisationCode = domainMapping[key].code;
        }
    });

    return organisationCode;
};


const parseDomainFromHeadersData = function(data: any) {

    const domain = data.match(/(;|^)(@[^;]+)($|;)/);
    if (domain !== null) {
        return domain[2];
    } else {
        return false;
    }
};

const getRole = function(data: any) {

    console.log(data);

    if (data.match(/\/justus#group-admins($|;)/) !== null) {
        return "owner";
    }
    else if (data.match(/\/justus#([^;]*)-admins($|;)/) !== null) {
        return "admin";
    }
    else {
        return "member";
    }

};

async function hasAccessToPublication(user: any, id: any) {

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

async function hasOrganisation(user: any) {

    if (!user) {
        return false;
    }

    if (!user.organisaatio) {
        return false;
    } else {
        return true;
    }
}


async function isAdmin(user: any) {

    if (!user) {
        return false;
    }

    if (user.rooli === "owner" || user.rooli === "admin") {
        return true;
    } else {
        return false;
    }
}



module.exports = {
    getOrganisationId: getOrganisationId,
    getUserData: getUserData,
    getRole: getRole,
    parseDomainFromHeadersData: parseDomainFromHeadersData,
    hasAccessToPublication: hasAccessToPublication,
    hasOrganisation: hasOrganisation,
    isAdmin: isAdmin



};