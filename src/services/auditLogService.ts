const authService = require("./authService");
const dbHelpers = require("./../databaseHelpers");

const connection = require("./../db");

const pgPromise = connection.pgp;
const dataBase = connection.db;

async function postAuditData(headers: any, method: any, table: any, id: any, inputData: any) {

    if (!inputData) { return; }

    const user = authService.getUserData(headers);
    const uid = headers["shib-uid"];

    const kayttoLokiData = {
        "name": user.nimi,
        "mail": user.email,
        "uid": uid,
        "julkaisu": id,
        "organization": user.organisaatio,
        "role": user.rooli,
        "itable": table,
        "action": method,
        "data": JSON.stringify(inputData)
    };


    const kayttoLokiColumns = new pgPromise.helpers.ColumnSet(dbHelpers.kaytto_loki, {table: "kaytto_loki"});
    const saveLokiData = pgPromise.helpers.insert(kayttoLokiData, kayttoLokiColumns) + "RETURNING id";
    const klId = await dataBase.one(saveLokiData);
    return klId;
}

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
                query = select + " AND kl.uid = ${uid}";
            }

            const data = await dataBase.any(query, params);

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
    if (user.rooli === "owner" || user.rooli === "admin") {
        return true;
    } else {
        return false;
    }
}


module.exports = {
    postAuditData: postAuditData,
    hasAccessToPublication: hasAccessToPublication,
    hasOrganisation: hasOrganisation,
    isAdmin: isAdmin
};