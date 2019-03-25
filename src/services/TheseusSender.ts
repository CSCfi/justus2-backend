import { Request, Response, NextFunction } from "express";
import { isFor } from "babel-types";
const request = require("request");
const rp = require("request-promise");
const path = require("path");

const kp = require("../koodistopalvelu");
const fs = require("fs");

// Database connection
const connection = require("./../db");
const testtoken = "72d10dfb-868c-4a65-8a77-afb7c1ad254a";

const BASEURL = "https://ds5-am-kktest.lib.helsinki.fi/rest/";
const fu = require("../queries/fileUpload");
const api = require("./../queries/subQueries");

const dbHelpers = require("./../databaseHelpers");

const savedFileName = "file.blob";


 class TheseusSender {

     // private static _instance: Theseus = new Theseus();
     //
     // // private _score:number = 0;
     //
     // constructor() {
     //     if (Theseus._instance) {
     //         throw new Error("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
     //     }
     //     Theseus._instance = this;
     // }
     //
     // public static getInstance(): Theseus {
     //     return Theseus._instance;
     // }


// For development purposes
     IntervalTest() {
         return console.log("Why doesnt it rain");
     }

// setInterval(() => IntervalTest, 1000);

     public async checkQueue() {
         const julkaisuIDt = await connection.db.query(
             "SELECT julkaisuid FROM julkaisujono INNER JOIN julkaisu ON julkaisujono.julkaisuid = julkaisu.id " +
             "AND julkaisu.julkaisuntila <> '' AND CAST(julkaisu.julkaisuntila AS INT) > 0", "RETURNING julkaisu.id");

         const self = this;
         console.log(self);
         console.log("The join SELECT: " + JSON.stringify(julkaisuIDt));

         julkaisuIDt.forEach(async function (e: any) {
             console.log("The id inside the for loop: " + e.julkaisuid);

             await self.postJulkaisuTheseus(e.julkaisuid);
         });
     }

     public async postJulkaisuTheseus(julkaisunID: any) {
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
        const queryAbstract = "SELECT abstract FROM julkaisuarkisto WHERE julkaisuid = " +
             "${id};";
         let julkaisuData: any = {};
         let description: any = {};
         let avainsanaData = [];
         let isbnData = [];
         let issnData = [];


         try {
             julkaisuData = await connection.db.one(queryJulkaisu, params);
             description = await connection.db.oneOrNone(queryAbstract, params);
             avainsanaData = await api.getAvainsana(julkaisunID);
             isbnData = await api.getIsbn(julkaisunID);
             issnData = await api.getIssn(julkaisunID);
         } catch (e) {
             console.log(e);
         }

         // console.log("the julkData:" + julkaisuData);
         // Not used for now, declaration unclear on which ones to be used for dc.contributor.author
         // const orgTekData = organisaatiotekijadata[0];

         const tempMetadataObject = [
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
             {"key": "dc.description.abstract", "value": description["abstract"]},
             {"key": "dc.type", "value": "publisher"},
         ];


         const metadataObject = {
             "name": julkaisuData["julkaisunnimi"],
             "metadata": [{"key": "dc.source.identifier", "value": julkaisuData["id"]}]
         };


         for (let i = 0; i < tempMetadataObject.length; i++) {
             if (tempMetadataObject[i]["value"] && tempMetadataObject[i]["value"] !== "") {
                 metadataObject.metadata.push(tempMetadataObject[i]);
             }
         }

         if (!this.arrayIsEmpty(avainsanaData)) {
             avainsanaData.forEach((value: any) => {
                 const avainsanaobject = {"key": "dc.subject", "value": value};
                 metadataObject.metadata.push(avainsanaobject);
             });
         }

         if (!this.arrayIsEmpty(isbnData)) {
             isbnData.forEach((value: any) => {
                 // console.log(value);
                 const isbnobject = {"key": "dc.identifier.isbn", "value": value};
                 metadataObject.metadata.push(isbnobject);
             });
         }

         if (!this.arrayIsEmpty(issnData)) {
             issnData.forEach((value: any) => {
                 // console.log(value);
                 const issnobject = {"key": "dc.identifier.issn", "value": value};
                 metadataObject.metadata.push(issnobject);
             });
         }

         const str = julkaisuData["tekijat"];
         const onetekija = str.split("; ");

         onetekija.forEach((value: any) => {
             const tekijatobject = {"key": "dc.contributor.author", "value": value}; // formaatti, sukunimi, etunimi
             metadataObject.metadata.push(tekijatobject);
         });

         console.log(metadataObject);
         const self = this;
         await self.sendPostReqTheseus(metadataObject, julkaisunID);
     }

     arrayIsEmpty(arr: any) {
         if (!arr || !arr[0] || arr[0] === "") {
             return true;
         } else {
             return false;
         }
     }


     async sendPostReqTheseus(sendObject: any, julkaisuID: any) {

         const self = this;

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
             .then(async function (res: Response) {
                 const itemID = (res as any)["id"];
                 console.log("The itemid: " + itemID);
                 const handle = (res as any)["handle"];
                 console.log("The handle: " + handle);
                 console.log(res);

                 await self.insertIntoArchiveTable(julkaisuID, itemID, handle);
             })
             .catch(function (err: Error) {
                 console.log("Something went wrong with posting item " + sendObject + " to url: " + BASEURL + "collections/13/items " + err);
             });
     }


     async insertIntoArchiveTable(julkaisuID: any, theseusItemID: any, theseusHandleID: any) {
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
             this.sendBitstreamToItem(julkaisuID, theseusItemID);
             console.log("IT IS IN THESEUS: " + julkaisuID);
         }
         else {
             console.log("Metadata for item updated");
         }
     }

     async sendBitstreamToItem(julkaisuID: any, theseusID: any) {
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
         // const filepath = "/opt/sources/publications/" + julkaisuID + "/" + filenamecleaned;
         const filePath = "publications/" + julkaisuID;
         const filePathFull = filePath + "/" + savedFileName;

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
                 file: fs.createReadStream(filePathFull)
             }
         };
         rp(options)
             .then(async function (res: Response, req: Request) {
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
             .then(async function () {
                 const deletefromJonoQuery = "DELETE from julkaisujono WHERE julkaisuid = " + "${id};";
                 await connection.db.any(deletefromJonoQuery, params);


                 await fu.deleteJulkaisuFile(filePath, savedFileName);
             })
             .catch(function (err: Error) {
                 console.log("Something went wrong with sending file: " + err);
             });


     }

     checkToken() {
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
             .then(async function (res: Response) {
                 const authenticated = (res as any)["authenticated"];
                 if (authenticated === "true") {
                     return true;

                 }
                 else {
                     return false;
                 }
             })
             .catch(function (err: Error) {
                 console.log("Error while checking token status: " + err);
             });
     }

     getToken() {
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
             .then(async function (res: Response) {
                 console.log(res);
                 return res;
             })
             .catch(function (err: Error) {
                 console.log("Error while deleting julkaisu: " + err);
             });
     }

     public async DeleteFromTheseus(id: any) {

         const params = {"id": id};
         const itemidquery = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
         const itemid = await connection.db.any(itemidquery, params);

         console.log(itemid);
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
             .then(async function (res: Response, req: Request) {
                 console.log("Successful delete" + res);
             })
             .catch(function (err: Error) {
                 console.log("Error while deleting julkaisu: " + id + " with error: " + err);
             });
     }

 }


