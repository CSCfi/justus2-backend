import { Request, Response, NextFunction } from "express";

const kp = require("./../koodistopalvelu");
const oh = require("./../objecthandlers");

// Database connection from db.ts
const connection = require("./../db");
const pgp = connection.pgp;
const db = connection.db;

const dbHelpers = require("./../databaseHelpers");

const authService = require("./../services/authService");
const fileUpload = require("./../queries/fileUpload");

// Import audit log class
import { auditLog as auditLog } from "./../services/auditLogService";

let USER_DATA: any = {};


// Add Query functions here and define them in the module.exports at the end
// All GET requests first


function getUser(req: Request, res: Response, next: NextFunction) {

    const userData = authService.getUserData(req.headers);

    if (!userData) {
        return res.status(401).send("Unauthorized");
    }
    else {
        userData.kieli = req.session.language;
        oh.ObjectHandlerUser(userData, req.session.language, function(result: any) {
            res.status(200).json(
                result
            );
        });
    }
}


// Get all julkaisut
async function getJulkaisut(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;
    const hasOrganisation = await authService.hasOrganisation(USER_DATA);
    const isAdmin = await authService.isAdmin(USER_DATA);

    if (hasOrganisation && isAdmin) {
        const organisationCode =  USER_DATA.organisaatio;
        try {

            const julkaisuTableFields = dbHelpers.getTableFields("julkaisu");
            let query;
            let params = { };

            if (organisationCode === "00000") {
                query = "SELECT julkaisu.id, " +  julkaisuTableFields + " FROM julkaisu ORDER BY julkaisu.id;";
            } else {
                params = {"code": organisationCode};
                query = "SELECT julkaisu.id, " +  julkaisuTableFields + " FROM julkaisu WHERE organisaatiotunnus = " +
                    "${code} ORDER BY julkaisu.id;";
            }

            const julkaisudata = await db.any(query, params);
            const temp = oh.ObjectHandlerJulkaisudata(julkaisudata);
            const data  = await getAllData(temp);

            res.status(200).json({ data });

        } catch (err) {
            console.log(err);
            res.sendStatus(500);
        }

    } else {
        return res.status(403).send("Permission denied");
    }

}


function getJulkaisutmin(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;

    if (!req.session.userData) {
        return res.status(403).send("Permission denied");
    }

    const hasOrganisation = authService.hasOrganisation(USER_DATA);

    if (hasOrganisation) {

        const julkaisuTableFields = dbHelpers.getListFields("julkaisu");
        let query;

        // owners can see all data in julkaisu table
        const queryAllOrganisations = "SELECT julkaisu.id, " + julkaisuTableFields + " FROM julkaisu ORDER BY julkaisu.id;";

        // admins can see all publications for organisation
        const queryByOrganisationCode = "SELECT julkaisu.id, " + julkaisuTableFields + " FROM julkaisu WHERE organisaatiotunnus = " +
            "${code} ORDER BY julkaisu.id;";

        // members can only see own publications, so ensure that uid in kaytto_loki table matches current users uid
        const queryForMembers = "SELECT julkaisu.id, julkaisu.accessid, " + julkaisuTableFields + " FROM julkaisu" +
            " INNER JOIN kaytto_loki AS kl on julkaisu.accessid = kl.id" +
            " WHERE organisaatiotunnus = ${code} AND kl.uid = ${uid}"  +
            " ORDER BY julkaisu.id;";

        let params = {};

        // user 00000 can fetch data from all organisations or filter by organisation
        if (USER_DATA.rooli === "owner" && USER_DATA.organisaatio === "00000") {
            query = queryAllOrganisations;
            if (req.params.organisaatiotunnus) {
                params = {"code": req.params.organisaatiotunnus};
                query = queryByOrganisationCode;
            }
        }
        if (USER_DATA.rooli === "admin") {
            params = {"code": USER_DATA.organisaatio};
            query = queryByOrganisationCode;
        }
        if (USER_DATA.rooli === "member") {
            console.log("rooli on member");
            params = {"code": USER_DATA.organisaatio, "uid": USER_DATA.uid};
            query = queryForMembers;
        }

        db.any(query, params)
            .then((response: any) => {
                const data = oh.ObjectHandlerJulkaisudata(response);
                res.status(200).json({data});
            })
            .catch((err: any) => {
                return next(err);
            });
    } else {
        return res.status(403).send("Permission denied");
    }



}

