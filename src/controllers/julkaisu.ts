import { Request, Response, NextFunction } from "express";

const oh = require("../objecthandlers");

// Database connection from db.ts
const connection = require("../db");
const pgp = connection.pgp;
const db = connection.db;

import { authService as authService } from "../services/authService";
import { julkaisuQueries as julkaisuQueries } from "../queries/julkaisuQueries";
import { julkaisuArkistoQueries as julkaisuArkisto } from "../queries/julkaisuArkistoQueries";
import { theseus as ts } from "../services/theseusSender";
import { auditLog as auditLog } from "../services/auditLogService";
import { validate as validate } from "../services/validatorService";

import { JulkaisuObject } from "../types/Julkaisu";
import { Justus } from "../types/Justus";
import { FileData } from "../types/FileData";
import { UserObject } from "../types/User";

const dbTypes = require("../types/DatabaseFields");

let userData: UserObject["perustiedot"];
const theseusHandleLink = process.env.THESEUS_HANDLE_LINK;
const jukuriHandleLink = process.env.JUKURI_HANDLE_LINK;


export const getJulkaisut = async (req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(5 * 60 * 1000);

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(userData);
    const isAdmin = await authService.isAdmin(userData);

    if (hasOrganisation && isAdmin) {
        const organisationCode = userData.organisaatio;
        try {

            const julkaisuTableFields = dbTypes.getTableFieldsWithPrefix("julkaisu");
            let query;
            let params = {};

            if (organisationCode === "00000") {
                query = "SELECT julkaisu.id, " + julkaisuTableFields + " FROM julkaisu ORDER BY julkaisu.id;";
            } else {
                params = {"code": organisationCode};
                query = "SELECT julkaisu.id, " + julkaisuTableFields + " FROM julkaisu WHERE organisaatiotunnus = " +
                    "${code} ORDER BY julkaisu.id;";
            }

            const julkaisudata = await db.any(query, params);
            const temp = oh.ObjectHandlerJulkaisudata(julkaisudata, true);
            const data = await getAllData(temp);

            res.status(200).json({data});

        } catch (err) {
            console.log(err);
            res.sendStatus(500);
        }

    } else {
        return res.status(403).send("Permission denied");
    }

};

