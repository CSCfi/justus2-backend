import { Request, Response, NextFunction } from "express";

const kp = require("./../koodistopalvelu");
const oh = require("./../objecthandlers");
const sq = require("./../queries/subQueries");

const organisationConfig = require("./../organization_config");
const domainMapping = organisationConfig.domainMappings;

// Database connection from db.ts
const connection = require("./../db");
const pgp = connection.pgp;
const db = connection.db;

const dbHelpers = require("./../databaseHelpers");

const authService = require("./../services/authService");
const fileUpload = require("./../queries/fileUpload");

// Import TheseusSender class
import { theseus as ts } from "./../services/TheseusSender";

// Import audit log class
import { auditLog as auditLog } from "./../services/auditLogService";

import { validate as validate } from "../services/ValidatorService";

import { JulkaisuObject } from "../models/Julkaisu";
import { Justus } from "../models/Justus";
import { FileData } from "../models/FileData";

const theseusHandleLink = process.env.THESEUS_HANDLE_LINK;
const jukuriHandleLink = process.env.JUKURI_HANDLE_LINK;

let USER_DATA: any = {};


// Add Query functions here and define them in the module.exports at the end
// All GET requests first

function getUser(req: Request, res: Response, next: NextFunction) {

    let userData;

    if (req.session.userData) {
        userData = req.session.userData;
        userData["showPublicationInput"] = <boolean> undefined;
        userData["jukuriUser"] = <boolean> undefined;
    } else {

        userData = authService.getUserData(req.headers);

        if (!userData || !userData.domain) {
            return res.status(401).send("Unauthorized");
        }

        req.session.userData = {};

        req.session["userData"].domain = userData.domain;
        req.session["userData"].organisaatio = userData.organisaatio;
        req.session["userData"].email = userData.email;
        req.session["userData"].seloste = userData.seloste;
        req.session["userData"].rooli = userData.rooli;
        req.session["userData"].nimi = userData.nimi;
        req.session["userData"].owner = userData.owner;
        req.session["userData"].ip = req.headers["x-forwarded-for"] || (req.connection && req.connection.remoteAddress) || "";
        req.session["userData"].uid = req.headers["shib-uid"];

    }

    if (!req.session.language) {
        req.session.language = "FI";
    }

    userData.kieli = req.session.language;
    oh.ObjectHandlerUser(userData, req.session.language, function(result: any) {
        res.status(200).json(
            result
        );
    });

}


