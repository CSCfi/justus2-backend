import { IncomingHttpHeaders } from "http";
import { auditLog } from "../services/auditLogService";
import { julkaisuArkistoQueries as julkaisuArkisto } from "./julkaisuArkistoQueries";

// Database connection from db.ts
const con = require("./../db");

const oh = require("./../objecthandlers");
const dbFields = require("../types/DatabaseFields");

class JulkaisuQueries {

    // First all SELECT queries

    getIssn = async (julkaisuid: any) => {
        const query = "SELECT issn FROM julkaisu_issn WHERE julkaisuid =  " + julkaisuid + ";";
        let result = await con.db.any(query);
        if (result.length < 1) {
            return [""];
        } else {
            result = oh.mapIssnAndIsbn("issn", result);
            return result;
        }
    }

    getIsbn = async (julkaisuid: any) => {
        const query = "SELECT isbn FROM julkaisu_isbn WHERE julkaisuid =  " + julkaisuid + ";";
        let result = await con.db.any(query);
        if (result.length < 1) {
            return [""];
        } else {
            result = oh.mapIssnAndIsbn("isbn", result);
            return result;
        }
    }

    getProjektinumero = async (julkaisuid: any) => {
        const query = "SELECT projektinumero FROM julkaisu_projektinumero WHERE julkaisuid =  " + julkaisuid + ";";
        let result = await con.db.any(query);
        if (result.length < 1) {
            return [""];
        } else {
            result = oh.mapIssnAndIsbn("projektinumero", result);
            return result;
        }
    }

    getOrganisaatiotekija = async (julkaisuid: any) => {
        let result = await this.getOrgTekijatAndAlayksikko(julkaisuid);
        result = oh.mapOrganisaatiotekijaAndAlayksikko(result);
        return result;
    }

    getTieteenala = async (julkaisuid: any)  => {
        const query = "SELECT jnro, tieteenalakoodi  FROM tieteenala WHERE julkaisuid =  " + julkaisuid + ";";
        let result = await con.db.any(query);
        result = oh.checkIfEmpty(result);
        return result;
    }

    getTaiteenala = async (julkaisuid: any) => {
        const query = "SELECT jnro, taiteenalakoodi  FROM taiteenala WHERE julkaisuid =  " + julkaisuid + ";";
        let result = await con.db.any(query);
        result = oh.checkIfEmpty(result);
        return result;
    }

    getTyyppikategoria = async (julkaisuid: any) => {
        const query = "SELECT tyyppikategoria FROM taidealantyyppikategoria WHERE julkaisuid =  " + julkaisuid + ";";
        let result = await con.db.any(query);
        result = oh.mapTaideAlanTyyppikategoria(result);
        return result;
    }

    getAvainsana = async (julkaisuid: any) => {
        const query = "SELECT avainsana FROM avainsana WHERE julkaisuid =  " + julkaisuid + ";";
        let result = await con.db.any(query);
        result = oh.mapAvainsanat(result);
        return result;
    }

    getLisatieto = async (julkaisuid: any) => {
        const query = "SELECT lisatietotyyppi, lisatietoteksti FROM lisatieto WHERE julkaisuid =  " + julkaisuid + ";";
        let result = await con.db.any(query);
        result = oh.mapLisatietoData(result);
        return result;
    }

    getOrgTekijatAndAlayksikko = async (id: any)  => {
        return con.db.task((t: any) => {
            return t.map("SELECT id, etunimet, sukunimi, orcid, hrnumero, rooli FROM organisaatiotekija WHERE julkaisuid=$1", id, (orgtekija: any) => {
                return t.any("SELECT alayksikko FROM alayksikko WHERE organisaatiotekijaid=$1", orgtekija.id)
                    .then((res: any) => {
                        orgtekija.tempalayksikko = res;
                        return orgtekija;
                    });
            }).then(t.batch);
        });
    }

    // INSERT queries, used both in update and post requests:

    insertIssnAndIsbn = async(julkaisu: any, jid: any, headers: IncomingHttpHeaders, identifier: any) => {

        const obj: any = [];

        // if value is empty string return
        if (!julkaisu[identifier] || !julkaisu[identifier][0] || julkaisu[identifier][0] === "") {
            return;
        }

        for (let i = 0; i < julkaisu[identifier].length; i++) {
            if (julkaisu[identifier][i] !== "") {
                obj.push({"julkaisuid": jid, [identifier]: julkaisu[identifier][i]});
            }
        }

        const table = "julkaisu_" + identifier;
        const columns = new con.pgp.helpers.ColumnSet(["julkaisuid", identifier], {table: table});
        const save = con.pgp.helpers.insert(obj, columns) + " RETURNING id";
        await con.db.many(save);

        await auditLog.postAuditData(headers, "POST", table, jid, obj);

    }

