import { Request, Response, NextFunction } from "express";
import { isFor } from "babel-types";
const request = require("request");
const rp = require("request-promise");
const path = require("path");

const kp = require("../koodistopalvelu");
const fs = require("fs");

// Database connection
const connection = require("./../db");
const testtoken = "4287fe2a-b6e5-4c58-8e10-b55e22f2aaed";

const BASEURL = "https://ds5-am-kktest.lib.helsinki.fi/rest/";
const fu = require("../queries/fileUpload");
const api = require("./../queries/subQueries");

const dbHelpers = require("./../databaseHelpers");

// For development purposes
function IntervalTest() {
    return console.log("Why doesnt it rain");
}
// setInterval(() => IntervalTest, 1000);

async function checkQueue() {
    const julkaisuIDt = await connection.db.query(
        "SELECT julkaisuid FROM julkaisujono INNER JOIN julkaisu ON julkaisujono.julkaisuid = julkaisu.id " +
        "AND julkaisu.julkaisuntila <> '' AND CAST(julkaisu.julkaisuntila AS INT) > 0", "RETURNING julkaisu.id");
    console.log("The join SELECT: " + JSON.stringify(julkaisuIDt));

    julkaisuIDt.forEach(async function (e: any ) {
        console.log("The id inside the for loop: " + e.julkaisuid);
        await postJulkaisuTheseus(e.julkaisuid);
    });
}
async function postJulkaisuTheseus(julkaisunID: any) {
    // const collectionsUrl = "colletions/";


    // TODO ADD SPECIFIC ORG COLLECTION ID HERE
    // Add unique collections ID:s that are matched according to the organisational id
    // The organisational id is inside the julkaisu taulukko
    // const orgCollection = "something";
    const params = {"id": julkaisunID};
    // ALL queries for the metadataobject
    const julkaisuTableFields = dbHelpers.getTableFields("julkaisu", true);
    const queryJulkaisu = "SELECT julkaisu.id, " + julkaisuTableFields + " FROM julkaisu WHERE id = " +
        "${id};";

    let julkaisuData: any = {};
    let avainsanaData = [];
    let isbnData = [];
    let issnData = [];


    try {
        julkaisuData  = await connection.db.one(queryJulkaisu, params);
        avainsanaData  = await api.getAvainsana(julkaisunID);
        isbnData  = await api.getIsbn(julkaisunID);
        issnData  = await api.getIssn(julkaisunID);
    } catch (e) {
        console.log(e);
    }

    // console.log("the julkData:" + julkaisuData);
    // Not used for now, declaration unclear on which ones to be used for dc.contributor.author
    // const orgTekData = organisaatiotekijadata[0];

    const metadataobject = {
        "name": julkaisuData["julkaisunnimi"], "metadata": [
            {"key": "dc.source.identifier", "value": julkaisuData["id"]},
            {"key": "dc.title", "value": julkaisuData["julkaisunnimi"]},
            {"key": "dc.type.okm", "value": julkaisuData["julkaisutyyppi"]},
            {"key": "dc.date.issued", "value": julkaisuData["julkaisuvuosi"]},
            {"key": "dc.relation.conference", "value": julkaisuData["konferenssinvakiintunutnimi"]},
            {"key": "dc.relation.ispartof", "value": julkaisuData["emojulkaisunnimi"]},
            {"key": "dc.contributor.editor", "value": julkaisuData["emojulkaisuntoimittajat"]},
            {"key": "dc.relation.ispartofjournal", "value": julkaisuData["lehdenjulkaisusarjannimi"]},
            {"key": "dc.relation.volume", "value": julkaisuData["volyymi"]},
            {"key": "dc.relation.issue", "value": julkaisuData["numero"]},
            {"key": "dc.relation.pagerange", "value": julkaisuData["sivut"]},
            {"key": "dc.relation.articlenumber", "value": julkaisuData["artikkelinumero"]},
            {"key": "dc.publisher", "value": julkaisuData["kustantaja"]},
            {"key": "dc.language.iso", "value": julkaisuData["julkaisunkieli"]},
            {"key": "dc.relation.doi", "value": julkaisuData["doitunniste"]},
            {"key": "dc.okm.selfarchived", "value": julkaisuData["julkaisurinnakkaistallennettu"]},
            {"key": "dc.identifier.uri", "value": julkaisuData["rinnakkaistallennetunversionverkkoosoite"]},
        ]};


    if (!arrayIsEmpty(avainsanaData)) {
        avainsanaData.forEach((value: any) => {
            const avainsanaobject = {"key": "dc.subject", "value": value};
            metadataobject.metadata.push(avainsanaobject);
        });
    }

    if (!arrayIsEmpty(isbnData)) {
        isbnData.forEach((value: any) => {
            // console.log(value);
            const isbnobject = {"key": "dc.identifier.isbn", "value": value};
            metadataobject.metadata.push(isbnobject);
        });
    }

    if (!arrayIsEmpty(issnData)) {
        issnData.forEach((value: any) => {
            // console.log(value);
            const issnobject = {"key": "dc.identifier.issn", "value": value};
            metadataobject.metadata.push(issnobject);
        });
    }


    const str = julkaisuData["tekijat"];
    const onetekija = str.split("; ");

    onetekija.forEach((value: any) => {
        const tekijatobject = {"key": "dc.contributor.author", "value": value}; // formaatti, sukunimi, etunimi
        metadataobject.metadata.push(tekijatobject);
    });

    console.log(metadataobject);
// await sendPostReqTheseus(metadataobject, julkaisunID);
}

