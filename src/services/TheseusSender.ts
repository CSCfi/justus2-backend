import { Request, Response, NextFunction } from "express";
import { isFor } from "babel-types";
const request = require("request");
const rp = require("request-promise");
const path = require("path");

const kp = require("../koodistopalvelu");
const fs = require("fs");

// Database connection
const connection = require("./../db");

const BASEURL = process.env.THESEUS_BASE_URL;

const fu = require("../queries/fileUpload");
const api = require("./../queries/subQueries");

const dbHelpers = require("./../databaseHelpers");

const savedFileName = "file.blob";

const publicationFolder = process.env.FILE_FOLDER;
const theseusAuthEmail = process.env.THESEUS_AUTH_EMAIL;
const theseusAuthPassword = process.env.THESEUS_AUTH_PASSWORD;
const theseusCollectionId = process.env.THESEUS_COLLECTION_ID;

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
    determineStatus = (val: any) => {
        if (val === "invalid") {
            console.log("Token is invaild! " + val);
            this.getToken();
        }
     };
     public async checkQueue() {
        const self = this;
         const julkaisuIDt = await connection.db.query(
             "SELECT julkaisuid FROM julkaisujono INNER JOIN julkaisu ON julkaisujono.julkaisuid = julkaisu.id " +
             "AND julkaisu.julkaisuntila <> '' AND CAST(julkaisu.julkaisuntila AS INT) > 0", "RETURNING julkaisu.id");
             console.log("The initial token: " + process.env.TOKEN);
             this.checkToken(this.determineStatus);

         console.log(self);
         console.log("The join SELECT: " + JSON.stringify(julkaisuIDt));

         julkaisuIDt.forEach(async function (e: any) {
             console.log("The id inside the for loop: " + e.julkaisuid);

             await self.postJulkaisuTheseus(e.julkaisuid);
         });
     }

     public async postJulkaisuTheseus(julkaisunID: any) {
         // const collectionsUrl = "colletions/";

         // TODO: first check if publication already has itemid in archive table. If so, send only publication and remove julkaisuid from queue

         // TODO: ADD SPECIFIC ORG COLLECTION ID HERE
         // Add unique collections ID:s that are matched according to the organisational id
         // The organisational id is inside the julkaisu taulukko
         // const orgCollection = "something";
         const params = {"id": julkaisunID};
         // ALL queries for the metadataobject
         const julkaisuTableFields = dbHelpers.getTableFields("julkaisu", true);
         const queryJulkaisu = "SELECT julkaisu.id, " + julkaisuTableFields + " FROM julkaisu WHERE id = " +
             "${id};";
        const queryAbstractAndUrn = "SELECT abstract, urn FROM julkaisuarkisto WHERE julkaisuid = " +
             "${id};";
         const julkaisuData: any = {};
         let arkistoData: any = {};

         try {
             julkaisuData["julkaisu"] = await connection.db.one(queryJulkaisu, params);
             arkistoData = await connection.db.oneOrNone(queryAbstractAndUrn, params);
             julkaisuData["avainsanat"] = await api.getAvainsana(julkaisunID);
             julkaisuData["isbn"] = await api.getIsbn(julkaisunID);
             julkaisuData["issn"] = await api.getIssn(julkaisunID);
         } catch (e) {
             console.log(e);
         }

         julkaisuData["description"] = arkistoData.abstract;
         julkaisuData["urn"] = arkistoData.urn;
         const metadataObject =  await this.mapTheseusFields(julkaisunID, julkaisuData, "post");

         const self = this;
         await self.sendPostReqTheseus(metadataObject, julkaisunID);
     }

     async sendPostReqTheseus(sendObject: any, julkaisuID: any) {

         const self = this;

         const headersOpt = {
             "rest-dspace-token": process.env.TOKEN,
             "content-type": "application/json"
         };
         const options = {
             rejectUnauthorized: false,
             method: "POST",
             uri: BASEURL + "collections/" + theseusCollectionId + "/items/",
             headers: headersOpt,
             body: sendObject,
             json: true,
             encoding: "utf8",
         };

         console.log(options.uri);
         console.log(sendObject);
         console.log(headersOpt);

         rp(options)
             .then(async function (res: Response) {
                 const itemID = (res as any)["id"];
                 console.log("The itemid: " + itemID);
                 const handle = (res as any)["handle"];
                 console.log("The handle: " + handle);
                 console.log(res);

                 await self.insertIntoArchiveTable(julkaisuID, itemID, handle);
             })
             .catch(function (res: Response, err: Error) {
                 console.log("Something went wrong with posting item " + sendObject + " to url: " + BASEURL + "collections/" + theseusCollectionId + "/items " + err + " And the full error response: " + (res as any));
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
         const embargo = await connection.db.oneOrNone(embargoquery, params);
         const filename = await connection.db.any(filenamequery, params);
         const filenamecleaned = filename[0]["filename"].replace(/^"(.*)"$/, "$1");
         let embargodate;

         if (!embargo.embargo) {
             embargodate = new Date().toISOString().split("T")[0];
         } else {
             embargodate = embargo.embargo.toISOString().split("T")[0];
         }

         // TODO SPLIT EMBARGO FOR URLFINAL
         console.log("The embargodate: " + embargodate);
         const year = embargodate.split("-")[0];
         const month = embargodate.split("-")[1];
         const day = embargodate.split("-")[2];
         const filePath =  publicationFolder + "/" + julkaisuID;
         const filePathFull = filePath + "/" + savedFileName;
         const urlFinal = BASEURL + "items/" + theseusID + "/bitstreams?name=" + filenamecleaned + "&description=" + filenamecleaned + "&groupId=0&year=" + year + "&month=" + month + "&day=" + day;
         console.log("Thefinalurl: " + urlFinal);
         const headersOpt = {
             "rest-dspace-token": process.env.TOKEN,
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

     async checkToken(callback: any) {
         // TODO ADD CODE HERE

         const urlFinal = BASEURL + "status";
         const headersOpt = {
             "rest-dspace-token": process.env.TOKEN,
             "content-type": "application/json"
         };
         const options = {
             rejectUnauthorized: false,
             method: "GET",
             uri: urlFinal,
             headers: headersOpt,
             json: true,
             encoding: "utf8",
         };

         rp(options)
             .then(async function (res: Response) {
                 const authenticated = (res as any)["authenticated"];
                    // authcheck === authenticated;
                    console.log("The authcheck const: " + authenticated);
                if (await authenticated != true) {
                     return await callback("invalid");
                 }
                 else {
                     return await callback("valid");
                 }
             })
             .catch(function (err: Error) {
                 console.log("Error while checking token status: " + err + " the urlfinal " + urlFinal);
             });
     }

     getToken() {
         const urlFinal = BASEURL + "login";
         const metadataobj = {"email": theseusAuthEmail, "password": theseusAuthPassword};
         const headersOpt = {
             "content-type": "application/json",
         };
         const options = {
             rejectUnauthorized: false,
             method: "POST",
             uri: urlFinal,
             headers: headersOpt,
             body: metadataobj,
             json: true,
             encoding: "utf8",
         };
         rp(options)
             .then(async function (res: Response) {
                 console.log("The new token: " + (res as any));
                 process.env.TOKEN = (res as any);
             })
             .catch(function (err: Error) {
                 console.log("Error while getting new token: " + err);
             });
     }

     public async DeleteFromTheseus(id: any) {

         const params = {"id": id};
         const itemidquery = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
         const itemid = await connection.db.any(itemidquery, params);

         console.log(itemid);
         const urlFinal = BASEURL + "items/" + itemid[0]["itemid"];
         const headersOpt = {
             "rest-dspace-token": process.env.TOKEN,
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



public async PutTheseus(metadataObject: any, id: any) {

    //  TODO: update also embargo time and abstract

    const params = {"id": id};
    const itemidquery = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
    let itemid: any;

    try {
        itemid = await connection.db.one(itemidquery, params);
    }
    catch (e) {
    console.log(e);
    }

    console.log(itemid);
    console.log(itemid.itemid);
    console.log("The itemid for the item to be updated" + itemid.itemid);
    const urlFinal = BASEURL + "items/" + itemid.itemid + "/metadata";
    console.log(urlFinal);
    const headersOpt = {
        "rest-dspace-token": process.env.TOKEN,
        "content-type": "application/json"
    };

    const options = {
        rejectUnauthorized: false,
        method: "PUT",
        uri: urlFinal,
        headers: headersOpt,
        body: metadataObject,
        json: true,
        encoding: "utf8",
    };

    rp(options)
    .then(async function (res: Response, req: Request) {
        console.log("Successful PUT" + res as any);
    })
    .catch(function (err: Error) {
        console.log("Error while updating julkaisu: " + id + " with error: " + err);

    });

    }

     public async mapTheseusFields(id: any, obj: any, method: string) {

         let julkaisuData: any = {};
         let avainsanaData;
         let isbnData;
         let issnData;
         let description = "";
         let urn;

         if (method === "put") {
             julkaisuData = obj.julkaisu;
             avainsanaData = obj.avainsana;
             isbnData = obj.julkaisu.isbn;
             issnData = obj.julkaisu.issn;
         } else {
             julkaisuData = obj.julkaisu;
             avainsanaData = obj.avainsana;
             isbnData = obj.isbn;
             issnData = obj.issn;
             description = obj.description;
             urn = obj.urn;
         }



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
             {"key": "dc.type", "value": "publication"},
         ];


         const metadataObject =
             [{"key": "dc.source.identifier", "value": id }];


         for (let i = 0; i < tempMetadataObject.length; i++) {
             if (tempMetadataObject[i]["value"] && tempMetadataObject[i]["value"] !== "") {
                 metadataObject.push(tempMetadataObject[i]);
             }
         }

         if (!this.arrayIsEmpty(avainsanaData)) {
             avainsanaData.forEach((value: any) => {
                 const avainsanaobject = {"key": "dc.subject", "value": value};
                 metadataObject.push(avainsanaobject);
             });
         }

         if (!this.arrayIsEmpty(isbnData)) {
             isbnData.forEach((value: any) => {
                 // console.log(value);
                 const isbnobject = {"key": "dc.identifier.isbn", "value": value};
                 metadataObject.push(isbnobject);
             });
         }

         if (!this.arrayIsEmpty(issnData)) {
             issnData.forEach((value: any) => {
                 // console.log(value);
                 const issnobject = {"key": "dc.identifier.issn", "value": value};
                 metadataObject.push(issnobject);
             });
         }

         const str = julkaisuData["tekijat"];
         const onetekija = str.split("; ");

         onetekija.forEach((value: any) => {
             const tekijatobject = {"key": "dc.contributor.author", "value": value}; // formaatti, sukunimi, etunimi
             metadataObject.push(tekijatobject);
         });


         let postMetadataObject: any = {};

         if (method === "post") {
             postMetadataObject = {
                 "name": julkaisuData["julkaisunnimi"],
                 "metadata": metadataObject
             };
             postMetadataObject.metadata.push({"key": "dc.description.abstract", "value": description });
             postMetadataObject.metadata.push({"key": "dc.identifier.urn", "value": urn });
         }

         if (method === "post") {
             return postMetadataObject;
         } else {
             return metadataObject;
         }
     }


     arrayIsEmpty(arr: any) {
         if (!arr || !arr[0] || arr[0] === "") {
             return true;
         } else {
             return false;
         }
     }

 }
export const theseus = new TheseusSender();