// Get data from all tables by julkaisuid
async function getAllPublicationDataById(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;
    const hasOrganisation = await authService.hasOrganisation(USER_DATA);
    const hasAccessToPublication = await authService.hasAccessToPublication(USER_DATA, req.params.id);

    if (hasOrganisation && hasAccessToPublication) {
        const julkaisuTableFields = dbHelpers.getTableFields("julkaisu");

        let params;
        let query;

        params = {"id": req.params.id};
        query = "SELECT julkaisu.id, " + julkaisuTableFields + " FROM julkaisu WHERE id = " +
            "${id};";

        const data: any = {};

        try {
            data["julkaisu"] = await db.one(query, params);
            data["julkaisu"]["issn"] = await getIssn(req.params.id);
            data["julkaisu"]["isbn"] = await getIsbn(req.params.id);
            data["tieteenala"] = await getTieteenala(req.params.id);
            data["taiteenala"] = await getTaiteenala(req.params.id);
            data["taidealantyyppikategoria"] = await getTyyppikategoria(req.params.id);
            data["avainsanat"] = await getAvainsana(req.params.id);
            data["lisatieto"] = await getLisatieto(req.params.id);
            data["organisaatiotekija"] = await getOrganisaatiotekija(req.params.id);

            res.status(200).json({"data": data});

        } catch (err) {
            console.log(err);
        }
    } else {
        return res.status(403).send("Permission denied");
    }

}

function testvirta(res: Response) {
    kp.HTTPGETshow("https://virta-jtp.csc.fi/api/julkaisut/haku?julkaisunNimi=explicit", res, oh.ObjectHandlerTestVirta);
}





// POST requests
// Post a julkaisu to the database
// Catch the JSON body and parse it so that we can insert the values into postgres
async function postJulkaisu(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;
    const hasAccess = await authService.hasOrganisation(USER_DATA);

    if (hasAccess) {
        const method = "POST";

        const julkaisuColumns = new pgp.helpers.ColumnSet(dbHelpers.julkaisu, {table: "julkaisu"});
        const saveJulkaisu = pgp.helpers.insert(req.body.julkaisu, julkaisuColumns) + "RETURNING id";

        // begin transaction
        await db.any("BEGIN");

        try {

            // Queries. First insert julkaisu  data and data to kaytto_loki table. Then update accessid and execute other queries
            const julkaisuId = await db.one(saveJulkaisu);

            const kayttoLokiId = await auditLog.postAuditData(req.headers,
                method, "julkaisu", julkaisuId.id, req.body.julkaisu);

            const idColumn = new pgp.helpers.ColumnSet(["accessid"], {table: "julkaisu"});
            const insertAccessId = pgp.helpers.update({ "accessid": kayttoLokiId.id }, idColumn) + "WHERE id = " +  parseInt(julkaisuId.id) + "RETURNING accessid";

            await db.one(insertAccessId);

            await insertIssnAndIsbn(req.body.julkaisu, julkaisuId.id, req.headers, "issn");
            await insertIssnAndIsbn(req.body.julkaisu, julkaisuId.id, req.headers, "isbn");
            await insertOrganisaatiotekijaAndAlayksikko(req.body.organisaatiotekija, julkaisuId.id, req.headers);
            await insertTieteenala(req.body.tieteenala, julkaisuId.id, req.headers);
            await insertTaiteenala(req.body.taiteenala, julkaisuId.id, req.headers);
            await insertAvainsanat(req.body.avainsanat, julkaisuId.id, req.headers);
            await insertTyyppikategoria(req.body.taidealantyyppikategoria, julkaisuId.id, req.headers);
            await insertLisatieto(req.body.lisatieto, julkaisuId.id, req.headers);

            await db.any("COMMIT");

            res.status(200).json({ "id":  julkaisuId.id });

        } catch (err) {
            await db.any("ROLLBACK");
            res.sendStatus(500);
            console.log(err);
        }
    } else {
        return res.status(403).send("Permission denied");
    }

}

function postLanguage(req: Request, res: Response) {

    if (req.body.lang === "EN" || req.body.lang === "SV" || req.body.lang === "FI") {
        // req.session.language = {};
        const lang = req.body.lang;
        console.log("Before post " + JSON.stringify(req.session.language));
        req.session.language = lang;
        console.log("The new language according to req session = " + req.session.language);
        console.log("The JSONSTRINGIFIED session " + JSON.stringify(req.session));
        res.status(200).send("Language switched to " + req.session.language);
    }
    else {
        res.status(400).send("Wrong lang parameter posted");
    }
}

