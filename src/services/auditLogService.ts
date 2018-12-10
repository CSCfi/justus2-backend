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

module.exports = {
    postAuditData: postAuditData,
};