    insertProjektinumero = async(julkaisu: any, jid: any, headers: IncomingHttpHeaders) => {

        const projektinumeroObj: any = [];

        if (!julkaisu["projektinumero"]) {
            return;
        }

        for (let i = 0; i < julkaisu["projektinumero"].length; i++) {
            if (julkaisu["projektinumero"][i] !== "") {
                projektinumeroObj.push({"julkaisuid": jid, "projektinumero": julkaisu["projektinumero"][i]});
            }
        }
        const columns = new con.pgp.helpers.ColumnSet(["julkaisuid", "projektinumero"], {table: "julkaisu_projektinumero"});
        const save = con.pgp.helpers.insert(projektinumeroObj, columns) + " RETURNING id";
        await con.db.many(save);

        await auditLog.postAuditData(headers, "POST", "julkaisu_projektinumero", jid, projektinumeroObj);

    }

    insertTieteenala = async(obj: any, jid: any, headers: IncomingHttpHeaders) => {

        const tieteenalaObj = dbFields.addJulkaisuIdToObject(obj, jid);
        const tieteenalaColumns = new con.pgp.helpers.ColumnSet(dbFields.tieteenala, {table: "tieteenala"});
        const saveTieteenala = con.pgp.helpers.insert(tieteenalaObj, tieteenalaColumns) + " RETURNING id";
        await con.db.many(saveTieteenala);
        await auditLog.postAuditData(headers, "POST", "tieteenala", jid, tieteenalaObj);
    }

    insertTaiteenala = async(obj: any, jid: any, headers: IncomingHttpHeaders) => {

        if (!obj || obj.length < 1) {
            return Promise.resolve(true);
        }

        const taiteenalaObj = dbFields.addJulkaisuIdToObject(obj, jid);
        const tieteenalaColumns = new con.pgp.helpers.ColumnSet(dbFields.taiteenala, {table: "taiteenala"});
        const saveTaiteenala = con.pgp.helpers.insert(taiteenalaObj, tieteenalaColumns) + " RETURNING id";
        await con.db.many(saveTaiteenala);
        await auditLog.postAuditData(headers, "POST", "taiteenala", jid, taiteenalaObj);

    }

    insertAvainsanat = async(obj: any, jid: any, headers: any) => {

        if (!obj || obj.length < 1) {
            return Promise.resolve(true);
        }

        const avainsanaObj = dbFields.constructObject(obj, jid, "avainsana");
        const avainsanatColumns = new con.pgp.helpers.ColumnSet(["julkaisuid", "avainsana"], {table: "avainsana"});
        const saveAvainsanat = con.pgp.helpers.insert(avainsanaObj, avainsanatColumns) + " RETURNING id";

        await con.db.many(saveAvainsanat);
        await auditLog.postAuditData(headers, "POST", "avainsana", jid, avainsanaObj);

    }

    insertTyyppikategoria = async(obj: any, jid: any, headers: IncomingHttpHeaders) => {

        if (!obj || obj.length < 1) {
            return Promise.resolve(true);
        }

        const tyyppikategoriaObj = dbFields.constructObject(obj, jid, "tyyppikategoria");
        const tyyppikategoriaColumns = new con.pgp.helpers.ColumnSet(["julkaisuid", "tyyppikategoria"], {table: "taidealantyyppikategoria"});
        const saveTyyppikategoria = con.pgp.helpers.insert(tyyppikategoriaObj, tyyppikategoriaColumns) + " RETURNING id";

        await con.db.many(saveTyyppikategoria);
        await auditLog.postAuditData(headers, "POST", "taidealantyyppikategoria", jid, tyyppikategoriaObj);

    }

    insertLisatieto = async(obj: any, jid: any, headers: IncomingHttpHeaders) => {

        if (!obj || obj.length < 1) {
            return Promise.resolve(true);
        }

        const temp = obj;
        const lisatietoObj: any = [];

        Object.keys(temp).forEach(function (val, key) {
            if (typeof lisatietoObj[key] === "undefined") {
                lisatietoObj[key] = {"julkaisuid": "", "lisatietotyyppi": "", "lisatietoteksti": ""};
            }
            lisatietoObj[key].julkaisuid = jid;
            lisatietoObj[key].lisatietotyyppi = val;
            lisatietoObj[key].lisatietoteksti = temp[val];
        });

        const lisatietoColumns = new con.pgp.helpers.ColumnSet(["julkaisuid", "lisatietotyyppi", "lisatietoteksti"], {table: "lisatieto"});
        const saveLisatieto = con.pgp.helpers.insert(lisatietoObj, lisatietoColumns) + " RETURNING id";

        await con.db.many(saveLisatieto);
        await auditLog.postAuditData(headers, "POST", "lisatieto", jid, lisatietoObj);
    }


