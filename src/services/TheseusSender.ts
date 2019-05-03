import { Request, Response, NextFunction } from "express";
const request = require("request");
const rp = require("request-promise");
const path = require("path");

const kp = require("../koodistopalvelu");
const fs = require("fs");
const slugify = require("slugify");

// Database connection
const connection = require("./../db");

const BASEURL = process.env.THESEUS_BASE_URL;

const fu = require("../queries/fileUpload");
const api = require("./../queries/subQueries");

const dbHelpers = require("./../databaseHelpers");

const savedFileName = "file.blob";
const organisationConfig = require("./../organization_config");
const domainMapping = organisationConfig.domainMappings;

const publicationFolder = process.env.FILE_FOLDER;
const theseusAuthEmail = process.env.THESEUS_AUTH_EMAIL;
const theseusAuthPassword = process.env.THESEUS_AUTH_PASSWORD;
const urnIdentifierPrefix = process.env.URN_IDENTIFIER_PREFIX;


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
             await this.checkToken(this.determineStatus);

         julkaisuIDt.forEach(async function (e: any) {
             console.log("The id inside the for loop: " + e.julkaisuid);

             await self.postJulkaisuTheseus(e.julkaisuid);
         });
     }

     public async postJulkaisuTheseus(julkaisunID: any) {

         const itemId = await this.itemIdExists(julkaisunID);
         if (itemId.itemid) {
             // if itemid already exists, send only publication
             await this.sendBitstreamToItem(julkaisunID, itemId.itemid);
         } else {
             // TODO: ADD SPECIFIC ORG COLLECTION ID HERE
             // Add unique collections ID:s that are matched according to the organisational id
             // The organisational id is inside the julkaisu taulukko
             // const orgCollection = "something";
             const params = {"id": julkaisunID};
             // ALL queries for the metadataobject
             const julkaisuTableFields = dbHelpers.getTableFields("julkaisu", true);
             const queryJulkaisu = "SELECT julkaisu.id, " + julkaisuTableFields + " FROM julkaisu WHERE id = " +
                 "${id};";

             let arkistotableFields = dbHelpers.julkaisuarkistoUpdateFields;
             arkistotableFields =  arkistotableFields.join(",");

             const queryArkistoTable = "SELECT urn, " + arkistotableFields + " FROM julkaisuarkisto WHERE julkaisuid = " +
                 "${id};";
             const julkaisuData: any = {};
             let arkistoData: any = {};

             try {
                 julkaisuData["julkaisu"] = await connection.db.one(queryJulkaisu, params);
                 arkistoData = await connection.db.oneOrNone(queryArkistoTable, params);
                 julkaisuData["avainsanat"] = await api.getAvainsana(julkaisunID);
                 julkaisuData["isbn"] = await api.getIsbn(julkaisunID);
                 julkaisuData["issn"] = await api.getIssn(julkaisunID);
             } catch (e) {
                 console.log(e);
             }

             julkaisuData["filedata"] = arkistoData;
             const metadataObject =  await this.mapTheseusFields(julkaisunID, julkaisuData, "post");

             const self = this;
             await self.sendPostReqTheseus(metadataObject, julkaisunID, julkaisuData["julkaisu"]["organisaatiotunnus"]);
         }

     }

     async sendPostReqTheseus(sendObject: any, julkaisuID: any, org: any) {

         const self = this;
         let theseusCollectionId: string;

         if (process.env.NODE_ENV === "prod") {
             console.log("Environment is prod");
             theseusCollectionId = this.mapCollectionId(org);
             console.log(theseusCollectionId);
         } else {
             theseusCollectionId = process.env.THESEUS_COLLECTION_ID;
         }

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
             await this.sendBitstreamToItem(julkaisuID, theseusItemID);
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
         const filename = await connection.db.oneOrNone(filenamequery, params);
         const filenamecleaned = await slugify(filename["filename"].toString(), "_");

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
         const urlFinal = BASEURL + "items/" + theseusID + "/bitstreams?name=" + filenamecleaned + "&description=" + filenamecleaned + "&groupId=0&year=" + year + "&month=" + month + "&day=" + day + "&expand=policies";
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
                 // If both are needed, merge insert into one statement.
                 const bitstreamid = (res as any)["id"];
                 console.log("catching the bitstream id from response" + bitstreamid);
                 const policyid = (res as any)["policyid"];
                 const params = {"id": julkaisuID};
                 const bitstreamquery = "UPDATE julkaisuarkisto SET bitstreamid=" + bitstreamid + " WHERE julkaisuid = " + "${id};";
                 const policyidquery = "UPDATE julkaisuarkisto SET policyid=" + policyid + " WHERE julkaisuid = " + "${id};";
                 await connection.db.any(bitstreamquery, params);
                 await connection.db.any(policyidquery, params);

             })
             .then(async function () {
                 const deletefromJonoQuery = "DELETE from julkaisujono WHERE julkaisuid = " + "${id};";
                 await connection.db.any(deletefromJonoQuery, params);

                 const urnQuery = "SELECT urn FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
                 const urn = await connection.db.oneOrNone(urnQuery, params);

                 const rinnakkaistallennetunversionverkkoosoite = {"rinnakkaistallennetunversionverkkoosoite":  urnIdentifierPrefix + urn.urn };
                 const updateUrn = connection.pgp.helpers.update(rinnakkaistallennetunversionverkkoosoite, ["rinnakkaistallennetunversionverkkoosoite"], "julkaisu") + "WHERE id = " +  parseInt(julkaisuID);

                 await connection.db.none(updateUrn);
                 await fu.deleteJulkaisuFile(filePath, savedFileName);

                 console.log("Successfully sent publication with id " + julkaisuID + " to Theseus and updated all data!");
             })
             .catch(function (err: Error) {
                 console.log("Something went wrong with sending file: " + err);
             });
     }

     async checkToken(callback: any) {
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
     public async prepareUpdateEmbargo(id: any, embargoobj: any) {
        const self = this;
        const params = {"id": id};
        const policyidquery = "SELECT policyid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
        const policyid = await connection.db.any(policyidquery, params);
        const bitstreamidquery = "SELECT bitstreamid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
        const bitstreamid = await connection.db.any(bitstreamidquery, params);

        const urlFinal = BASEURL + "bitstreams/" + bitstreamid + "/policy/" + policyid;
        const headersOpt = {
            "rest-dspace-token": process.env.TOKEN,
            "content-type": "application/json",
        };
        const options = {
            rejectUnauthorized: false,
            method: "DELETE",
            uri: urlFinal,
            headers: headersOpt,
        };
        rp(options)
            .then(async function (res: Response) {
                self.UpdateEmbargo(id, embargoobj, bitstreamid);
            })
            .catch(function (err: Error) {
                console.log("Error while deleting embargotime for julkaisuid: " + id + " with error: " + err);
            });

     }
     async UpdateEmbargo(id: any , embargoobj: any, bitstreamid: any) {
        const embargo = embargoobj["embargo"];
        const embargocleaned = embargo.toISOString().split("T")[0];
        const metadataobj = {
                "action": "READ",
                "epersonId": "",
                "groupId": 0,
                "resourceId": 2,
                "resourceType": "bitstream",
                "rpDescription": "",
                "rpName": "",
                "rpType": "TYPE_CUSTOM",
                "startDate": embargocleaned,
                "endDate": "",
        };

        const urlFinal = BASEURL + "bitstreams/" + bitstreamid + "/policy";
        const headersOpt = {
            "rest-dspace-token": process.env.TOKEN,
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
                console.log("Embargo updated for julkaisuid: " + id);
            })
            .catch(function (err: Error) {
                console.log("Error while posting new embargotime for julkaisuid: " + id + " with err: " + err);
            });

     }
     public async DeleteFromTheseus(id: any) {

         const params = {"id": id};
         const itemidquery = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
         const itemid = await connection.db.any(itemidquery, params);

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
    //  TODO: update also embargo time
    const params = {"id": id};
    const itemidquery = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
    let itemid: any;

    try {
        itemid = await connection.db.one(itemidquery, params);
    }
    catch (e) {
    console.log(e);
    }

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

         let isbnData;
         let issnData;

         const julkaisuData = obj.julkaisu;
         const fileData = obj.filedata;
         const avainsanaData = obj.avainsanat;

         if (method === "put") {
             isbnData = obj.julkaisu.isbn;
             issnData = obj.julkaisu.issn;

         } else {
             isbnData = obj.isbn;
             issnData = obj.issn;
         }

         const tempMetadataObject = [
             {"key": "dc.title", "value": julkaisuData["julkaisunnimi"]},
             {"key": "dc.type.okm", "value": this.mapJulkaisuTyyppiFields(julkaisuData["julkaisutyyppi"])},
             {"key": "dc.contributor.organization", "value": this.mapOrganizationFields(julkaisuData["organisaatiotunnus"])},
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
             {"key": "dc.description.abstract", "value": fileData["abstract"]},
             {"key": "dc.identifier.urn", "value": fileData["urn"] },
             {"key": "dc.type", "value": "publication"},
             {"key": "dc.type.other", "value": fileData["julkaisusarja"]},
         ];


         const metadataObject =
             [{"key": "dc.source.identifier", "value": id }];


         // remove empty values
         for (let i = 0; i < tempMetadataObject.length; i++) {
             if (tempMetadataObject[i]["value"] && tempMetadataObject[i]["value"] !== "") {
                 metadataObject.push(tempMetadataObject[i]);
             }
         }

         let oikeudetObject;
         if (fileData["oikeudet"] && fileData["oikeudet"] === "All rights reserved") {
             oikeudetObject = {"key": "dc.rights", "value": "All rights reserved. This publication is copyrighted. You may download, display and print it for Your own personal use. Commercial use is prohibited."};
             metadataObject.push(oikeudetObject);
         } else if (fileData["oikeudet"] && fileData["oikeudet"] !== "") {
             oikeudetObject = {"key": "dc.rights", "value": fileData["oikeudet"]};
             metadataObject.push(oikeudetObject);
         }


         if (fileData["versio"] && fileData["versio"] !== "") {
             const versio =  await this.mapVersioFields(fileData["versio"]);
             const versionObject = {"key": "dc.type.version", "value": versio};
             metadataObject.push(versionObject);
         }

         if (!this.arrayIsEmpty(avainsanaData)) {
             avainsanaData.forEach((value: any) => {
                 const avainsanaobject = {"key": "dc.subject", "value": value};
                 metadataObject.push(avainsanaobject);
             });
         }

         if (!this.arrayIsEmpty(isbnData)) {
             isbnData.forEach((value: any) => {
                 const isbnobject = {"key": "dc.identifier.isbn", "value": value};
                 metadataObject.push(isbnobject);
             });
         }

         if (!this.arrayIsEmpty(issnData)) {
             issnData.forEach((value: any) => {
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


     async itemIdExists(julkaisuid: any) {
         const params = {"id": julkaisuid};
         const queryItemId = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " +
             "${id};";

         const data = await connection.db.oneOrNone(queryItemId, params);
         return data;
     }

     async mapVersioFields(data: any) {
         let version;

         if (data === "0") {
             version = "fi=Final draft|sv=Final draft |en=Final draft|";
         }
         if (data === "1") {
             version = "fi=Publisher's version|sv=Publisher's version|en=Publisher's version|";
         }
         if (data === "2") {
             version = "fi=Pre-print -versio|sv=Pre-print |en=Pre-print|";
         }

         return version;

     }

     mapJulkaisuTyyppiFields(tyyppi: any) {

         let theseusFormat;

         if (tyyppi === "A1") {
             theseusFormat = "fi=A1 Alkuperäisartikkeli tieteellisessä aikakauslehdessä|sv=A1 Originalartikel i en vetenskaplig tidskrift|en=A1 Journal article (refereed), original research|";
         }
        if (tyyppi === "A2") {
            theseusFormat = "fi=A2 Katsausartikkeli tieteellisessä aikakauslehdessä|sv=A2 Översiktsartikel i en vetenskaplig tidskrift|en=A2 Review article, Literature review, Systematic review|";
        }
        if (tyyppi === "A3") {
            theseusFormat = "fi=A3 Kirjan tai muun kokoomateoksen osa|sv=A3 Del av bok eller annat samlingsverk|en=A3 Book section, Chapters in research books|";
        }
        if (tyyppi === "A4") {
            theseusFormat = "fi=A4 Artikkeli konferenssijulkaisussa|sv=A4 Artikel i en konferenspublikation|en=A4 Conference proceedings|";
        }
        if (tyyppi === "B1") {
            theseusFormat = "fi=B1 Kirjoitus tieteellisessä aikakauslehdessä|sv=B1 Inlägg i en vetenskaplig tidskrift|en=B1 Non-refereed journal articles|";
        }
        if (tyyppi === "B2") {
            theseusFormat = "fi=B2 Kirjan tai muun kokoomateoksen osa|sv=B2 Del av bok eller annat samlingsverk|en=B2 Book section|";
        }
        if (tyyppi === "B3") {
            theseusFormat = "fi=B3 Vertaisarvioimaton artikkeli konferenssijulkaisussa|sv=B3 Icke-referentgranskad artikel i konferenspublikation|en=B3 Non-refereed conference proceedings|";
        }
        if (tyyppi === "C1") {
            theseusFormat = "fi=C1 Kustannettu tieteellinen erillisteos|sv=C1 Separat utgivet vetenskapligt verk|en=C1 Book|";
        }
        if (tyyppi === "C2") {
            theseusFormat =  "fi=C1 Kustannettu tieteellinen erillisteos|sv=C1 Separat utgivet vetenskapligt verk|en=C1 Book|";
        }
        if (tyyppi === "D1") {
            theseusFormat = "fi=D1 Artikkeli ammattilehdessä|sv=D1 Artikel i en facktidskrift|en=D1 Article in a trade journal|";
        }
        if (tyyppi === "D2") {
            theseusFormat = "fi=D2 Artikkeli ammatillisessa kokoomateoksessa (ml. toimittajan kirjoittama johdantoartikkeli)|sv=D2 Artikel i ett yrkesinriktat samlingsverk (inkl. inledningsartikel som skrivits av redaktören)|en=D2 Article in a professional book (incl. an introduction by the editor)|";
        }
        if (tyyppi === "D3") {
            theseusFormat = "fi=D3 Artikkeli ammatillisessa konferenssijulkaisussa|sv=D3 Artikel i en yrkesinriktad konferenspublikation|en=D3 Professional conference proceedings|";
        }
        if (tyyppi === "D4") {
            theseusFormat = "fi=D4 Julkaistu kehittämis- tai tutkimusraportti taikka selvitys|sv=D4 Publicerad utvecklings eller forskningsrapport eller -utredning|en=D4 Published development or research report or study|";
        }
        if (tyyppi === "D5") {
            theseusFormat = "fi=D5 Ammatillinen kirja|sv=D5 Yrkesinriktad bok|en=D5 Textbook, professional manual or guide|";
        }
        if (tyyppi === "D6") {
            theseusFormat = "fi=D6 Toimitettu ammatillinen teos|sv=D6 Redigerat yrkesinriktat verk|en= D6 Edited professional book|";
        }
        if (tyyppi === "E1") {
            theseusFormat = "fi=E1 Yleistajuinen artikkeli, sanomalehtiartikkeli|sv=E1 Populärartikel, tidningsartikel|en=E1 Popularised article, newspaper article|";
        }
        if (tyyppi === "E2") {
            theseusFormat = "fi=E2 Yleistajuinen monografia|sv=E2 Populärmonografi|en=E2 Popularised monograph|";
        }
        if (tyyppi === "E3") {
            theseusFormat = "fi=E3 Toimitettu yleistajuinen teos|sv=E3 Redigerat populärverk|en=E3 Edited popular book|";
        }
        if (tyyppi === "F1") {
            theseusFormat = "fi=F1 Erillisjulkaisu|sv=F1 Separat publikation|en=F1 Published independent work of art|";
        }
        if (tyyppi === "F2") {
            theseusFormat = "fi=F2 Julkinen taiteellinen teoksen osatoteutus|sv=F2 Offentlig medverkan i ett konstnärligt verk|en=F2 Public partial realisation of a work of art|";
        }
        if (tyyppi === "F3") {
            theseusFormat = "fi=F3 Ei-taiteellisen julkaisun taiteellinen osa|sv=F3 Konstnärlig del av en icke-konstnärlig publikation|en=F3 Artistic part of a non-artistic publication|";
        }
        if (tyyppi === "G1") {
            theseusFormat = "fi=G1 Ammattikorkeakoulututkinnon opinnäytetyö, kandidaatintyö|sv=G1 Lärdomsprov för yrkeshögskoleexamen, kandidatavhandling|en=G1 Polytechnic thesis, Bachelor’s thesis|";
        }
        if (tyyppi === "G2") {
            theseusFormat = "fi=G2 Pro gradu, diplomityö, ylempi amk-opinnäytetyö|sv=G2 Pro gradu-avhandling, diplomarbete, högre YH-lärdomsprov|en=G2 Master’s thesis, polytechnic Master’s thesis|";
        }
        if (tyyppi === "G3") {
            theseusFormat = "fi=G3 Lisensiaatintyö|sv=G3 Licentiatavhandling|en=G3 Licentiate thesis|";
        }
        if (tyyppi === "G4") {
            theseusFormat = "fi=G4 Monografiaväitöskirja|sv=G4 Monografiavhandling|en=G4 Doctoral dissertation (monograph)|";
        }
        if (tyyppi === "G5") {
            theseusFormat = "fi=G5 Artikkeliväitöskirja|sv=G5 Artikelavhandling|en=G5 Doctoral dissertation (article)|";
        }

        return theseusFormat;

     }

     mapOrganizationFields(org: any) {
         let theseusFormat = "";

         for (let i = 0; i < domainMapping.length; i++) {
             if (domainMapping[i].code === org) {
                 theseusFormat = domainMapping[i].theseusData.theseusCode;
             }
         }

         return theseusFormat;
     }

     mapCollectionId(org: any) {
         let collectionId = "";

         for (let i = 0; i < domainMapping.length; i++) {
             if (domainMapping[i].code === org) {
                 collectionId = domainMapping[i].theseusData.theseusCollectionId;
             }
         }

        return collectionId;

     }


 }
export const theseus = new TheseusSender();