// PUT requests
async function updateJulkaisu(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;
    const hasAccessToPublication = await authService.hasAccessToPublication(USER_DATA, req.params.id);

    if (hasAccessToPublication) {
        const julkaisuColumns = new pgp.helpers.ColumnSet(dbHelpers.julkaisu, {table: "julkaisu"});
        const updateJulkaisu = pgp.helpers.update(req.body.julkaisu, julkaisuColumns) + "WHERE id = " +  parseInt(req.params.id);

        // begin transaction
        await db.any("BEGIN");

        try {

            const julkaisu = await db.none(updateJulkaisu);

            await auditLog.postAuditData(req.headers, "PUT", "julkaisu", req.params.id, req.body.julkaisu);

            const deletedIssnRows = await db.result("DELETE FROM julkaisu_issn WHERE julkaisuid = ${id}", {
                id: req.params.id
            });

            if (deletedIssnRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "julkaisu_issn", req.params.id, [undefined]);
            }

            await insertIssnAndIsbn(req.body.julkaisu, req.params.id, req.headers, "issn");

            const deletedIsbnRows = await db.result("DELETE FROM julkaisu_isbn WHERE julkaisuid = ${id}", {
                id: req.params.id
            });

            if (deletedIsbnRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "julkaisu_isbn", req.params.id, [undefined]);
            }

            await insertIssnAndIsbn(req.body.julkaisu, req.params.id, req.headers, "isbn");

            const deletedOrganisaatiotekijaRows = await db.result("DELETE FROM organisaatiotekija WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedOrganisaatiotekijaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "organisaatiotekija", req.params.id, [undefined]);
            }

            await insertOrganisaatiotekijaAndAlayksikko(req.body.organisaatiotekija, req.params.id, req.headers);

            const deletedTieteenalaRows = await db.result("DELETE FROM tieteenala WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedTieteenalaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "tieteenala", req.params.id, [undefined]);
            }
            await insertTieteenala(req.body.tieteenala, req.params.id, req.headers);

            const deletedTaiteenalaRows =  await db.result("DELETE FROM taiteenala WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedTaiteenalaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "taiteenala", req.params.id, [undefined]);
            }
            await insertTaiteenala(req.body.taiteenala, req.params.id, req.headers);

            const deletedAvainsanaRows = await db.result("DELETE FROM avainsana WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedAvainsanaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "avainsana", req.params.id, [undefined]);
            }
            await insertAvainsanat(req.body.avainsanat, req.params.id, req.headers);

            const deletedTyyppikategoriaRows = await db.result("DELETE FROM taidealantyyppikategoria WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedTyyppikategoriaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "taidealantyyppikategoria", req.params.id, [undefined]);
            }
            await insertTyyppikategoria(req.body.taidealantyyppikategoria, req.params.id, req.headers);

            const deletedLisatietoRows = await db.result("DELETE FROM lisatieto WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedLisatietoRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "taidealantyyppikategoria", req.params.id, [undefined]);
            }
            await insertLisatieto(req.body.lisatieto, req.params.id, req.headers);

            // TODO: check if publication is entered to justus service
            // const isPublication = await fileUpload.fileHasBeenUploadedToJustus(req.params.id);
            // const isPublicationInTheseus = await fileUpload.isPublicationInTheseus(req.params.id);

            // if publication file is originally uploaded to Justus service,
            // and file is already transferred to Theseus
            // we have to update data to Theseus also
            // if (isPublication && isPublicationInTheseus) {
            //     // TODO: update data to Theseus
            // }

            await db.any("COMMIT");
            return res.sendStatus(200);


        } catch (err) {
            // if error exists in any query, rollback
            console.log(err);
            await db.any("ROLLBACK");
            // res.sendStatus(500);
            return res.status(500).send("Could not update publication");
        }
    } else {
        return res.status(403).send("Permission denied");
    }



}

async function putJulkaisuntila(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;

    const isAdmin = await authService.isAdmin(USER_DATA);
    const hasAccessToPublication = await authService.hasAccessToPublication(USER_DATA, req.params.id);

    if (isAdmin && hasAccessToPublication) {
        const julkaisuColumns = new pgp.helpers.ColumnSet(["julkaisuntila", "modified", "username"], {table: "julkaisu"});
        const updateJulkaisuntila = pgp.helpers.update(req.body, julkaisuColumns) + "WHERE id = " +  parseInt(req.params.id) + "RETURNING id";

        return db.one(updateJulkaisuntila)
            .then((response: any) => {
                return res.sendStatus(200);
            }).catch(function (err: any) {
                console.log(err);
            });
    } else {
        return res.status(403).send("Permission denied");
    }

}