    insertOrganisaatiotekijaAndAlayksikko = async(obj: any, jid: any, headers: IncomingHttpHeaders) => {

        const orgTekijaObj = dbFields.addJulkaisuIdToObject(obj, jid);

        console.log("Saving organisaatiotekija data for id: " + jid);
        const organisaatiotekijaColumns = new con.pgp.helpers.ColumnSet(dbFields.organisaatiotekija, {table: "organisaatiotekija"});
        const saveOrganisaatiotekija = con.pgp.helpers.insert(orgTekijaObj, organisaatiotekijaColumns) + " RETURNING id";

        console.log(saveOrganisaatiotekija);

        const orgid = await con.db.many(saveOrganisaatiotekija);
        console.log("Saved organisaatiotekija data for publication " + jid);

        const kayttolokiObj = JSON.parse(JSON.stringify(orgTekijaObj));

        Object.keys(kayttolokiObj).forEach(function (val, key) {
            delete kayttolokiObj[key].alayksikko;
            delete kayttolokiObj[key].id;
        });

        await auditLog.postAuditData(headers, "POST", "organisaatiotekija", jid, kayttolokiObj);

        if (!obj[0].alayksikko[0]) {
            return Promise.resolve(true);
        }

        const alayksikkoObj = [];
        for (let i = 0; i < orgid.length; i++) {
            for (let j = 0; j < obj[i].alayksikko.length; j++) {
                alayksikkoObj.push({"alayksikko": obj[i].alayksikko[j], "organisaatiotekijaid": orgid[i].id});
            }
        }

        console.log("Saving alayksikko data for publication: " + jid);

        const alayksikkoColumns = new con.pgp.helpers.ColumnSet(["organisaatiotekijaid", "alayksikko"], {table: "alayksikko"});
        const saveAlayksikko = con.pgp.helpers.insert(alayksikkoObj, alayksikkoColumns) + " RETURNING id";

        console.log(saveAlayksikko);

        await con.db.any(saveAlayksikko);
        await auditLog.postAuditData(headers, "POST", "alayksikko", jid, alayksikkoObj);

        console.log("Organisaatiotekija and alayksikko data saved for puplication: " + jid);
    }

    updateArchiveTable = async(data: any, headers: IncomingHttpHeaders, id: any) => {

        const obj: any = {};

        let updateColumns: any = [];

        if (!data.embargo || data.embargo === "") {
            obj["embargo"] = undefined;
        } else {
            obj["embargo"] = data.embargo;
        }

        if (!data.abstract || data.abstract === "") {
            obj["abstract"] = undefined;
        } else {
            obj["abstract"] = data.abstract;
        }

        if (!data.oikeudet || data.oikeudet === "") {
            obj["oikeudet"] = undefined;
        } else {
            obj["oikeudet"] = data.oikeudet;
        }

        if (!data.versio || data.versio === "") {
            obj["versio"] = undefined;
        } else {
            obj["versio"] = data.versio;
        }

        if (!data.julkaisusarja || data.julkaisusarja === "") {
            obj["julkaisusarja"] = undefined;
        } else {
            obj["julkaisusarja"] = data.julkaisusarja;
        }

        const jukuriPublication: boolean = await julkaisuArkisto.isJukuriPublication(id);

        let table;
        if (jukuriPublication) {
            const jukuriUpdateColumns = updateColumns.slice();
            jukuriUpdateColumns.push("urn");
            obj["urn"] = data.urn;
            table = new pgp.helpers.ColumnSet(jukuriUpdateColumns, {table: "julkaisuarkisto"});

        } else {
            updateColumns = dbFields.julkaisuarkistoUpdateFields;
            table = new con.pgp.helpers.ColumnSet(updateColumns, {table: "julkaisuarkisto"});
        }

        const query = con.pgp.helpers.update(obj, table) + " WHERE julkaisuid = " + parseInt(data.julkaisuid);
        await con.db.none(query);

        // update kaytto_loki table
        await auditLog.postAuditData(headers, "PUT", "julkaisuarkisto", data.julkaisuid, obj);

    }

}

export const julkaisuQueries = new JulkaisuQueries();