function arrayIsEmpty(arr: any) {
    if (!arr || !arr[0] || arr[0] === "") {
        return true;
    }   else {
        return false;
    }
}


async function sendPostReqTheseus(sendObject: any, julkaisuID: any) {

    const headersOpt = {
        "rest-dspace-token": testtoken,
        "content-type": "application/json"
    };
    const options = {
        rejectUnauthorized: false,
        method: "POST",
        uri: BASEURL + "collections/13/items/",
        headers: headersOpt,
        body: sendObject,
        json: true,
        encoding: "utf8",
    };
    rp(options)
    .then(async function(res: Response) {
        const itemID = (res as any)["id"];
        console.log("The itemid: " + itemID);
        const handle = (res as any)["handle"];
        console.log("The handle: " + handle);
        console.log(res);
        await insertIntoArchiveTable(julkaisuID, itemID, handle);
    })
    .catch(function (err: Error) {
        console.log("Something went wrong with posting item " + sendObject + " to url: " + BASEURL + "collections/13/items " + err);
    });
}


async function insertIntoArchiveTable(julkaisuID: any, theseusItemID: any, theseusHandleID: any ) {
    // TODO, combine both queries into one
    const paramss = {"id": julkaisuID};
    const queryitemid = "UPDATE julkaisuarkisto SET itemid=" + theseusItemID + "WHERE julkaisuid = " +
    "${id};";
    const queryhandle = "UPDATE julkaisuarkisto SET handle=" + "'" + theseusHandleID + "'" + "WHERE julkaisuid = " +
    "${id};";
    await connection.db.any(queryitemid, paramss);
    await connection.db.any(queryhandle, paramss);

    // TODO check if file exists, if so. Fire the request to send item to theseus
    // Else, do nothing (This should never happen though, iirc.)
    console.log("The stuff in inserttemptable: " + julkaisuID + " " + theseusItemID + " " + theseusHandleID);

    if (fu.isPublicationInTheseus(julkaisuID)) {
        sendBitstreamToItem(julkaisuID, theseusItemID);
        console.log("IT IS IN THESEUS: " + julkaisuID);
    }
    else {
    console.log("Metadata for item updated");
    }
}
async function sendBitstreamToItem(julkaisuID: any, theseusID: any) {
    console.log("The julkaisuID when we are sending bistream: " + julkaisuID + " and the theseusID: " + theseusID);
    const params = {"id": julkaisuID};
    const embargoquery = "SELECT embargo FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
    const filenamequery = "SELECT filename FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
    const embargo = await connection.db.any(embargoquery, params);
    const filename = await connection.db.any(filenamequery, params);
    const filenamecleaned = filename[0]["filename"].replace(/^"(.*)"$/, "$1");

    // TODO SPLIT EMBARGO FOR URLFINAL
    const embargodate = JSON.stringify(embargo[0]["embargo"]).split("T")[0];
    console.log("The embargodate: " + embargodate);
    const embargodatecleaned = embargodate.replace(/\"/g, "");
    console.log("The embargodatecleaned: " + embargodatecleaned);
    const year = embargodatecleaned.split("-")[0];
    const month = embargodatecleaned.split("-")[1];
    const day = embargodatecleaned.split("-")[2];
    const filepath = "/opt/sources/publications/" + julkaisuID + "/" + filenamecleaned;

    const urlFinal = BASEURL + "items/" + theseusID + "/bitstreams?name=" + filenamecleaned + "&description=" + filenamecleaned + "&groupId=0&year=" + year + "&month=" + month + "&day=" + day;
    console.log("Thefinalurl: " + urlFinal);
    const headersOpt = {
        "rest-dspace-token": testtoken,
        "content-type": "application/json"
    };
    const options = {
        rejectUnauthorized: false,
        method: "POST",
        uri: urlFinal,
        headers: headersOpt,
        json: true,
        formData: {
            file: fs.createReadStream(filepath)
        }
    };
        rp(options)
        .then(async function(res: Response, req: Request) {
            // TODO add catching of bitstreamid, also maybe policyid
            console.log(res);
            // If both are needed, merge insert into one statement.
            const bitstreamid = (res as any)["id"];
            console.log("catching the bitstream id from response" + bitstreamid);
            // const policyid = (res as any)["policyid"];
            const params = {"id": julkaisuID};
            const bitstreamquery = "UPDATE julkaisuarkisto SET bitstreamid=" + bitstreamid + " WHERE julkaisuid = " + "${id};";
            // const policyidquery = "INSERT INTO julkaisuarkisto (policyid) VALUES (" + policyid + " ) WHERE julkaisuid = " + "${id};";
            await connection.db.any(bitstreamquery, params);

        })
        .then(async function() {
            console.log("im here");
            const deletefromJonoQuery = "DELETE from julkaisujono WHERE julkaisuid = " + "${id};";
            await connection.db.any(deletefromJonoQuery, params);
            // TESTING PURPOSE
            // DeleteFromTheseus(julkaisuID);
        })
        .catch(function(err: Error) {
            console.log("Something went wrong with sending file: " + err);
        });



}

function checkToken() {
    // TODO ADD CODE HERE
    const urlFinal = BASEURL + "status";
    const headersOpt = {
        "rest-dspace-token": testtoken,
        "content-type": "application/json"
    };
    const options = {
        rejectUnauthorized: false,
        method: "GET",
        uri: urlFinal,
        headers: headersOpt,
        json: true,
    };

    rp(options)
    .then(async function(res: Response) {
        const authenticated = (res as any)["authenticated"];
        if (authenticated === "true") {
            return true;

        }
        else {
            return false;
        }
    })
    .catch(function(err: Error) {
        console.log("Error while checking token status: " + err);
    });
}
function getToken() {
    const urlFinal = BASEURL + "login";
    const metadataobj = {"email": "test@test.com", "password": "test"};
    const headersOpt = {
        "content-type": "application/json",
    };
    const options = {
        rejectUnauthorized: false,
        method: "POST",
        uri: urlFinal,
        headers: headersOpt,
        body: metadataobj,
        encoding: "utf8",
    };
    rp(options)
    .then(async function(res: Response) {
        console.log(res);
        return res;
    })
    .catch(function(err: Error) {
        console.log("Error while deleting julkaisu: " + err);
    });
}

async function DeleteFromTheseus(id: any) {
    const params = {"id": id};
    const itemidquery = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
    const itemid = await connection.db.any(itemidquery, params);
    const urlFinal = BASEURL + "items/" + itemid[0]["itemid"];
    const headersOpt = {
        "rest-dspace-token": testtoken,
        "content-type": "application/json"
    };
    const options = {
        rejectUnauthorized: false,
        method: "DELETE",
        uri: urlFinal,
        headers: headersOpt,
    };
    rp(options)
    .then(async function(res: Response, req: Request) {
        console.log("Successful delete" + res);
    })
    .catch(function(err: Error) {
        console.log("Error while deleting julkaisu: " + id + " with error: " + err);
    });
}
module.exports = {
    IntervalTest: IntervalTest,
    checkQueue: checkQueue,
    DeleteFromTheseus: DeleteFromTheseus
};