async function getIssn(julkaisuid: any) {
    const query = "SELECT issn FROM julkaisu_issn WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await db.any(query);
    if (result.length < 1) {
        return [""];
    } else {
        result = oh.mapIssnAndIsbn("issn", result);
        console.log(result);
        return result;
    }
}

async function getIsbn(julkaisuid: any) {
    const query = "SELECT isbn FROM julkaisu_isbn WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await db.any(query);
    if (result.length < 1) {
        return [""];
    } else {
        result = oh.mapIssnAndIsbn("isbn", result);
        return result;
    }
}

async function getOrganisaatiotekija(julkaisuid: any) {
    let result = await getOrgTekijatAndAlayksikko(julkaisuid);
    result = oh.mapOrganisaatiotekijaAndAlayksikko(result);
    return result;
}

async function getTieteenala(julkaisuid: any) {
    const query =  "SELECT jnro, tieteenalakoodi  FROM tieteenala WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await db.any(query);
    result = oh.checkIfEmpty(result);
    return result;
}

async function getTaiteenala(julkaisuid: any) {
    const query =  "SELECT jnro, taiteenalakoodi  FROM taiteenala WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await db.any(query);
    result = oh.checkIfEmpty(result);
    return result;
}

async function getTyyppikategoria(julkaisuid: any) {
    const query =  "SELECT tyyppikategoria FROM taidealantyyppikategoria WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await db.any(query);
    result = oh.mapTaideAlanTyyppikategoria(result);
    return result;
}

async function getAvainsana(julkaisuid: any) {
    const query =  "SELECT avainsana FROM avainsana WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await db.any(query);
    result = oh.mapAvainsanat(result);
    return result;
}

async function getLisatieto(julkaisuid: any) {
    const query = "SELECT lisatietotyyppi, lisatietoteksti FROM lisatieto WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await db.any(query);
    result = oh.mapLisatietoData(result);
    return result;
}

function getOrgTekijatAndAlayksikko(id: any) {
    return db.task((t: any) => {
        return t.map("SELECT id, etunimet, sukunimi, orcid, rooli FROM organisaatiotekija WHERE julkaisuid=$1", id, (orgtekija: any) => {
            return t.any("SELECT alayksikko FROM alayksikko WHERE organisaatiotekijaid=$1", orgtekija.id)
                .then((res: any) => {
                    orgtekija.tempalayksikko = res;
                    return orgtekija;
                });
        }).then(t.batch);
    });

}

async function getAllData(data: any) {
    for (let i = 0; i < data.length; i++) {
        data[i]["tieteenala"] = await getTieteenala(data[i].julkaisu.id);
        data[i]["tieteenala"] = await getTieteenala(data[i].julkaisu.id);
        data[i]["taiteenala"] = await getTaiteenala(data[i].julkaisu.id);
        data[i]["taidealantyyppikategoria"] = await getTyyppikategoria(data[i].julkaisu.id);
        data[i]["avainsanat"] = await getAvainsana(data[i].julkaisu.id);
        data[i]["lisatieto"] = await getLisatieto(data[i].julkaisu.id);
        data[i]["organisaatiotekija"] = await getOrganisaatiotekija(data[i].julkaisu.id);
    }
    return data;
}

// Insert functions, used both in update and post requests:
async function insertIssnAndIsbn(julkaisu: any, jid: any, headers: any, identifier: any) {

    const obj: any = [];

    // if value is empty string return
    if (!julkaisu[identifier] || !julkaisu[identifier][0] || julkaisu[identifier][0] === "" ) {
        return;
    }

    for (let i = 0; i < julkaisu[identifier].length; i++) {
        if (julkaisu[identifier][i] !== "") {
            obj.push({"julkaisuid": jid, [identifier]: julkaisu[identifier][i]});
        }
    }

    const table = "julkaisu_" + identifier;
    const columns = new pgp.helpers.ColumnSet(["julkaisuid", identifier], {table: table});
    const save = pgp.helpers.insert(obj, columns) + "RETURNING id";
    await db.many(save);

    await auditLog.postAuditData(headers, "POST", table, jid, obj);

}

