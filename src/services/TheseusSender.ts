import { Request, Response, NextFunction } from "express";
const request = require("request");
const rp = require("request-promise");
const path = require("path");

const kp = require("../koodistopalvelu");
const fs = require("fs");

// Database connection
const connection = require("./../db");
const testtoken = "adaf29a2-3652-4da0-928c-0a830cf1bda4";

const BASEURL = "https://ds5-am-kktest.lib.helsinki.fi/rest/";
const publicationFolder = "publications";
const savedFileName = "file.blob";


// For development purposes
function IntervalTest() {
    return console.log("Why doesnt it rain");
}
// setInterval(() => IntervalTest, 1000);

async function checkQueue() {
const julkaisuIDt = await connection.db.query("SELECT id from julkaisu WHERE julkaisuntila::integer > 0", "RETURNING ID");
console.log(JSON.stringify(julkaisuIDt));

julkaisuIDt.forEach(async function (e: any ) {
    console.log("The id inside the for loop: " + e.id);
    await postJulkaisuTheseus(e.id);
});
}
async function postJulkaisuTheseus(julkaisunID: any) {
    const collectionsUrl = "colletions/";

    // TODO ADD SPECIFIC ORG COLLECTION ID HERE
    // Add unique collections ID:s that are matched according to the organisational id
    // The organisational id is inside the julkaisu taulukko
    // const orgCollection = "something";
    // console.log("yes: " + julkaisunID);
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
    .then(async function(res: Response, req: Request) {
        // TODO catch the response, extract itemid and handle, insert into julkaisuarkisto
        console.log(req);
        // Request returns undefined body, fix!
        const itemID = req.body.id;
        const handle = req.body.handle;
        await insertIntoTempTable(julkaisuID, itemID, handle);


    })
    .catch(function (err: Error) {
        console.log("Soemthing went wrong with posting item " + sendObject + " to url: " + BASEURL + "collections/13/items" + err);
    });
}


async function insertIntoTempTable(julkaisuID: any, theseusItemID: any, theseusHandleID: any ) {
    // TODO, combine both queries into one
    const columnitemid = "itemid";
    const columnhandle = "handle";
    const paramsItemID = {"id": julkaisuID, "table": columnitemid, "thesID": theseusItemID};
    const paramsHandle = {"id": julkaisuID, "table": columnhandle, "thesID": theseusHandleID};
    const queryitemid = "INSERT INTO julkaisuarkisto (" + "${table}" + " ) VALUES (" + "${thesID}" + ") WHERE julkaisuid = " +
    "${id};";
    const queryhandle = "INSERT INTO julkaisuarkisto (" + "${table}" + " ) VALUES (" + "${thesID}" + ") WHERE julkaisuid = " +
    "${id};";
    await connection.db.any(queryitemid, paramsItemID);
    await connection.db.any(queryhandle, paramsHandle);

    // TODO check if file exists, if so. Fire the request to send item to theseus

    // if (itemexistsjotain){
    //     sendBitstreamToItem(julkaisuID, theseusID);
    // }
    // sendBitstreamToItem(julkaisuID, theseusID);

}
async function sendBitstreamToItem(julkaisuID: any, theseusID: any) {
    const params = {"id": julkaisuID};
    const embargoquery = "SELECT embargo FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
    const filenamequery = "SELECT filename FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
    const embargo = await connection.db.any(embargoquery, params);
    const filename = await connection.db.any(filenamequery, params);

    // TODO SPLIT EMBARGO FOR URLFINAL


    const urlFinal = BASEURL + "/items/" + theseusID + "/bitstreams?name=" + filename + "&description=file&groupId=0&year";
    const headersOpt = {
        "rest-dspace-token": testtoken,
        "content-type": "application/json"
    };
    const options = {
        method: "POST",
        uri: urlFinal,
        headers: headersOpt,
        formData: fs.createReadStream(publicationFolder)
    };
        rp(options)
        .then(async function(res: Response, req: Request) {
            // TODO add catching of bitstreamid, also maybe policyid
            console.log(res);
            // If both are needed, merge insert into one statement.
            const bitstreamid = req.body.bitstreamid;
            const policyid = req.body.policyid;
            const params = {"id": julkaisuID};
            const bitstreamquery = "INSERT INTO julkaisuarkisto (bitstreamid) VALUES (" + bitstreamid + " ) WHERE julkaisuid = " + "${id};";
            const policyidquery = "INSERT INTO julkaisuarkisto (policyid) VALUES (" + policyid + " ) WHERE julkaisuid = " + "${id};";
            await connection.db.any(bitstreamquery, params);
            await connection.db.any(policyidquery, params);

            // TODO initiate deletefromjonohere, function base exists in fileupload.ts

        })
        .catch(function(err: Error) {
            console.log("Something went wrong with sending file: " + err);
        });



}

function getToken(res: Response) {
    // TODO ADD CODE HERE
}
module.exports = {
    IntervalTest: IntervalTest,
    checkQueue: checkQueue
};


