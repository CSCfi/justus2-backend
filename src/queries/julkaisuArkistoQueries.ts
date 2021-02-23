import { IncomingHttpHeaders } from "http";

import * as externalController from "../controllers/externalServices";
import { auditLog as auditLog } from "../services/auditLogService";

// Database connection
const connection = require("../db");
const dbFields = require("../types/DatabaseFields");

class JulkaisuArkistoQueries {

    removeJulkaisurinnakkaistallennettuValue = async (id: any) => {
        const table = new connection.pgp.helpers.ColumnSet(["julkaisurinnakkaistallennettu"], {table: "julkaisu"});
        const query = connection.pgp.helpers.update({"julkaisurinnakkaistallennettu": "0"}, table) + " WHERE id = " + parseInt(id);
        await connection.db.none(query);
    }

    postDataToArchiveTable = async (file: any, data: any, headers: IncomingHttpHeaders, julkaisuIdOrItemIdExists?: boolean) => {

        const tableColumns = dbFields.julkaisuarkisto;
        const obj: any = {};

        if (data.embargo && data.embargo !== "") {
            obj["embargo"] = data.embargo;
        } else {
            obj["embargo"] = undefined;
        }

        if (data.abstract && data.abstract !== "") {
            obj["abstract"] = data.abstract;
        } else {
            obj["abstract"] = undefined;
        }

        if (data.versio && data.versio !== "") {
            obj["versio"] = data.versio;
        } else {
            obj["versio"] = undefined;
        }

        if (data.oikeudet && data.oikeudet !== "") {
            obj["oikeudet"] = data.oikeudet;
        } else {
            obj["oikeudet"] = undefined;
        }

        if (data.julkaisusarja && data.julkaisusarja !== "") {
            obj["julkaisusarja"] = data.julkaisusarja;
        } else {
            obj["julkaisusarja"] = undefined;
        }

        obj["filename"] = file.originalname;
        obj["mimetype"] = file.mimetype;
        obj["julkaisuid"] = data.julkaisuid;

        if (!data.urn) {
            const urn = await externalController.getUrnData();
            obj["urn"] = urn;
        } else {
            obj["urn"] = data.urn;
        }

        let query;
        let method;
        const table = new connection.pgp.helpers.ColumnSet(tableColumns, {table: "julkaisuarkisto"});

        if (julkaisuIdOrItemIdExists) {
            obj["destination"] = "jukuri";
            query = connection.pgp.helpers.update(obj, table) + " WHERE julkaisuid = " + parseInt(data.julkaisuid);
            method = "PUT";
        } else {
            obj["destination"] = "theseus";
            query = connection.pgp.helpers.insert(obj, table) + " RETURNING id";
            method = "POST";
        }

        await connection.db.oneOrNone(query);
        // update kaytto_loki table
        await auditLog.postAuditData(headers, method, "julkaisuarkisto", data.julkaisuid, data);

    }

    postDataToQueueTable = async (julkaisuid: any) => {

        const tableColumns = new connection.pgp.helpers.ColumnSet(["julkaisuid"], {table: "julkaisujono"});
        const query = connection.pgp.helpers.insert({"julkaisuid": julkaisuid}, tableColumns) + " RETURNING id";
        await connection.db.one(query);

    }

    isJukuriPublication = async (id: any) => {
        const params = {"id": id};
        const query = "SELECT destination FROM julkaisuarkisto WHERE julkaisuid = " +
            "${id};";

        const data = await connection.db.oneOrNone(query, params);

        if (data.destination === "jukuri") {
            return true;
        } else {
            return false;
        }

    }

    fileHasBeenUploadedToJustus = async (id: any) => {

        console.log(id);
        const params = {"id": id};
        const query = "SELECT 1 FROM julkaisuarkisto WHERE julkaisuid = " +
            "${id};";

        const data = await connection.db.oneOrNone(query, params);

        return data;
    }

    metaDataAlreadyUpdated = async (id: any) => {
        const params = {"id": id};
        const query = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " +
            "${id};";

        const data = await connection.db.oneOrNone(query, params);
        return data;
    };

    isPublicationInTheseus = async (id: any) => {

        const params = {"id": id};
        const query = "SELECT handle FROM julkaisuarkisto WHERE julkaisuid = " +
            "${id};";

        const data = await connection.db.oneOrNone(query, params);

        if (data && data.handle) {
            console.log("Publication is in Theseus");
            return true;
        } else {
            console.log("Publication is not in Theseus");
            return false;
        }
    }

    isPublicationInQueue = async (id: any) => {

        const params = {"id": id};
        const query = "SELECT 1 FROM julkaisujono WHERE julkaisuid = " +
            "${id};";

        const data = await connection.db.oneOrNone(query, params);

        if (data) {
            return true;
        } else {
            return false;
        }
    }

    fetchJulkaisuIdFromArchiveTable = async (id: any) => {
        const params = {"id": id};
        const query = "SELECT 1 FROM julkaisuarkisto WHERE julkaisuid = " +
            "${id};";

        const data = await connection.db.oneOrNone(query, params);
        if (data) {
            return true;
        } else {
            return false;
        }

    }

}

export const julkaisuArkistoQueries = new JulkaisuArkistoQueries();