async function insertTieteenala(obj: any, jid: any, headers: any) {

    const tieteenalaObj = dbHelpers.addJulkaisuIdToObject(obj, jid);
    const tieteenalaColumns = new pgp.helpers.ColumnSet(dbHelpers.tieteenala, {table: "tieteenala"});
    const saveTieteenala = pgp.helpers.insert(tieteenalaObj, tieteenalaColumns) + "RETURNING id";

    await db.many(saveTieteenala);
    await auditLog.postAuditData(headers, "POST", "tieteenala", jid, tieteenalaObj);
}

async function insertTaiteenala(obj: any, jid: any, headers: any) {

    if (!obj || obj.length < 1) { return Promise.resolve(true); }

    const taiteenalaObj =  dbHelpers.addJulkaisuIdToObject(obj, jid);
    const tieteenalaColumns = new pgp.helpers.ColumnSet(dbHelpers.taiteenala, {table: "taiteenala"});
    const saveTieteenala = pgp.helpers.insert(taiteenalaObj, tieteenalaColumns) + "RETURNING id";

    await db.many(saveTieteenala);
    await auditLog.postAuditData(headers, "POST", "taiteenala", jid, taiteenalaObj);

}

async function insertAvainsanat(obj: any, jid: any, headers: any) {

    if (!obj || obj.length < 1) { return Promise.resolve(true); }

    const avainsanaObj = dbHelpers.constructObject(obj, jid, "avainsana");
    const avainsanatColumns = new pgp.helpers.ColumnSet(["julkaisuid", "avainsana"], {table: "avainsana"});
    const saveAvainsanat = pgp.helpers.insert(avainsanaObj, avainsanatColumns) + "RETURNING id";

    await db.many(saveAvainsanat);
    await auditLog.postAuditData(headers, "POST", "avainsana", jid, avainsanaObj);

}
async function insertTyyppikategoria(obj: any, jid: any, headers: any) {

    if (!obj || obj.length < 1) { return Promise.resolve(true); }

    const tyyppikategoriaObj = dbHelpers.constructObject(obj, jid, "tyyppikategoria");
    const tyyppikategoriaColumns = new pgp.helpers.ColumnSet(["julkaisuid", "tyyppikategoria"], {table: "taidealantyyppikategoria"});
    const saveTyyppikategoria = pgp.helpers.insert(tyyppikategoriaObj, tyyppikategoriaColumns) + "RETURNING id";

    await db.many(saveTyyppikategoria);
    await auditLog.postAuditData(headers, "POST", "taidealantyyppikategoria", jid, tyyppikategoriaObj);


}

async function insertLisatieto(obj: any, jid: any, headers: any) {

    if (!obj || obj.length < 1) { return Promise.resolve(true); }

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

    const lisatietoColumns = new pgp.helpers.ColumnSet(["julkaisuid", "lisatietotyyppi", "lisatietoteksti"], {table: "lisatieto"});
    const saveLisatieto = pgp.helpers.insert(lisatietoObj, lisatietoColumns) + "RETURNING id";

    await db.many(saveLisatieto);
    await auditLog.postAuditData(headers, "POST", "lisatieto", jid, lisatietoObj);
}



async function insertOrganisaatiotekijaAndAlayksikko(obj: any, jid: any, headers: any) {

    const orgTekijaObj = dbHelpers.addJulkaisuIdToObject(obj, jid);

    const organisaatiotekijaColumns = new pgp.helpers.ColumnSet(dbHelpers.organisaatiotekija, {table: "organisaatiotekija"});
    const saveOrganisaatiotekija = pgp.helpers.insert(orgTekijaObj, organisaatiotekijaColumns) + "RETURNING id";

    const orgid = await db.many(saveOrganisaatiotekija);

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

    const alayksikkoColumns = new pgp.helpers.ColumnSet(["organisaatiotekijaid", "alayksikko"], {table: "alayksikko"});
    const saveAlayksikko = pgp.helpers.insert(alayksikkoObj, alayksikkoColumns) + "RETURNING id";

    await db.any(saveAlayksikko);
    await auditLog.postAuditData(headers, "POST", "alayksikko", jid, alayksikkoObj);
}



module.exports = {
    // GET requests
    getJulkaisut: getJulkaisut,
    getJulkaisutmin: getJulkaisutmin,
    getAllPublicationDataById: getAllPublicationDataById,
    getUser: getUser,
    // POST requests
    postJulkaisu: postJulkaisu,
    postLanguage: postLanguage,
    // PUT requests
    putJulkaisuntila: putJulkaisuntila,
    updateJulkaisu: updateJulkaisu

};