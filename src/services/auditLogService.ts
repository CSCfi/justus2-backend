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

async function hasAccess(user: any, id?: any) {

        if (!id) {
            if (!user.organisaatio) {
                return false;
            } else {
                return true;
            }
        }

        if (id) {

            let access: boolean = false;

            if (user.rooli === "owner") {
                access = true;

            } else {
                access = false;
                const params = {"code": user.organisaatio, "uid":  user.uid};

                let query;
                const select = "SELECT julkaisu.id FROM julkaisu" +
                    " INNER JOIN kaytto_loki AS kl on julkaisu.accessid = kl.id" +
                    " WHERE organisaatiotunnus = ${code}";

                if (user.rooli === "admin") {
                    query = select + " ORDER BY julkaisu.id";
                }

                if (user.rooli === "member") {
                    query = select + " AND kl.uid = ${uid} ORDER BY julkaisu.id";
                }

                    const list = await dataBase.any(query, params);

                    // verify that requested id matches to id list
                    for (let i = 0; i < list.length; i++) {
                        if (parseInt(list[i].id) === parseInt(id)) {
                            access = true;
                        }
                    }
            }

            return access;
        }

}


module.exports = {
    postAuditData: postAuditData,
    hasAccess: hasAccess
};