async function PutTheseus(req: Request, id: any) {
    console.log("The req.body" + JSON.stringify(req.body));
    const tempMetadataObject = [
        {"key": "dc.title", "value": req.body.julkaisu["julkaisunnimi"]},
        {"key": "dc.type.okm", "value": req.body.julkaisu["julkaisutyyppi"]},
        {"key": "dc.date.issued", "value": req.body.julkaisu["julkaisuvuosi"]},
        {"key": "dc.relation.conference", "value": req.body.julkaisu["konferenssinvakiintunutnimi"]},
        {"key": "dc.relation.ispartof", "value": req.body.julkaisu["emojulkaisunnimi"]},
        {"key": "dc.contributor.editor", "value": req.body.julkaisu["emojulkaisuntoimittajat"]},
        {"key": "dc.relation.ispartofjournal", "value": req.body.julkaisu["lehdenjulkaisusarjannimi"]},
        {"key": "dc.relation.volume", "value": req.body.julkaisu["volyymi"]},
        {"key": "dc.relation.issue", "value": req.body.julkaisu["numero"]},
        {"key": "dc.relation.pagerange", "value": req.body.julkaisu["sivut"]},
        {"key": "dc.relation.articlenumber", "value": req.body.julkaisu["artikkelinumero"]},
        {"key": "dc.publisher", "value": req.body.julkaisu["kustantaja"]},
        {"key": "dc.language.iso", "value": req.body.julkaisu["julkaisunkieli"]},
        {"key": "dc.relation.doi", "value": req.body.julkaisu["doitunniste"]},
        {"key": "dc.okm.selfarchived", "value": req.body.julkaisu["julkaisurinnakkaistallennettu"]},
        {"key": "dc.identifier.uri", "value": req.body.julkaisu["rinnakkaistallennetunversionverkkoosoite"]},
        {"key": "dc.type", "value": "publisher"},
    ];
    const metadataObject: any = [];
    console.log("The req body sorted: " + JSON.stringify(tempMetadataObject));
    for (let i = 0; i < tempMetadataObject.length; i++) {
        if (tempMetadataObject[i]["value"] || tempMetadataObject[i]["value"] === "") {
            metadataObject.push(tempMetadataObject[i]);
        }
    }

    if (!arrayIsEmpty(req.body.avainsanat)) {
        req.body.avainsanat.forEach((value: any) => {
            const avainsanaobject = {"key": "dc.subject", "value": value};
            console.log("avainsanaobject: " + JSON.stringify(avainsanaobject));
            console.log("The metadataobject at avainsanastage: " + JSON.stringify(metadataObject));
            metadataObject.push(avainsanaobject);
        });
    }

    if (!arrayIsEmpty(req.body.julkaisu.isbn)) {
        req.body.julkaisu.isbn.forEach((value: any) => {
            // console.log(value);
            const isbnobject = {"key": "dc.identifier.isbn", "value": value};
            console.log("The isbnobject :" + JSON.stringify(isbnobject));
            metadataObject.push(isbnobject);
        });
    }

    if (!arrayIsEmpty(req.body.julkaisu.issn)) {
        req.body.julkaisu.issn.forEach((value: any) => {
            // console.log(value);
            const issnobject = {"key": "dc.identifier.issn", "value": value};
            metadataObject.push(issnobject);
        });
    }

    const str = req.body.julkaisu.tekijat;
    const onetekija = str.split("; ");

    onetekija.forEach((value: any) => {
        const tekijatobject = {"key": "dc.contributor.author", "value": value}; // formaatti, sukunimi, etunimi
        metadataObject.push(tekijatobject);
    });
    function arrayIsEmpty(arr: any) {
        if (!arr || !arr[0] || arr[0] === "") {
            return true;
        } else {
            return false;
        }
    }
    console.log("The final metadataobject sorted: " + JSON.stringify(metadataObject));

    const params = {"id": id};
    const itemidquery = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
    const itemid = await connection.db.any(itemidquery, params);
    console.log("The itemid for the item to be updated");
    const urlFinal = BASEURL + "items/" + itemid[0]["itemid"] + "/metadata";
    const headersOpt = {
        "rest-dspace-token": testtoken,
        "content-type": "application/json"
    };
    const options = {
        rejectUnauthorized: false,
        method: "PUT",
        uri: urlFinal,
        headers: headersOpt,
        body: metadataObject,
        encoding: "utf8",
    };
    rp(options)
    .then(async function (res: Response, req: Request) {
        console.log("Successful PUT" + res);
    })
    .catch(function (err: Error) {
        console.log("Error while updating julkaisu: " + id + " with error: " + err);
    });
 }
export const theseus = new TheseusSender();
module.exports = {
    PutTheseus: PutTheseus,
};