export const getJulkaisutmin = async (req: Request, res: Response, next: NextFunction) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(userData);

    if (hasOrganisation) {

        const julkaisuTableFields = dbTypes.getListFieldsWithPrefix("j");
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
                " WHERE organisaatiotunnus = ${code} AND kl.uid = ${uid}" +
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
                " WHERE organisaatiotunnus = ${code} AND kl.uid = ${uid}" +
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
        if (userData.rooli === "owner" && userData.organisaatio === "00000") {
            query = queryAllOrganisations;
            queryCount = queryCountForOwners;
            if (req.params.organisaatiotunnus) {
                params = {"code": req.params.organisaatiotunnus};
                query = queryByOrganisationCode;
                queryCount = queryCountForAdmins;
            }
        }
        if (userData.rooli === "admin") {
            params = {"code": userData.organisaatio};
            query = queryByOrganisationCode;
            queryCount = queryCountForAdmins;
        }
        if (userData.rooli === "member") {
            params = {"code": userData.organisaatio, "uid": userData.uid};
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

};

export const getJulkaisutHaku = async (req: Request, res: Response, next: NextFunction) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(userData);

    if (!userData || !hasOrganisation) {
        return res.status(403).send("Permission denied");
    }

    const julkaisuTableFields = dbTypes.getListFieldsWithPrefix("j");

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

    if (userData.rooli === "owner" && !req.params.organisaatiotunnus) {
        organisaatioHaku = false;
    }

    // verify that only owners can make parametrized queries
    if (userData.rooli === "owner" && req.params.organisaatiotunnus) {
        params["code"] = req.params.organisaatiotunnus;
    } else {
        params["code"] = userData.organisaatio;
    }

    let count: any;
    let countQuery;
    let hakuQuery;

    // member can only search for rejected publications
    if (userData.rooli === "member") {
        hakuQuery = "SELECT j.id, j.organisaatiotunnus,j.julkaisuvuosi,j.julkaisunnimi,j.tekijat,j.julkaisuntila,j.username,j.modified, a.handle, a.id AS aid" +
            " FROM julkaisu AS j INNER JOIN kaytto_loki AS kl on j.accessid = kl.id LEFT JOIN julkaisuarkisto AS a on j.id = a.julkaisuid" +
            " WHERE organisaatiotunnus = ${code} AND kl.uid = ${uid} AND j.julkaisuntila = '-1' ORDER BY j.modified DESC LIMIT " + pageSize + " OFFSET " + offset + ";";
        countQuery = "SELECT count(*) FROM julkaisu INNER JOIN kaytto_loki AS kl on accessid = kl.id WHERE organisaatiotunnus = ${code} AND julkaisuntila = '-1' AND kl.uid = ${uid};";
        params["uid"] = userData.uid;
    } else {
        if (idHaku) {
            hakuQuery = idQuery + approved + ";";
            countQuery = idCount + approved + ";";
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
            hakuQuery = tilaHakuQuery + " ORDER BY modified DESC" +
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

};

// Get data from all tables by julkaisuid
export const getAllPublicationDataById = async (req: Request, res: Response, next: NextFunction) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(userData);
    const hasAccessToPublication = await authService.hasAccessToPublication(userData, req.params.id);

    if (hasOrganisation && hasAccessToPublication) {
        const julkaisuTableFields = dbTypes.getTableFieldsWithPrefix("julkaisu");

        const arkistoTableFields = "urn,handle,filename," + dbTypes.julkaisuarkistoUpdateFields.join(",");

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
            data["julkaisu"]["issn"] = await julkaisuQueries.getIssn(req.params.id);
            data["julkaisu"]["isbn"] = await julkaisuQueries.getIsbn(req.params.id);
            data["julkaisu"]["projektinumero"] = await julkaisuQueries.getProjektinumero(req.params.id);
            data["tieteenala"] = await julkaisuQueries.getTieteenala(req.params.id);
            data["taiteenala"] = await julkaisuQueries.getTaiteenala(req.params.id);
            data["taidealantyyppikategoria"] = await julkaisuQueries.getTyyppikategoria(req.params.id);
            data["avainsanat"] = await julkaisuQueries.getAvainsana(req.params.id);
            data["lisatieto"] = await julkaisuQueries.getLisatieto(req.params.id);
            data["organisaatiotekija"] = await julkaisuQueries.getOrganisaatiotekija(req.params.id);

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

};

// POST requests
// Post a julkaisu to the database
// Catch the JSON body and parse it so that we can insert the values into postgres
export const postJulkaisu = async (req: Request, res: Response, next: NextFunction) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    if (!userData) {
        userData = await authService.getUserData(req.headers);
    }

    const hasAccess = await authService.hasOrganisation(userData);

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

            const julkaisuValidated: JulkaisuObject = await validate.julkaisu(julkaisuObject);
            await validate.organisaatiotekija(orgatekijaArray);
            await validate.tieteenala(tieteenalaArray);
            await validate.taiteenala(taiteenalaArray);
            await validate.avainsanat(avainsanaArray);
            await validate.tyyppikategoria(tyyppikategoriaArray);
            await validate.lisatieto(lisatieto);

            const julkaisuColumns = new pgp.helpers.ColumnSet(dbTypes.julkaisu, {table: "julkaisu"});
            const saveJulkaisu = pgp.helpers.insert(julkaisuValidated, julkaisuColumns) + " RETURNING id";
            const julkaisuId = await db.one(saveJulkaisu);

            const kayttoLokiObject = JSON.parse(JSON.stringify(julkaisuValidated));
            delete kayttoLokiObject["issn"];
            delete kayttoLokiObject["isbn"];
            delete kayttoLokiObject["projektinumero"];

            const kayttoLokiId = await auditLog.postAuditData(req.headers, method, "julkaisu", julkaisuId.id, kayttoLokiObject);

            const idColumn = new pgp.helpers.ColumnSet(["accessid"], {table: "julkaisu"});
            const insertAccessId = pgp.helpers.update({"accessid": kayttoLokiId.id}, idColumn) + "WHERE id = " + parseInt(julkaisuId.id) + " RETURNING accessid";

            await db.one(insertAccessId);

            await julkaisuQueries.insertIssnAndIsbn(julkaisuValidated, julkaisuId.id, req.headers, "issn");
            await julkaisuQueries.insertIssnAndIsbn(julkaisuValidated, julkaisuId.id, req.headers, "isbn");
            await julkaisuQueries.insertOrganisaatiotekijaAndAlayksikko(orgatekijaArray, julkaisuId.id, req.headers);
            await julkaisuQueries.insertTieteenala(tieteenalaArray, julkaisuId.id, req.headers);
            await julkaisuQueries.insertTaiteenala(taiteenalaArray, julkaisuId.id, req.headers);
            await julkaisuQueries.insertAvainsanat(avainsanaArray, julkaisuId.id, req.headers);
            await julkaisuQueries.insertTyyppikategoria(tyyppikategoriaArray, julkaisuId.id, req.headers);
            await julkaisuQueries.insertLisatieto(lisatieto, julkaisuId.id, req.headers);
            await julkaisuQueries.insertProjektinumero(julkaisuValidated, julkaisuId.id, req.headers);

            await db.any("COMMIT");

            // For Luonnonvarakeskus metadata is always sent to Jukuri
            const isJukuriPublication: boolean = oh.isJukuriPublication(req.body.julkaisu.organisaatiotunnus);

            if (isJukuriPublication) {
                await julkaisuArkisto.postDataToQueueTable(julkaisuId.id);

                const table = new connection.pgp.helpers.ColumnSet(["julkaisuid", "destination"], {table: "julkaisuarkisto"});
                const query = pgp.helpers.insert({
                    "julkaisuid": julkaisuId.id,
                    "destination": "jukuri"
                }, table) + " RETURNING id";

                await connection.db.one(query);

                // update kaytto_loki table
                await auditLog.postAuditData(req.headers, "POST", "julkaisuarkisto", julkaisuId.id, {
                    "julkaisuid": julkaisuId.id,
                    "destination": "jukuri"
                });
            }

            res.status(200).json({"id": julkaisuId.id});
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

};

// PUT requests
export const updateJulkaisu = async (req: Request, res: Response, next: NextFunction) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const hasAccessToPublication = await authService.hasAccessToPublication(userData, req.params.id);

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

            const julkaisuValidated: JulkaisuObject = await validate.julkaisu(julkaisuObject);
            await validate.organisaatiotekija(orgatekijaArray);
            await validate.tieteenala(tieteenalaArray);
            await validate.taiteenala(taiteenalaArray);
            await validate.avainsanat(avainsanaArray);
            await validate.tyyppikategoria(tyyppikategoriaArray);
            await validate.lisatieto(lisatieto);

            const julkaisuColumns = new pgp.helpers.ColumnSet(dbTypes.julkaisu, {table: "julkaisu"});

            const updateJulkaisu = pgp.helpers.update(julkaisuValidated, julkaisuColumns) + " WHERE id = " + parseInt(req.params.id);

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

            await julkaisuQueries.insertIssnAndIsbn(julkaisuValidated, req.params.id, req.headers, "issn");

            const deletedIsbnRows = await db.result("DELETE FROM julkaisu_isbn WHERE julkaisuid = ${id}", {
                id: req.params.id
            });

            if (deletedIsbnRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "julkaisu_isbn", req.params.id, [undefined]);
            }

            await julkaisuQueries.insertIssnAndIsbn(julkaisuValidated, req.params.id, req.headers, "isbn");

            const deletedProjektinumeroRows = await db.result("DELETE FROM julkaisu_projektinumero WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedProjektinumeroRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "julkaisu_projektinumero", req.params.id, [undefined]);
            }
            await julkaisuQueries.insertProjektinumero(julkaisuValidated, req.params.id, req.headers);

            const deletedOrganisaatiotekijaRows = await db.result("DELETE FROM organisaatiotekija WHERE julkaisuid = ${id}", {
                id: req.params.id
            });

            if (deletedOrganisaatiotekijaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "organisaatiotekija", req.params.id, [undefined]);
            }

            await julkaisuQueries.insertOrganisaatiotekijaAndAlayksikko(orgatekijaArray, req.params.id, req.headers);

            const deletedTieteenalaRows = await db.result("DELETE FROM tieteenala WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedTieteenalaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "tieteenala", req.params.id, [undefined]);
            }
            await julkaisuQueries.insertTieteenala(tieteenalaArray, req.params.id, req.headers);

            const deletedTaiteenalaRows = await db.result("DELETE FROM taiteenala WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedTaiteenalaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "taiteenala", req.params.id, [undefined]);
            }
            await julkaisuQueries.insertTaiteenala(taiteenalaArray, req.params.id, req.headers);

            const deletedAvainsanaRows = await db.result("DELETE FROM avainsana WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedAvainsanaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "avainsana", req.params.id, [undefined]);
            }
            await julkaisuQueries.insertAvainsanat(avainsanaArray, req.params.id, req.headers);

            const deletedTyyppikategoriaRows = await db.result("DELETE FROM taidealantyyppikategoria WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedTyyppikategoriaRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "taidealantyyppikategoria", req.params.id, [undefined]);
            }
            await julkaisuQueries.insertTyyppikategoria(tyyppikategoriaArray, req.params.id, req.headers);

            const deletedLisatietoRows = await db.result("DELETE FROM lisatieto WHERE julkaisuid = ${id}", {
                id: req.params.id
            });
            if (deletedLisatietoRows.rowCount > 0) {
                await auditLog.postAuditData(req.headers, "DELETE", "taidealantyyppikategoria", req.params.id, [undefined]);
            }
            await julkaisuQueries.insertLisatieto(lisatieto, req.params.id, req.headers);

            const isPublication = await julkaisuArkisto.fileHasBeenUploadedToJustus(req.params.id);
            const isPublicationInTheseus = await julkaisuArkisto.isPublicationInTheseus(req.params.id);

            // if publication file is originally uploaded to Justus service,
            // we have to update data in julkaisuarkisto table,
            // and if file is already transferred to Theseus / Jukuri
            // we have to update data there also

            const isFileUploaded = await ts.isFileUploaded(req.params.id);
            const orgid = req.body.julkaisu.organisaatiotunnus;

            if (isFileUploaded && isFileUploaded.filename) {
                await julkaisuQueries.updateArchiveTable(req.body.filedata, req.headers, req.params.id);
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

};

