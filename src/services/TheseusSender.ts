import { Request, Response, NextFunction } from "express";
import { isFor } from "babel-types";
const request = require("request");
const rp = require("request-promise");
const path = require("path");

const kp = require("../koodistopalvelu");
const fs = require("fs");

// Database connection
const connection = require("./../db");
const testtoken = "18555d36-3263-4a42-b705-dd77fcdbb18c";

const BASEURL = "https://ds5-am-kktest.lib.helsinki.fi/rest/";
const fu = require("../queries/fileUpload");


// For development purposes
function IntervalTest() {
    return console.log("Why doesnt it rain");
}
// setInterval(() => IntervalTest, 1000);

async function checkQueue() {
    // Token checker function
// const julkaisuIDt = await connection.db.query("SELECT id from julkaisu WHERE julkaisuntila::integer > 0", "RETURNING ID");

const julkaisuIDt = await connection.db.query("SELECT julkaisu.id FROM julkaisu, julkaisujono WHERE (julkaisu.julkaisuntila::integer > 0 AND julkaisu.id = julkaisujono.julkaisuid)", "RETURNING julkaisu.id");
console.log("The join SELECT: " + JSON.stringify(julkaisuIDt));

julkaisuIDt.forEach(async function (e: any ) {
    console.log("The id inside the for loop: " + e.id);
    await postJulkaisuTheseus(e.id);
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
    const queryJulkaisu = "SELECT * FROM julkaisu WHERE id = " +
        "${id};";
    // const queryOrgTek = "SELECT * FROM organisaatiotekija WHERE id = " +
    //     "${id};";
    const queryISBN = "SELECT * FROM julkaisu_isbn WHERE julkaisuid = " +
        "${id};";
    const queryISSN = "SELECT * FROM julkaisu_issn WHERE julkaisuid = " +
        "${id};";
    const queryAvainsana = "SELECT * FROM avainsana WHERE julkaisuid = " +
        "${id};";

    // All db array objects
    const julkaisudata  = await connection.db.any(queryJulkaisu, params);
    // const organisaatiotekijadata  = await connection.db.any(queryOrgTek, params);
    const isbndata  = await connection.db.any(queryISBN, params);
    const issndata  = await connection.db.any(queryISSN, params);
    const avainsanadata  = await connection.db.any(queryAvainsana, params);


    const julkData = julkaisudata[0];
    console.log("the julkData:" + julkData);
    // Not used for now, declaration unclear on which ones to be used for dc.contributor.author
    // const orgTekData = organisaatiotekijadata[0];
    const ISBNdata = isbndata[0];
    console.log("The isbndata: " + ISBNdata);
    const ISSNdata = issndata[0];
    console.log("The issndata: " + ISSNdata);
    const avainsData = avainsanadata[0];

    // let metadataobject = {};
    const metadataobject = {"name": julkData["julkaisunnimi"], "metadata": [
    {"key": "dc.source.identifier", "value": julkData["id"]},
    {"key": "dc.title", "value": julkData["julkaisunnimi"]},
    {"key": "dc.type.okm", "value": julkData["julkaisutyyppi"]},
    {"key": "dc.date.issued", "value": julkData["julkaisuvuosi"]},
    {"key": "dc.contributor.author", "value": julkData["tekijat"]}, // formaatti, sukunimi, etunimi
    {"key": "dc.relation.conference", "value": julkData["konferenssinvakiintunutnimi"]},
    {"key": "dc.relation.ispartof", "value": julkData["emojulkaisunnimi"]},
    {"key": "dc.contributor.editor", "value": julkData["emojulkaisuntoimittajat"]},
    {"key": "dc.relation.ispartofjournal", "value": julkData["lehdenjulkaisusarjannimi"]},
    {"key": "dc.relation.volume", "value": julkData["volyymi"]},
    {"key": "dc.relation.issue", "value": julkData["numero"]},
    {"key": "dc.relation.pagerange", "value": julkData["sivut"]},
    {"key": "dc.relation.articlenumber", "value": julkData["artikkelinumero"]},
    {"key": "dc.publisher", "value": julkData["kustantaja"]},
    {"key": "dc.language.iso", "value": julkData["julkaisunkieli"]},
    {"key": "dc.relation.doi", "value": julkData["doitunniste"]},
    {"key": "dc.okm.selfarchived", "value": julkData["julkaisurinnakkaistallennettu"]},
    {"key": "dc.identifier.uri", "value": julkData["rinnakkaistallennetunversionverkkoosoite"]},
    {"key": "dc.identifier.isbn", "value": ISBNdata["isbn"]},
    {"key": "dc.identifier.issn", "value": ISSNdata["issn"]},
    {"key": "dc.subject", "value": avainsData["avainsana"]}

]};
console.log(metadataobject);
await sendPostReqTheseus(metadataobject, julkaisunID);
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

    const urlFinal = BASEURL + "/items/" + theseusID + "/bitstreams?name=" + filenamecleaned + "&description=" + filenamecleaned + "&groupId=0&year=" + year + "&month=" + month + "&day=" + day;
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

function getToken(res: Response) {
    // TODO ADD CODE HERE
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
        console.log(res);
    })
    .catch(function(err: Error) {
        console.log("Error while deleting julkaisu: " + id);
    });
}
module.exports = {
    IntervalTest: IntervalTest,
    checkQueue: checkQueue,
    DeleteFromTheseus: DeleteFromTheseus
};