// Get all julkaisut
async function getJulkaisut(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;
    // USER_DATA = await authService.getUserData(req.headers);

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
            const temp = oh.ObjectHandlerJulkaisudata(julkaisudata, true);
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


async function getJulkaisutmin(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;
    // USER_DATA = await authService.getUserData(req.headers);

    if (!USER_DATA) {
        return res.status(403).send("Permission denied");
    }

    const hasOrganisation = await authService.hasOrganisation(USER_DATA);

    if (hasOrganisation) {

        const julkaisuTableFields = dbHelpers.getListFields("j");
        let query;
        let queryCount;

        const currentPage = parseInt(req.query.currentPage.toString());
        const odottavat = req.query.odottavat;
        let showOnlyPublicationsWaitingForApprove;

        if (odottavat === "true") {
            showOnlyPublicationsWaitingForApprove = true;
        } else {
            showOnlyPublicationsWaitingForApprove = false;
        }

        const pageSize = 30;
        const offset = currentPage * pageSize - pageSize;

        let queryAllOrganisations;
        let queryByOrganisationCode;
        let queryForMembers;

        let queryCountForOwners;
        let queryCountForAdmins;
        let queryCountForMembers;

        const baseQuery =
            "SELECT j.id, " + julkaisuTableFields + ", a.handle, a.id AS aid" +
            " FROM julkaisu AS j" +
            " LEFT JOIN julkaisuarkisto AS a on j.id = a.julkaisuid";

        const baseQueryForCount =
            "SELECT count(*)" +
            " FROM julkaisu" +
            " WHERE julkaisuntila = ''";


        if (showOnlyPublicationsWaitingForApprove) {

            // owners can see all data in julkaisu table
            queryAllOrganisations = baseQuery +
                " WHERE j.julkaisuntila = '';";

            // admins can see all publications for organisation
            queryByOrganisationCode = baseQuery +
                " WHERE j.organisaatiotunnus = ${code}" +
                " AND j.julkaisuntila = ''" +
                " ORDER BY j.modified DESC;";

            // members can only see own publications, so verify that uid in kaytto_loki table matches current user's uid
            queryForMembers =
                "SELECT j.id, " + julkaisuTableFields + ", a.handle, a.id AS aid" +
                " FROM julkaisu AS j" +
                " INNER JOIN kaytto_loki AS kl on j.accessid = kl.id" +
                " LEFT JOIN julkaisuarkisto AS a on j.id = a.julkaisuid" +
                " WHERE organisaatiotunnus = ${code} AND kl.uid = ${uid}"  +
                " AND j.julkaisuntila = ''" +
                " ORDER BY j.modified DESC;";

            queryCountForOwners = baseQueryForCount + ";";

            queryCountForAdmins = baseQueryForCount +
                " AND organisaatiotunnus = ${code};";

            queryCountForMembers =
                "SELECT count(*)" +
                " FROM julkaisu" +
                " INNER JOIN kaytto_loki AS kl on accessid = kl.id" +
                " WHERE julkaisuntila = ''" +
                " AND organisaatiotunnus = ${code}" +
                " AND kl.uid = ${uid};";

        } else {
            queryAllOrganisations = baseQuery +
                " WHERE j.julkaisuntila <> ''" +
                " AND CAST(j.julkaisuntila AS INT) > -1" +
                " ORDER BY j.modified DESC" +
                " LIMIT " + pageSize + " OFFSET " + offset + ";";
            queryByOrganisationCode = baseQuery +
                " WHERE j.organisaatiotunnus = ${code}" +
                " AND j.julkaisuntila <> ''" +
                " AND CAST(j.julkaisuntila AS INT) > -1" +
                " ORDER BY j.modified DESC" +
                " LIMIT " + pageSize + " OFFSET " + offset + ";";


            queryForMembers =
                "SELECT j.id, " + julkaisuTableFields + ", a.handle, a.id AS aid" +
                " FROM julkaisu AS j" +
                " INNER JOIN kaytto_loki AS kl on j.accessid = kl.id" +
                " LEFT JOIN julkaisuarkisto AS a on j.id = a.julkaisuid" +
                " WHERE organisaatiotunnus = ${code} AND kl.uid = ${uid}"  +
                " AND j.julkaisuntila <> ''" +
                " AND CAST(j.julkaisuntila AS INT) > -1" +
                " ORDER BY j.modified DESC" +
                " LIMIT " + pageSize + " OFFSET " + offset + ";";

            queryCountForOwners = "SELECT count(*)" +
                " FROM julkaisu" +
                " WHERE julkaisuntila <> ''" +
                " AND CAST(julkaisuntila AS INT) > -1;";

            queryCountForAdmins = "SELECT count(*)" +
                " FROM julkaisu" +
                " WHERE organisaatiotunnus = ${code}" +
                " AND julkaisuntila <> ''" +
                " AND CAST(julkaisuntila AS INT) > -1;";

            queryCountForMembers =
                "SELECT count(*)" +
                " FROM julkaisu" +
                " INNER JOIN kaytto_loki AS kl on accessid = kl.id" +
                " WHERE organisaatiotunnus = ${code}" +
                " AND julkaisuntila <> ''" +
                " AND CAST(julkaisuntila AS INT) > -1" +
                " AND kl.uid = ${uid};";

        }
        let params = {};

        // user 00000 can fetch data from all organisations or filter by organisation
        if (USER_DATA.rooli === "owner" && USER_DATA.organisaatio === "00000") {
            query = queryAllOrganisations;
            queryCount = queryCountForOwners;
            if (req.params.organisaatiotunnus) {
                params = {"code": req.params.organisaatiotunnus};
                query = queryByOrganisationCode;
                queryCount = queryCountForAdmins;
            }
        }
        if (USER_DATA.rooli === "admin") {
            params = {"code": USER_DATA.organisaatio};
            query = queryByOrganisationCode;
            queryCount = queryCountForAdmins;
        }
        if (USER_DATA.rooli === "member") {
            params = {"code": USER_DATA.organisaatio, "uid": USER_DATA.uid};
            query = queryForMembers;
            queryCount = queryCountForMembers;
        }

        let count: any;
        count = await db.one(queryCount, params);

        db.any(query, params)
            .then((response: any) => {
                const data = oh.ObjectHandlerJulkaisudata(response, false);
                res.setHeader("Access-Control-Expose-Headers", "TotalCount");
                res.setHeader("TotalCount", count["count"]);
                res.status(200).json({data});
            })
            .catch((err: any) => {
                return next(err);
            });
    } else {
        return res.status(403).send("Permission denied");
    }

}

async function getJulkaisutHaku(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;
    // USER_DATA = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(USER_DATA);

    if (!USER_DATA || !hasOrganisation) {
        return res.status(403).send("Permission denied");
    }

    const julkaisuTableFields = dbHelpers.getListFields("j");

    const pageSize = 30;
    const currentPage = parseInt(req.query.currentPage.toString());
    const offset = currentPage * pageSize - pageSize;

    let idHaku: boolean = false;
    let nimiTekijaHaku: boolean = false;
    let vuosiHaku: boolean = false;
    let tilaHaku: boolean = false;

    let julkaisuId;
    let julkaisuntila;
    let nimiTekija;
    let julkaisuvuosi;

    // if search string is numeric, search is id search
    if (!isNaN(Number(req.query.nimiTekija)) && req.query.nimiTekija !== "") {
        julkaisuId = req.query.nimiTekija;
        idHaku = true;
    } else {
        if (req.query.nimiTekija && req.query.nimiTekija != "") {
            nimiTekija = req.query.nimiTekija.toString().toLowerCase();
            nimiTekijaHaku = true;
        }
        if (req.query.julkaisunTila && req.query.julkaisunTila != "") {
            julkaisuntila = req.query.julkaisunTila;
            tilaHaku = true;
        }
        if (req.query.julkaisuVuosi && req.query.julkaisuVuosi != "") {
            julkaisuvuosi = req.query.julkaisuVuosi;
            vuosiHaku = true;
        }
        if (!vuosiHaku && !tilaHaku && !nimiTekijaHaku && !idHaku) {
            return res.status(500).send("Empty search");
        }
    }

    // Fetch only fields which are needed in publication list, fetch also publication file related data
    const baseQuery =
        "SELECT j.id, " + julkaisuTableFields + ", a.handle, a.id AS aid" +
        " FROM julkaisu AS j" +
        " LEFT JOIN julkaisuarkisto AS a on j.id = a.julkaisuid";

    const idQuery = baseQuery +
        " WHERE j.id = ${id}";
    const idCount = "SELECT COUNT(*) FROM julkaisu WHERE id = ${id}";

    const nimiTekijaHakuQuery = baseQuery +
        " WHERE (LOWER(j.julkaisunnimi) LIKE '%" + nimiTekija + "%' OR LOWER(j.tekijat) LIKE '%" + nimiTekija + "%')";
    const nimiTekijaHakuCount = "SELECT COUNT(*) FROM julkaisu WHERE (LOWER(julkaisunnimi) LIKE '%" + nimiTekija + "%' OR LOWER(tekijat) LIKE '%" + nimiTekija + "%')";

    const tilaHakuQuery = baseQuery +
        " WHERE julkaisuntila = ${tila}";
    const tilaHakuCount = "SELECT COUNT(*) FROM julkaisu WHERE julkaisuntila = ${tila}";
    const tilaAndQuery = " AND julkaisuntila = ${tila}";

    const vuosiHakuQuery = baseQuery +
        " WHERE julkaisuvuosi = ${vuosi}";
    const vuosiHakuCount = "SELECT COUNT(*) FROM julkaisu WHERE julkaisuvuosi = ${vuosi}";
    const vuosiAndQuery = " AND julkaisuvuosi = ${vuosi}";

    const approved = " AND julkaisuntila <> ''";

    let params: any;
    let organisaatioHaku: boolean = true;

    params = {
        "id": julkaisuId,
        "tila": julkaisuntila,
        "nimiTekija": nimiTekija,
        "vuosi": julkaisuvuosi,
    };

    if (USER_DATA.rooli === "owner" && !req.params.organisaatiotunnus) {
        organisaatioHaku = false;
    }

    // verify that only owners can make parametrized queries
    if (USER_DATA.rooli === "owner" && req.params.organisaatiotunnus) {
        params["code"] = req.params.organisaatiotunnus;
    } else {
        params["code"] = USER_DATA.organisaatio;
    }

    let count: any;
    let countQuery;
    let hakuQuery;

    // member can only search for rejected publications
    if (USER_DATA.rooli === "member") {
        hakuQuery = "SELECT j.id, j.organisaatiotunnus,j.julkaisuvuosi,j.julkaisunnimi,j.tekijat,j.julkaisuntila,j.username,j.modified, a.handle, a.id AS aid" +
                    " FROM julkaisu AS j INNER JOIN kaytto_loki AS kl on j.accessid = kl.id LEFT JOIN julkaisuarkisto AS a on j.id = a.julkaisuid" +
                    " WHERE organisaatiotunnus = ${code} AND kl.uid = ${uid} AND j.julkaisuntila = '-1' ORDER BY j.modified DESC LIMIT " + pageSize + " OFFSET " + offset + ";";       
        countQuery = "SELECT count(*) FROM julkaisu INNER JOIN kaytto_loki AS kl on accessid = kl.id WHERE organisaatiotunnus = ${code} AND julkaisuntila = '-1' AND kl.uid = ${uid};";
        params["uid"] = USER_DATA.uid;
    } else {   

        if (idHaku) {
            hakuQuery = idQuery + approved + ";";
            countQuery =  idCount + approved + ";";
            if (organisaatioHaku) {
                hakuQuery = idQuery + approved + " AND organisaatiotunnus = ${code};";
                countQuery = idCount + approved + " AND organisaatiotunnus = ${code};";
            }
        }

        if (nimiTekijaHaku && !vuosiHaku && !tilaHaku) {
            hakuQuery = nimiTekijaHakuQuery + approved + " ORDER BY modified DESC LIMIT " + pageSize + " OFFSET " + offset + ";";
            countQuery = nimiTekijaHakuCount + approved + ";";
            if (organisaatioHaku) {
                hakuQuery = nimiTekijaHakuQuery + approved + " AND organisaatiotunnus = ${code}" +
                    " ORDER BY modified DESC LIMIT " + pageSize + " OFFSET " + offset + ";";
                countQuery = nimiTekijaHakuCount + approved + " AND organisaatiotunnus = ${code};";
            }
        }

        if (vuosiHaku && !nimiTekijaHaku && !tilaHaku) {
            hakuQuery = vuosiHakuQuery + approved + " ORDER BY modified DESC LIMIT " + pageSize + " OFFSET " + offset + ";";
            countQuery = vuosiHakuCount + approved + ";";
            if (organisaatioHaku) {
                hakuQuery = vuosiHakuQuery + approved + " AND organisaatiotunnus = ${code}" +
                    " ORDER BY modified DESC LIMIT " + pageSize + " OFFSET " + offset + ";";
                countQuery = vuosiHakuCount + approved + " AND organisaatiotunnus = ${code};";
            }
        }

        if (tilaHaku && !nimiTekijaHaku && !vuosiHaku) {
            hakuQuery = tilaHakuQuery +  " ORDER BY modified DESC" +
                " LIMIT " + pageSize + " OFFSET " + offset + ";";
            countQuery = tilaHakuCount + ";";
            if (organisaatioHaku) {
                hakuQuery = tilaHakuQuery + " AND organisaatiotunnus = ${code}" +
                    " ORDER BY modified DESC LIMIT " + pageSize + " OFFSET " + offset + ";";
                countQuery = tilaHakuCount + " AND organisaatiotunnus = ${code};";
            }
        }

        if (nimiTekijaHaku && vuosiHaku && !tilaHaku) {
            hakuQuery = nimiTekijaHakuQuery + vuosiAndQuery + approved + " ORDER BY modified DESC" +
                " LIMIT " + pageSize + " OFFSET " + offset + ";";
            countQuery = nimiTekijaHakuCount + vuosiAndQuery + approved + ";";
            if (organisaatioHaku) {
                hakuQuery = nimiTekijaHakuQuery + vuosiAndQuery + approved + " AND organisaatiotunnus = ${code}" +
                    " ORDER BY modified DESC LIMIT " + pageSize + " OFFSET " + offset + ";";
                countQuery = nimiTekijaHakuCount + vuosiAndQuery + approved + " AND organisaatiotunnus = ${code};";
            }
        }

        if (nimiTekijaHaku && !vuosiHaku && tilaHaku) {
            hakuQuery = nimiTekijaHakuQuery + tilaAndQuery + " ORDER BY modified DESC" +
                " LIMIT " + pageSize + " OFFSET " + offset + ";";
            countQuery = nimiTekijaHakuCount + tilaAndQuery + ";";
            if (organisaatioHaku) {
                hakuQuery = nimiTekijaHakuQuery + tilaAndQuery + " AND organisaatiotunnus = ${code} " +
                    " ORDER BY modified DESC LIMIT " + pageSize + " OFFSET " + offset + ";";
                countQuery = nimiTekijaHakuCount + tilaAndQuery + " AND organisaatiotunnus = ${code};";
            }
        }

        if (!nimiTekijaHaku && vuosiHaku && tilaHaku) {
            hakuQuery = tilaHakuQuery + vuosiAndQuery + " ORDER BY modified DESC" +
                " LIMIT " + pageSize + " OFFSET " + offset + ";";
            countQuery = tilaHakuCount + vuosiAndQuery + ";";
            if (organisaatioHaku) {
                hakuQuery = tilaHakuQuery + vuosiAndQuery + " AND organisaatiotunnus = ${code}" +
                    " ORDER BY modified DESC LIMIT " + pageSize + " OFFSET " + offset + ";";
                countQuery = tilaHakuCount + vuosiAndQuery + " AND organisaatiotunnus = ${code};";
            }
        }

        if (nimiTekijaHaku && vuosiHaku && tilaHaku) {
            hakuQuery = nimiTekijaHakuQuery + vuosiAndQuery + tilaAndQuery + " ORDER BY modified DESC" +
                " LIMIT " + pageSize + " OFFSET " + offset + ";";
            countQuery = nimiTekijaHakuCount + vuosiAndQuery + tilaAndQuery + ";";
            if (organisaatioHaku) {
                hakuQuery = nimiTekijaHakuQuery + vuosiAndQuery + tilaAndQuery + " AND organisaatiotunnus = ${code}" +
                    " ORDER BY modified DESC LIMIT " + pageSize + " OFFSET " + offset + ";";
                countQuery = nimiTekijaHakuCount + vuosiAndQuery + tilaAndQuery + " AND organisaatiotunnus = ${code};";
            }
        }
    }

    count = await db.one(countQuery, params);

    db.any(hakuQuery, params)
        .then((response: any) => {
            const data = oh.ObjectHandlerJulkaisudata(response, false);
            res.setHeader("Access-Control-Expose-Headers", "TotalCount");
            res.setHeader("TotalCount", count["count"]);
            res.status(200).json({data});
        })
        .catch((err: any) => {
            return next(err);
        });

}

// Get data from all tables by julkaisuid
async function getAllPublicationDataById(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;
    // USER_DATA = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(USER_DATA);
    const hasAccessToPublication = await authService.hasAccessToPublication(USER_DATA, req.params.id);

    if (hasOrganisation && hasAccessToPublication) {
        const julkaisuTableFields = dbHelpers.getTableFields("julkaisu");

        const arkistoTableFields = "urn,handle,filename," + dbHelpers.julkaisuarkistoUpdateFields.join(",");

        let params;
        let query;
        let fileQuery;

        params = {"id": req.params.id};
        query = "SELECT julkaisu.id, " + julkaisuTableFields + " FROM julkaisu WHERE id = " +
            "${id};";

        fileQuery = "SELECT " + arkistoTableFields + " FROM julkaisuarkisto WHERE julkaisuid = " +
            "${id};";

        const handleQuery = "SELECT  handle FROM julkaisuarkisto WHERE julkaisuid = " +
            "${id};";

        const publicationQueueQuery = "SELECT  id FROM julkaisujono WHERE julkaisuid = " +
            "${id};";

        const handleExists = await db.oneOrNone(handleQuery, params);
        const publicationIsInQueue = await db.oneOrNone(publicationQueueQuery, params);

        const data = <Justus>{};
        let filedata = <FileData>{};

        try {
            data["julkaisu"] = await db.one(query, params);
            data["julkaisu"]["issn"] = await sq.getIssn(req.params.id);
            data["julkaisu"]["isbn"] = await sq.getIsbn(req.params.id);
            data["julkaisu"]["projektinumero"] = await sq.getProjektinumero(req.params.id);
            data["tieteenala"] = await sq.getTieteenala(req.params.id);
            data["taiteenala"] = await sq.getTaiteenala(req.params.id);
            data["taidealantyyppikategoria"] = await sq.getTyyppikategoria(req.params.id);
            data["avainsanat"] = await sq.getAvainsana(req.params.id);
            data["lisatieto"] = await sq.getLisatieto(req.params.id);
            data["organisaatiotekija"] = await sq.getOrganisaatiotekija(req.params.id);

            if (handleExists || publicationIsInQueue) {
                filedata = await db.oneOrNone(fileQuery, params);
                data["filedata"] = filedata;
                const isJukuriPublication: boolean = oh.isJukuriPublication(data.julkaisu.organisaatiotunnus);
                const tempHandle = data["filedata"].handle;
                if (tempHandle) {
                    if (isJukuriPublication) {
                        data["filedata"].handle = jukuriHandleLink + tempHandle;
                    } else {
                        data["filedata"].handle = theseusHandleLink + tempHandle;
                    }
                } else {
                    data["filedata"].handle = "";
                }
            }
            res.status(200).json({"data": data});
        } catch (err) {
            console.log(err);
        }
    } else {
        return res.status(403).send("Permission denied");
    }

}

// POST requests
// Post a julkaisu to the database
// Catch the JSON body and parse it so that we can insert the values into postgres
async function postJulkaisu(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;
    // USER_DATA = await authService.getUserData(req.headers);

    if (!USER_DATA) {
        return res.status(403).send("Permission denied");
    }

    const hasAccess = await authService.hasOrganisation(USER_DATA);

    if (hasAccess) {
        const method = "POST";

        // begin transaction
        await db.any("BEGIN");

        try {

            const julkaisuObject: JulkaisuObject = req.body.julkaisu;
            const orgatekijaArray = req.body.organisaatiotekija;
            const tieteenalaArray = req.body.tieteenala;
            const taiteenalaArray = req.body.taiteenala;
            const avainsanaArray = req.body.avainsanat;
            const tyyppikategoriaArray = req.body.taidealantyyppikategoria;
            const lisatieto = req.body.lisatieto;

            const julkaisuValidated: JulkaisuObject =  await validate.julkaisu(julkaisuObject);
            await validate.organisaatiotekija(orgatekijaArray);
            await validate.tieteenala(tieteenalaArray);
            await validate.taiteenala(taiteenalaArray);
            await validate.avainsanat(avainsanaArray);
            await validate.tyyppikategoria(tyyppikategoriaArray);
            await validate.lisatieto(lisatieto);

            const julkaisuColumns = new pgp.helpers.ColumnSet(dbHelpers.julkaisu, {table: "julkaisu"});
            const saveJulkaisu = pgp.helpers.insert(julkaisuValidated, julkaisuColumns) + " RETURNING id";
            const julkaisuId = await db.one(saveJulkaisu);

            const kayttoLokiObject = JSON.parse(JSON.stringify(julkaisuValidated));
            delete kayttoLokiObject["issn"];
            delete kayttoLokiObject["isbn"];
            delete kayttoLokiObject["projektinumero"];

            const kayttoLokiId = await auditLog.postAuditData(req.headers,
                method, "julkaisu", julkaisuId.id, kayttoLokiObject);

            const idColumn = new pgp.helpers.ColumnSet(["accessid"], {table: "julkaisu"});
            const insertAccessId = pgp.helpers.update({ "accessid": kayttoLokiId.id }, idColumn) + "WHERE id = " +  parseInt(julkaisuId.id) + " RETURNING accessid";

            await db.one(insertAccessId);

            await insertIssnAndIsbn(julkaisuValidated, julkaisuId.id, req.headers, "issn");
            await insertIssnAndIsbn(julkaisuValidated, julkaisuId.id, req.headers, "isbn");
            await insertOrganisaatiotekijaAndAlayksikko(orgatekijaArray, julkaisuId.id, req.headers);
            await insertTieteenala(tieteenalaArray, julkaisuId.id, req.headers);
            await insertTaiteenala(taiteenalaArray, julkaisuId.id, req.headers);
            await insertAvainsanat(avainsanaArray, julkaisuId.id, req.headers);
            await insertTyyppikategoria(tyyppikategoriaArray, julkaisuId.id, req.headers);
            await insertLisatieto(lisatieto, julkaisuId.id, req.headers);
            await insertProjektinumero(julkaisuValidated, julkaisuId.id, req.headers);

            await db.any("COMMIT");

            // For Luonnonvarakeskus metadata is always sent to Jukuri
            const isJukuriPublication: boolean = oh.isJukuriPublication(req.body.julkaisu.organisaatiotunnus);

            if (isJukuriPublication) {
                await fileUpload.postDataToQueueTable(julkaisuId.id);

                const table = new connection.pgp.helpers.ColumnSet(["julkaisuid", "destination"], {table: "julkaisuarkisto"});
                const query = pgp.helpers.insert({"julkaisuid": julkaisuId.id, "destination": "jukuri"}, table) + " RETURNING id";

                await connection.db.one(query);

                // update kaytto_loki table
                await auditLog.postAuditData(req.headers, "POST", "julkaisuarkisto", julkaisuId.id, {"julkaisuid": julkaisuId.id, "destination": "jukuri"});
            }

            res.status(200).json({ "id":  julkaisuId.id });
            console.log("Succesfully saved julkaisu with id: " + julkaisuId.id);

        } catch (err) {
            console.log(err);
            console.log("Error in posting new publication with error code: " + err);
            await db.any("ROLLBACK");
            res.status(500).send(err.message);
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

function impersonateUser(req: Request, res: Response) {

    if (!req.session.userData || !req.session.userData.owner) {
        return res.status(403).send("Permission denied");
    }

    const organizationCode = req.body.organizationId;
    req.session.userData.organisaatio = req.body.organizationId;
    req.session.userData.rooli = req.body.role;

    Object.keys(domainMapping).forEach(function (val, key) {
        if (domainMapping[key].code === organizationCode) {
            req.session.userData.email = domainMapping[key].email;
            req.session.userData.seloste = domainMapping[key].seloste;
            if (!domainMapping[key].jukuriData) {
                req.session.userData.jukuriUser = undefined;
            }
        }
    });
    console.log(req.session.userData);

    oh.ObjectHandlerUser(req.session.userData, req.session.language, function(result: any) {
        res.status(200).json(
            result
        );
    });
}

// PUT requests
async function updateJulkaisu(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;
    // USER_DATA = await authService.getUserData(req.headers);

    const hasAccessToPublication = await authService.hasAccessToPublication(USER_DATA, req.params.id);

    if (hasAccessToPublication) {

        // begin transaction
        await db.any("BEGIN");

        try {
            const julkaisuObject = req.body.julkaisu;
            const orgatekijaArray = req.body.organisaatiotekija;
            const tieteenalaArray = req.body.tieteenala;
            const taiteenalaArray = req.body.taiteenala;
            const avainsanaArray = req.body.avainsanat;
            const tyyppikategoriaArray = req.body.taidealantyyppikategoria;
            const lisatieto = req.body.lisatieto;

            const julkaisuValidated: JulkaisuObject =  await validate.julkaisu(julkaisuObject);
            await validate.organisaatiotekija(orgatekijaArray);
            await validate.tieteenala(tieteenalaArray);
            await validate.taiteenala(taiteenalaArray);
            await validate.avainsanat(avainsanaArray);
            await validate.tyyppikategoria(tyyppikategoriaArray);
            await validate.lisatieto(lisatieto);

            const julkaisuColumns = new pgp.helpers.ColumnSet(dbHelpers.julkaisu, {table: "julkaisu"});

            const updateJulkaisu = pgp.helpers.update(julkaisuValidated, julkaisuColumns) + " WHERE id = " +  parseInt(req.params.id);

            await db.none(updateJulkaisu);

            const kayttoLokiObject = JSON.parse(JSON.stringify(julkaisuValidated));
            delete kayttoLokiObject["issn"];
            delete kayttoLokiObject["isbn"];
            delete kayttoLokiObject["projektinumero"];

            await auditLog.postAuditData(req.headers, "PUT", "julkaisu", req.params.id, kayttoLokiObject);

            const deletedIssnRows = await db.result("DELETE FROM julkaisu_issn WHERE julkaisuid = ${id}", {
                id: req.params.id
            });

            if (deletedIssnRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "julkaisu_issn", req.params.id, [undefined]);
            }

            await insertIssnAndIsbn(julkaisuValidated, req.params.id, req.headers, "issn");

            const deletedIsbnRows = await db.result("DELETE FROM julkaisu_isbn WHERE julkaisuid = ${id}", {
                id: req.params.id
            });

            if (deletedIsbnRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "julkaisu_isbn", req.params.id, [undefined]);
            }

            await insertIssnAndIsbn(julkaisuValidated, req.params.id, req.headers, "isbn");

            const deletedProjektinumeroRows = await db.result("DELETE FROM julkaisu_projektinumero WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedProjektinumeroRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "julkaisu_projektinumero", req.params.id, [undefined]);
            }
            await insertProjektinumero(julkaisuValidated, req.params.id, req.headers);

            const deletedOrganisaatiotekijaRows = await db.result("DELETE FROM organisaatiotekija WHERE julkaisuid = ${id}", {
                id: req.params.id
            });

            if (deletedOrganisaatiotekijaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "organisaatiotekija", req.params.id, [undefined]);
            }

            await insertOrganisaatiotekijaAndAlayksikko(orgatekijaArray, req.params.id, req.headers);

            const deletedTieteenalaRows = await db.result("DELETE FROM tieteenala WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedTieteenalaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "tieteenala", req.params.id, [undefined]);
            }
            await insertTieteenala(tieteenalaArray, req.params.id, req.headers);

            const deletedTaiteenalaRows =  await db.result("DELETE FROM taiteenala WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedTaiteenalaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "taiteenala", req.params.id, [undefined]);
            }
            await insertTaiteenala(taiteenalaArray, req.params.id, req.headers);

            const deletedAvainsanaRows = await db.result("DELETE FROM avainsana WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedAvainsanaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "avainsana", req.params.id, [undefined]);
            }
            await insertAvainsanat(avainsanaArray, req.params.id, req.headers);

            const deletedTyyppikategoriaRows = await db.result("DELETE FROM taidealantyyppikategoria WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedTyyppikategoriaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "taidealantyyppikategoria", req.params.id, [undefined]);
            }
            await insertTyyppikategoria(tyyppikategoriaArray, req.params.id, req.headers);

            const deletedLisatietoRows = await db.result("DELETE FROM lisatieto WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedLisatietoRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "taidealantyyppikategoria", req.params.id, [undefined]);
            }
            await insertLisatieto(lisatieto, req.params.id, req.headers);

            const isPublication = await fileUpload.fileHasBeenUploadedToJustus(req.params.id);
            const isPublicationInTheseus = await fileUpload.isPublicationInTheseus(req.params.id);

            // if publication file is originally uploaded to Justus service,
            // we have to update data in julkaisuarkisto table,
            // and if file is already transferred to Theseus / Jukuri
            // we have to update data there also

            const isFileUploaded = await ts.isFileUploaded(req.params.id);
            const orgid = req.body.julkaisu.organisaatiotunnus;

            if (isFileUploaded && isFileUploaded.filename) {
                await updateArchiveTable(req.body.filedata, req.headers, req.params.id);
                if (isPublicationInTheseus) {
                    const obj = await ts.mapTheseusFields(req.params.id, req.body, "put");
                    await ts.PutTheseus(obj, req.params.id, orgid);
                    await ts.EmbargoUpdate(req.params.id, req.body.filedata.embargo, orgid);
                }
            }

            if (isPublication && !isFileUploaded.filename) {
                if (isPublicationInTheseus) {
                    const obj = await ts.mapTheseusFields(req.params.id, req.body, "put");
                    await ts.PutTheseus(obj, req.params.id, orgid);
                    console.log("Metadata updated to Jukuri");
                }
            }

            await db.any("COMMIT");
            console.log("Succesfully updated julkaisu with id: " + req.params.id);
            return res.sendStatus(200);

        } catch (err) {
            // if error exists in any query, rollback
            console.log(err);
            console.log("Error in updating publication: " + req.params.id + " with error code: " + err);
            await db.any("ROLLBACK");
            res.status(500).send(err.message);
        }
    } else {
        return res.status(403).send("Permission denied");
    }

}

async function putJulkaisuntila(req: Request, res: Response, next: NextFunction) {

    USER_DATA = req.session.userData;
    // USER_DATA = await authService.getUserData(req.headers);

    const isAdmin = await authService.isAdmin(USER_DATA);
    const hasAccessToPublication = await authService.hasAccessToPublication(USER_DATA, req.params.id);

    if (isAdmin && hasAccessToPublication) {
        const julkaisuColumns = new pgp.helpers.ColumnSet(["julkaisuntila", "modified", "username"], {table: "julkaisu"});
        const updateJulkaisuntila = pgp.helpers.update(req.body, julkaisuColumns) + "WHERE id = " +  parseInt(req.params.id) + " RETURNING id";

        return db.one(updateJulkaisuntila)
            .then((response: any) => {
                auditLog.postAuditData(req.headers, "PUT", "julkaisu", req.params.id, req.body);
                return res.sendStatus(200);
            }).catch(function (err: any) {
                console.log(err);
            });
    } else {
        return res.status(403).send("Permission denied");
    }

}

async function getAllData(data: any) {
    for (let i = 0; i < data.length; i++) {
        data[i]["tieteenala"] = await sq.getTieteenala(data[i].julkaisu.id);
        data[i]["tieteenala"] = await sq.getTieteenala(data[i].julkaisu.id);
        data[i]["taiteenala"] = await sq.getTaiteenala(data[i].julkaisu.id);
        data[i]["julkaisu"]["issn"] = await sq.getIssn(data[i].julkaisu.id);
        data[i]["julkaisu"]["isbn"] = await sq.getIsbn(data[i].julkaisu.id);
        data[i]["taidealantyyppikategoria"] = await sq.getTyyppikategoria(data[i].julkaisu.id);
        data[i]["avainsanat"] = await sq.getAvainsana(data[i].julkaisu.id);
        data[i]["lisatieto"] = await sq.getLisatieto(data[i].julkaisu.id);
        data[i]["organisaatiotekija"] = await sq.getOrganisaatiotekija(data[i].julkaisu.id);
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
    const save = pgp.helpers.insert(obj, columns) + " RETURNING id";
    await db.many(save);

    await auditLog.postAuditData(headers, "POST", table, jid, obj);

}

async function insertProjektinumero(julkaisu: any, jid: any, headers: any) {

    const projektinumeroObj: any = [];
    
    if (!julkaisu["projektinumero"]) {
        return;
    }

    for (let i = 0; i < julkaisu["projektinumero"].length; i++) {
        if (julkaisu["projektinumero"][i] !== "") {
            projektinumeroObj.push({"julkaisuid": jid, "projektinumero": julkaisu["projektinumero"][i]});
        }
    }
    const columns = new pgp.helpers.ColumnSet(["julkaisuid", "projektinumero"], {table: "julkaisu_projektinumero"});
    const save = pgp.helpers.insert(projektinumeroObj, columns) + " RETURNING id";
    await db.many(save);

    await auditLog.postAuditData(headers, "POST", "julkaisu_projektinumero", jid, projektinumeroObj); 

}

async function insertTieteenala(obj: any, jid: any, headers: any) {

    const tieteenalaObj = dbHelpers.addJulkaisuIdToObject(obj, jid);
    const tieteenalaColumns = new pgp.helpers.ColumnSet(dbHelpers.tieteenala, {table: "tieteenala"});
    const saveTieteenala = pgp.helpers.insert(tieteenalaObj, tieteenalaColumns) + " RETURNING id";

    await db.many(saveTieteenala);
    await auditLog.postAuditData(headers, "POST", "tieteenala", jid, tieteenalaObj);
}

async function insertTaiteenala(obj: any, jid: any, headers: any) {

    if (!obj || obj.length < 1) { return Promise.resolve(true); }

    const taiteenalaObj =  dbHelpers.addJulkaisuIdToObject(obj, jid);
    const tieteenalaColumns = new pgp.helpers.ColumnSet(dbHelpers.taiteenala, {table: "taiteenala"});
    const saveTieteenala = pgp.helpers.insert(taiteenalaObj, tieteenalaColumns) + " RETURNING id";

    await db.many(saveTieteenala);
    await auditLog.postAuditData(headers, "POST", "taiteenala", jid, taiteenalaObj);

}

async function insertAvainsanat(obj: any, jid: any, headers: any) {

    if (!obj || obj.length < 1) { return Promise.resolve(true); }

    const avainsanaObj = dbHelpers.constructObject(obj, jid, "avainsana");
    const avainsanatColumns = new pgp.helpers.ColumnSet(["julkaisuid", "avainsana"], {table: "avainsana"});
    const saveAvainsanat = pgp.helpers.insert(avainsanaObj, avainsanatColumns) + " RETURNING id";

    await db.many(saveAvainsanat);
    await auditLog.postAuditData(headers, "POST", "avainsana", jid, avainsanaObj);

}
async function insertTyyppikategoria(obj: any, jid: any, headers: any) {

    if (!obj || obj.length < 1) { return Promise.resolve(true); }

    const tyyppikategoriaObj = dbHelpers.constructObject(obj, jid, "tyyppikategoria");
    const tyyppikategoriaColumns = new pgp.helpers.ColumnSet(["julkaisuid", "tyyppikategoria"], {table: "taidealantyyppikategoria"});
    const saveTyyppikategoria = pgp.helpers.insert(tyyppikategoriaObj, tyyppikategoriaColumns) + " RETURNING id";

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
    const saveLisatieto = pgp.helpers.insert(lisatietoObj, lisatietoColumns) + " RETURNING id";

    await db.many(saveLisatieto);
    await auditLog.postAuditData(headers, "POST", "lisatieto", jid, lisatietoObj);
}



async function insertOrganisaatiotekijaAndAlayksikko(obj: any, jid: any, headers: any) {

    const orgTekijaObj = dbHelpers.addJulkaisuIdToObject(obj, jid);

    console.log("Saving organisaatiotekija data for id: " + jid);
    const organisaatiotekijaColumns = new pgp.helpers.ColumnSet(dbHelpers.organisaatiotekija, {table: "organisaatiotekija"});
    const saveOrganisaatiotekija = pgp.helpers.insert(orgTekijaObj, organisaatiotekijaColumns) + " RETURNING id";

    console.log(saveOrganisaatiotekija);

    const orgid = await db.many(saveOrganisaatiotekija);
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

    const alayksikkoColumns = new pgp.helpers.ColumnSet(["organisaatiotekijaid", "alayksikko"], {table: "alayksikko"});
    const saveAlayksikko = pgp.helpers.insert(alayksikkoObj, alayksikkoColumns) + " RETURNING id";

    await db.any(saveAlayksikko);
    await auditLog.postAuditData(headers, "POST", "alayksikko", jid, alayksikkoObj);

    console.log("Organisaatiotekija and alayksikko data saved for puplication: " + jid);
}

async function updateArchiveTable(data: any, headers: any, id: any) {

    const obj: any = {};

    let updateColumns: any = [];

    if (!data.embargo || data.embargo === "" ) {
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

    const jukuriPublication: boolean = await fileUpload.isJukuriPublication(id);

    let table;
    if (jukuriPublication) {
        const jukuriUpdateColumns = updateColumns.slice();
        jukuriUpdateColumns.push("urn");
        obj["urn"] = data.urn;
        table = new connection.pgp.helpers.ColumnSet(jukuriUpdateColumns, {table: "julkaisuarkisto"});

    } else {
        updateColumns =  dbHelpers.julkaisuarkistoUpdateFields;
        table = new connection.pgp.helpers.ColumnSet(updateColumns, {table: "julkaisuarkisto"});
    }

    const query = pgp.helpers.update(obj, table) + " WHERE julkaisuid = " +  parseInt(data.julkaisuid);
    await db.none(query);

    // update kaytto_loki table
    await auditLog.postAuditData(headers, "PUT", "julkaisuarkisto", data.julkaisuid, obj);

}

function logout(req: Request, res: Response, next: NextFunction) {
    req.session.destroy(err => {
        if (err) {
            console.log(err);
            return next(err);
        }
        res.clearCookie("connect.sid", { path: "/" }).status(200).send("Logout successful and cookie deleted.");
    });
}

async function dbHealthCheck(req: Request, res: Response, next: NextFunction) {

    const testQuery = "SELECT 1;";

    try {
        const response = await db.one(testQuery);
        console.log(response);
        if (response) {
            return res.status(200).send("DB connection OK!");
        } else {
            return res.status(503).send("Database seems to be up but no data is returned.");
        }
    } catch (e) {
        console.log(e);
        return res.status(503).send("ERROR!");
    }

}

async function validateJulkaisumaksu(julkaisumaksu: any) {
    // first replace , with .
    const replaced = julkaisumaksu.replace(",", ".");
    return parseFloat(replaced);
}


module.exports = {
    // GET requests
    getJulkaisut: getJulkaisut,
    getJulkaisutmin: getJulkaisutmin,
    getJulkaisutHaku: getJulkaisutHaku,
    getAllPublicationDataById: getAllPublicationDataById,
    getUser: getUser,
    // POST requests
    postJulkaisu: postJulkaisu,
    postLanguage: postLanguage,
    impersonateUser: impersonateUser,
    // PUT requests
    putJulkaisuntila: putJulkaisuntila,
    updateJulkaisu: updateJulkaisu,
    updateArchiveTable: updateArchiveTable,
    dbHealthCheck: dbHealthCheck,
    logout: logout

};