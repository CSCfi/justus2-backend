import { IncomingHttpHeaders } from "http";
import { UserObject } from "../models/User";
const authService = require("./authService");
const dbHelpers = require("./../databaseHelpers");

const connection = require("./../db");

class AuditLog {

    public async postAuditData(headers: any, method: any, table: any, id: any, inputData: any) {

        if (!inputData) { return; }

        const user = await authService.getUserData(headers);
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

        const kayttoLokiColumns = new connection.pgp.helpers.ColumnSet(dbHelpers.kaytto_loki, {table: "kaytto_loki"});
        const saveLokiData = connection.pgp.helpers.insert(kayttoLokiData, kayttoLokiColumns) + "RETURNING id";
        const klId = await connection.db.one(saveLokiData);
        return klId;
    }

    public async postPersonTableAuditData(headers: IncomingHttpHeaders, personid: number, method: string, table: string, inputData: any) {

        const user: UserObject["perustiedot"] = await authService.getUserData(headers);
        const uid = headers["shib-uid"];

        if (!user || !uid) {
            throw Error("No user data available");
        }

        const kayttoLokiData = {
            "name": user.nimi,
            "uid": uid,
            "person": personid,
            "organization": user.organisaatio,
            "itable": table,
            "action": method,
            "data": JSON.stringify(inputData)
        };

        const kayttoLokiColumns = new connection.pgp.helpers.ColumnSet(dbHelpers.person_kaytto_loki, {table: "person_kaytto_loki"});
        const saveLokiData = connection.pgp.helpers.insert(kayttoLokiData, kayttoLokiColumns) + "RETURNING id";
        const id = await connection.db.one(saveLokiData);
        console.log(id);
    }

}

export const auditLog = new AuditLog();