export const putJulkaisuntila = async (req: Request, res: Response, next: NextFunction) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const isAdmin = await authService.isAdmin(userData);
    const hasAccessToPublication = await authService.hasAccessToPublication(userData, req.params.id);

    if (isAdmin && hasAccessToPublication) {
        const julkaisuColumns = new pgp.helpers.ColumnSet(["julkaisuntila", "modified", "username"], {table: "julkaisu"});
        const updateJulkaisuntila = pgp.helpers.update(req.body, julkaisuColumns) + "WHERE id = " + parseInt(req.params.id) + " RETURNING id";

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

};

const getAllData = async (data: any) => {
    for (let i = 0; i < data.length; i++) {
        data[i]["tieteenala"] = await julkaisuQueries.getTieteenala(data[i].julkaisu.id);
        data[i]["tieteenala"] = await julkaisuQueries.getTieteenala(data[i].julkaisu.id);
        data[i]["taiteenala"] = await julkaisuQueries.getTaiteenala(data[i].julkaisu.id);
        data[i]["julkaisu"]["issn"] = await julkaisuQueries.getIssn(data[i].julkaisu.id);
        data[i]["julkaisu"]["isbn"] = await julkaisuQueries.getIsbn(data[i].julkaisu.id);
        data[i]["taidealantyyppikategoria"] = await julkaisuQueries.getTyyppikategoria(data[i].julkaisu.id);
        data[i]["avainsanat"] = await julkaisuQueries.getAvainsana(data[i].julkaisu.id);
        data[i]["lisatieto"] = await julkaisuQueries.getLisatieto(data[i].julkaisu.id);
        data[i]["organisaatiotekija"] = await julkaisuQueries.getOrganisaatiotekija(data[i].julkaisu.id);
    }
    return data;
};
