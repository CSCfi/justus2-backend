const organisationConfig = require("./../organization_config");
const domainMapping = organisationConfig.domainMappings;

const conn = require("./../db");

let getUserData = function(headers: any) {

    const domain =  parseDomainFromHeadersData(headers["shib-group"]);

        if (!domain) {
            return false;
        }

        const name = headers["shib-sn"] + " " + headers["shib-givenname"] ;
        const userData = {
            "domain": "",
            "organisaatio": "",
            "email": "",
            "rooli": "",
            "nimi": name
        };

        const role = getRole(headers["shib-group"]);


        Object.keys(domainMapping).forEach(function (val, key) {
            if (domainMapping[key].domain === domain) {
                userData.domain = domain;
                userData.organisaatio = domainMapping[key].code;
                userData.email = domainMapping[key].email;
                userData.rooli = role;
            } else {
                return false;
            }
        });

    return userData;
};


let getOrganisationId = function(params: any) {

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


let parseDomainFromHeadersData = function(data: any) {

    // for developing purposes, in production this data comes from headers, then use parameter data instead of this
    // const testHeaderData = "@digia.com;jira-users;https://tt.eduuni.fi/groups/justus#group-admins;https://tt.eduuni.fi/groups/csc#cscoppimateriaalivaranto-members;https://tt.eduuni.fi/groups/csc#cscjustus-members";
    // const testHeaderData = "@luke.fi;jira-users;https://tt.eduuni.fi/groups/justus#centria-admins;https://tt.eduuni.fi/groups/csc#cscoppimateriaalivaranto-members;https://tt.eduuni.fi/groups/csc#cscjustus-members";

    const domain = data.match(/(;|^)(@[^;]+)[$;]/);
    if (domain !== null) {
        // console.log(domain[2]);
        return domain[2];
    } else {
        return false;
    }
};

let getRole = function(data: any) {

    // for developing purposes, in production this data comes from headers, then use parameter data instead of this
    // const testHeaderData = "@digia.com;jira-users;https://tt.eduuni.fi/groups/justus#group-admins;https://tt.eduuni.fi/groups/csc#cscoppimateriaalivaranto-members;https://tt.eduuni.fi/groups/csc#cscjustus-members";
    // const testHeaderData = "@luke.fi;jira-users;https://tt.eduuni.fi/groups/justus#centria-admins;https://tt.eduuni.fi/groups/csc#cscoppimateriaalivaranto-members;https://tt.eduuni.fi/groups/csc#cscjustus-members";

    if (data.match(/\/justus#group-admins[$;]/) !== null) {
        return "owner";
    }
    else if (data.match(/\/justus#([^;]*)-admins[$;]/) !== null) {
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