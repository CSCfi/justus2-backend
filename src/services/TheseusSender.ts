import { Request, Response, NextFunction } from "express";
const request = require("request");
const rp = require("request-promise");
const path = require("path");

const kp = require("../koodistopalvelu");
const fs = require("fs");
const slugify = require("slugify");
const as = require("./authService");

// Database connection
const connection = require("./../db");

const BASEURL = process.env.THESEUS_BASE_URL;
const JUKURIURL = process.env.JUKURI_BASE_URL;

const fu = require("../queries/fileUpload");
const api = require("./../queries/subQueries");
const oh = require("./../objecthandlers");

const dbHelpers = require("./../databaseHelpers");

const savedFileName = "file.blob";
const organisationConfig = require("./../organization_config");
const domainMapping = organisationConfig.domainMappings;

const publicationFolder = process.env.FILE_FOLDER;
const theseusAuthEmail = process.env.THESEUS_AUTH_EMAIL;
const theseusAuthPassword = process.env.THESEUS_AUTH_PASSWORD;
const urnIdentifierPrefix = process.env.URN_IDENTIFIER_PREFIX;

const jukuriAuthEmail = process.env.JUKURI_AUTH_EMAIL;
const jukuriAuthPassword = process.env.JUKURI_AUTH_PASSWORD;

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
    // determineStatus = (val: any, version: any) => {
    //     const self = this;
    //     if (val === false) {
    //         console.log("Token is invalid! " + val + " for the version: " + version);
    //         self.getToken(version);
    //     }

    //     else {
    //         console.log("Token is valid for version: " + version);
    //         this.launchPost();

    //     }
    //  };


    public async tokenHandler(version: any): Promise<any> {
        const self = this;
        return new Promise(function(resolve: any, reject: any) {
        self.checkToken(version).then(async function() {
            console.log("The token was valid for version: " + version);
            resolve(version);
         }).catch(async function(msg: any) {
            console.log("The token for " + version + " was invalid! Proceeding to get a new token , this is the res " + msg);
            self.getToken(version).then(async function(msg: any) {
            resolve(version);        
            }).catch(function() {
                reject(version);
                console.log("Something went wrong when getting a new token");
            });
     });
        });
}
     public async checkQueue() {
        const self = this;
        const versions = [
                    {
                        name: "theseus"
                    },
                    {
                        name: "jukuri"  
                    }
                ];
                versions.forEach(async function(e: any) {
                    console.log("The versions: " + e.name);
                    self.tokenHandler(e.name)
                    .then((version: any) => {
                        self.launchPost(version);
                    }
                    ).catch((msg: any) => {
                        console.log("Something went wrong with getting a new token for " + e.name +  " and msg " + msg);
                    }
                    );
                });
    }



    public async launchPost(version: any)  {
       const self = this;
       let token;
       if (version === "jukuri") {
           token = process.env.JUKURI_TOKEN;
       }
       else {
           token = process.env.TOKEN;
       }
       const julkaisuIDt = await connection.db.query(
           "SELECT julkaisujono.julkaisuid, julkaisu.organisaatiotunnus FROM julkaisujono, julkaisu WHERE julkaisu.id = julkaisujono.julkaisuID " + 
           "AND julkaisu.julkaisuntila <> '' AND CAST(julkaisu.julkaisuntila AS INT) > 0", "RETURNING *");
           console.log("The initial token: " + token + " for version " + version);
           console.log("The julkaisuIDt object " + JSON.stringify(julkaisuIDt));
           julkaisuIDt.forEach(async function (e: any) {
               const jukuriPublication: boolean = self.isJukuriPublication(e.organisaatiotunnus);
               if (jukuriPublication && version === "jukuri") {
                   console.log("The whole julkaisuIDt object for jukuri " + JSON.stringify(e));
                   // The jukuri string we are sending is purely for testing purposes, to confirm that the right one is being sent through
                   await self.postJulkaisuTheseus(e.julkaisuid, "jukuri");
               }
               else if (!jukuriPublication && version === "theseus") {
                   console.log("The whole julkaisuIDt object for theseus " + JSON.stringify(e));
                   await self.postJulkaisuTheseus(e.julkaisuid);
               }
           });
           
    }


    public async postJulkaisuTheseus(julkaisunID: any, version?: any) {
        // Purely for testing, to see that the right version is coming in 
        // if (version) {
        //     console.log("The julkaisuid incoming for jukuri: " + julkaisunID);
        // }
        // else {
        //     console.log("The julkaisuid incoming for theseus: " + julkaisunID);
        // }


        const itemId = await this.itemIdExists(julkaisunID);
        if (itemId && itemId.itemid) {
            // if itemid already exists, send only publication
            let jukuriPublication;
            if (version === "jukuri") {
                jukuriPublication = true;
            } else {
                jukuriPublication = false;
            }
            await this.sendBitstreamToItem(julkaisunID, itemId.itemid, jukuriPublication);
        } else {
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
                julkaisuData["julkaisu"]["isbn"] = await api.getIsbn(julkaisunID);
                julkaisuData["julkaisu"]["issn"] = await api.getIssn(julkaisunID);
                julkaisuData["julkaisu"]["projektinumero"] = await api.getProjektinumero(julkaisunID);
                julkaisuData["tieteenala"] = await api.getTieteenala(julkaisunID);
                julkaisuData["organisaatiotekija"] = await api.getOrganisaatiotekija(julkaisunID);
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

         let jukuriPublication: boolean = false;
         const orgnizationValues = domainMapping.find((x: any) => x.code === org);

         let baseURL = BASEURL;
         let token = process.env.TOKEN;
         let collectionID: string;


         const self = this;

         if (orgnizationValues.jukuriData) {
             jukuriPublication = true;
             baseURL = JUKURIURL;
             token = process.env.JUKURI_TOKEN;
         }


         if (process.env.NODE_ENV === "prod") {
             collectionID = this.mapCollectionId(orgnizationValues, jukuriPublication);
         } else   {
             if (jukuriPublication) {
                 collectionID = process.env.JUKURI_COLLECTION_ID;
             } else {
                 collectionID = process.env.THESEUS_COLLECTION_ID;
             }
         }

         const headersOpt = {
             "rest-dspace-token": token,
             "content-type": "application/json"
         };
         const options = {
             rejectUnauthorized: false,
             method: "POST",
             uri: baseURL + "collections/" + collectionID + "/items/",
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

                 await self.insertIntoArchiveTable(julkaisuID, itemID, handle, jukuriPublication);
             })
             .catch(function (res: Response, err: Error) {
                 console.log("Something went wrong with posting item " + sendObject + " with julkaisuid " + julkaisuID + " to url: " + baseURL + "collections/" + collectionID + "/items " + err + " And the full error response: " + (res as any));
             });

     }


     async insertIntoArchiveTable(julkaisuID: any, theseusItemID: any, theseusHandleID: any, jukuriPublication: boolean) {

        const paramss = {"id": julkaisuID};
        const queryitemid = "UPDATE julkaisuarkisto SET itemid=" + theseusItemID + "WHERE julkaisuid = " +
            "${id};";
        const queryhandle = "UPDATE julkaisuarkisto SET handle=" + "'" + theseusHandleID + "'" + "WHERE julkaisuid = " +
            "${id};";
        await connection.db.any(queryitemid, paramss);
        await connection.db.any(queryhandle, paramss);

        const fileExists = await this.isFileUploaded(julkaisuID);

        console.log("The stuff in insert temp table: " + julkaisuID + " " + theseusItemID + " " + theseusHandleID);

        if (fu.isPublicationInTheseus(julkaisuID)) {
            try {
                if (fileExists) {
                    await this.sendBitstreamToItem(julkaisuID, theseusItemID, jukuriPublication);
                    console.log("IT IS IN THESEUS: " + julkaisuID);
                } else {
                    const params = {"id": julkaisuID};
                    await connection.db.result("DELETE FROM julkaisujono WHERE julkaisuid = ${id}", params);
                    console.log("Metadata for julkaisu " + julkaisuID + " inserted");
                }
            } catch (e) {
                console.log("Error in sending  publication and its metadata to Thseus: " + e);
            }
     }
        else {
            console.log("Metadata for item updated");
        }
    }

    async sendBitstreamToItem(julkaisuID: any, theseusID: any, jukuriPublication: boolean) {
        console.log("The julkaisuID when we are sending bistream: " + julkaisuID + " and the theseusID: " + theseusID);
        const params = {"id": julkaisuID};
        const embargoquery = "SELECT embargo FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
        const filenamequery = "SELECT filename FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
        const embargo = await connection.db.oneOrNone(embargoquery, params);
        const filename = await connection.db.oneOrNone(filenamequery, params);
        const filenamecleaned = await slugify(filename["filename"].toString(), "_");

        let version = "theseus";
        let baseURL = BASEURL;
        let token = process.env.TOKEN;

        if (jukuriPublication) {
            baseURL = JUKURIURL;
            token = process.env.JUKURI_TOKEN;
            version = "jukuri";
        }

        let embargodate;

        if (!embargo.embargo) {
            embargodate = new Date().toISOString().split("T")[0];
        } else {
            embargodate = embargo.embargo.toISOString().split("T")[0];
        }

        console.log("The embargodate: " + embargodate);
        const year = embargodate.split("-")[0];
        const month = embargodate.split("-")[1];
        const day = embargodate.split("-")[2];
        const filePath =  publicationFolder + "/" + julkaisuID;
        const filePathFull = filePath + "/" + savedFileName;

        this.tokenHandler(version)
        .then(async function() {
        const urlFinal = baseURL + "items/" + theseusID + "/bitstreams?name=" + filenamecleaned + "&description=" + filenamecleaned + "&groupId=0&year=" + year + "&month=" + month + "&day=" + day + "&expand=policies";
        console.log("Thefinalurl: " + urlFinal);
        const headersOpt = {
            "rest-dspace-token": token,
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
                console.log(res);
                const bitstreamid = (res as any)["id"];
                console.log("catching the bitstream id from response " + bitstreamid);
                const params = {"id": julkaisuID};
                const bitstreamquery = "UPDATE julkaisuarkisto SET bitstreamid=" + bitstreamid + " WHERE julkaisuid = " + "${id};";
                await connection.db.any(bitstreamquery, params);

            })
            .then(async function () {
                const deletefromJonoQuery = "DELETE from julkaisujono WHERE julkaisuid = " + "${id};";
                await connection.db.any(deletefromJonoQuery, params);

                console.log("Julkaisuid " + julkaisuID + " removed from julkaisujono table");

                const urnQuery = "SELECT urn FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
                const urn = await connection.db.oneOrNone(urnQuery, params);

                console.log("Urn identifier for julkaisu " + julkaisuID + " is " + urn.urn);

                const rinnakkaistallennetunversionverkkoosoite = {"rinnakkaistallennetunversionverkkoosoite":  urnIdentifierPrefix + urn.urn };
                const updateUrn = connection.pgp.helpers.update(rinnakkaistallennetunversionverkkoosoite, ["rinnakkaistallennetunversionverkkoosoite"], "julkaisu") + "WHERE id = " +  "${id};";
                await connection.db.none(updateUrn, params);

                console.log("Rinnakkaistallennetunversionverkkoosoite updated for julkaisu " + julkaisuID);

                await fu.deleteJulkaisuFile(filePath, savedFileName);

                console.log("File deleted from server");
                console.log("Successfully sent publication with id " + julkaisuID + " to " + version + " and updated all data!");
            })
            .catch(function (err: Error) {
                console.log("Something went wrong with sending file: " + err);
            });
        })
        .catch(() => {
            console.log("Couldn't send bitstream to " + version + " with julkaisuid " + julkaisuID + " since token was invalid and we coudln't get a new one");
        });
    }

    checkToken(version: any): Promise<any> {
        let urlFinal = BASEURL + "status";
        let headersOpt = {

            "rest-dspace-token": process.env.TOKEN,
            "content-type": "application/json"
        };
        if (version === "jukuri") {
            urlFinal = JUKURIURL + "status";
            headersOpt = {
                "rest-dspace-token": process.env.JUKURI_TOKEN,
                "content-type": "application/json"
            };
        }
        const options = {
            rejectUnauthorized: false,
            method: "GET",
            uri: urlFinal,
            headers: headersOpt,
            json: true,
            encoding: "utf8",
        };
       return new Promise(function(resolve: any, reject: any) {
       rp(options)
       .then(async function (res: Response) {
           if ((res as any)["authenticated"] === true) {
               console.log("The auth response " + (res as any)["authenticated"]);
               resolve(version);
           }
           else if ((res as any)["authenticated"] === false) {
               reject(JSON.stringify(options));

           }
       });
            });

    }

     getToken(version: any): Promise<any> {
        let urlFinal = BASEURL + "login";
        let metadataobj = {"email": theseusAuthEmail, "password": theseusAuthPassword};
        const headersOpt = {
            "content-type": "application/json",
        };
        if (version === "jukuri") {
            urlFinal = JUKURIURL + "login";
            metadataobj = {"email": jukuriAuthEmail, "password": jukuriAuthPassword};
        }
        const options = {
            rejectUnauthorized: false,
            method: "POST",
            uri: urlFinal,
            headers: headersOpt,
            body: metadataobj,
            json: true,
            encoding: "utf8",
        };
        return new Promise(function(resolve: any, reject: any) {
           rp(options)
           .then(async function (res: Response) {
               if (version === "jukuri") {
                    process.env.JUKURI_TOKEN = (res as any);
                    console.log("The new token: " + (res as any) +  " for version " + version);
                    resolve(version);
                }
                else if (version === "theseus") {
                    console.log("The new token: " + (res as any) + " for version " + version);
                    process.env.TOKEN = (res as any);
                    resolve(version);
                }
           })
           .catch(function (err: Error) {
               console.log("Error while getting new token: " + err + " for version " + version);
               reject();
             });
           });
    }



    public async EmbargoUpdate(id: any, embargo: any, orgid: any) {
        const self = this;
        let version = "theseus";
        let baseURL = BASEURL;
        let token = process.env.TOKEN;
        let jukuriPublication: boolean;

        jukuriPublication = this.isJukuriPublication(orgid);

        if (jukuriPublication) {
            baseURL = JUKURIURL;
            token = process.env.JUKURI_TOKEN;
            version = "jukuri";
        }
        this.tokenHandler(version)
        .then(async function() {
        const params = {"id": id};
        const bitstreamidquery = "SELECT bitstreamid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
        const bitstreamidObject = await connection.db.oneOrNone(bitstreamidquery, params);
        const bitstreamid = bitstreamidObject.bitstreamid;

        const urlFinal = baseURL + "bitstreams/" + bitstreamid + "?expand=policies";
        const headersOpt = {
            "rest-dspace-token": token,
            "content-type": "application/json",
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
                const policyid = (res as any)["policies"][0]["id"];
                self.prepareUpdateEmbargo(id, embargo, bitstreamid, policyid, jukuriPublication);
            })
            .catch(function (err: Error) {
                console.log("Error while catching policyid for bitstreamid: " + bitstreamid + " with error: " + err);
            });
        })
        .catch(() => {
            console.log("Couldnt get policyid for " + version + " julkaisu id " + id + " since token was invalid and we couldnt get a new one");
        });

    }
    async prepareUpdateEmbargo(id: any, embargo: any, bitstreamid: any, policyid: any, jukuriPublication: boolean) {
        const self = this;
        let baseURL = BASEURL;
        let token = process.env.TOKEN;

        if (jukuriPublication) {
            baseURL = JUKURIURL;
            token = process.env.JUKURI_TOKEN;
        }
        const urlFinal = baseURL + "bitstreams/" + bitstreamid + "/policy/" + policyid;
        const headersOpt = {
            "rest-dspace-token": token,
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
                self.UpdateEmbargo(id, embargo, bitstreamid, jukuriPublication);
            })
            .catch(function (err: Error) {
                console.log("Error while deleting embargotime for julkaisuid: " + id + " with error: " + err);
            });

    }
    async UpdateEmbargo(id: any , embargo: any, bitstreamid: any, jukuriPublication: boolean) {
        let baseURL = BASEURL;
        let token = process.env.TOKEN;

        if (jukuriPublication) {
            baseURL = JUKURIURL;
            token = process.env.JUKURI_TOKEN;
        }

        let embargocleaned;
        if (!embargo) {
            embargocleaned = new Date().toISOString().split("T")[0];
        } else {
            embargocleaned = embargo.split("T")[0];
        }
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

        const urlFinal = baseURL + "bitstreams/" + bitstreamid + "/policy";
        const headersOpt = {
            "rest-dspace-token": token,
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
    public async DeleteFromTheseus(id: any): Promise<any> {
        const self = this;
        const params = {"id": id};

        const orgQuery = "SELECT organisaatiotunnus FROM julkaisu WHERE id = " + "${id};";
        const orgID = await connection.db.one(orgQuery, params);

        const jukuriPublication: boolean = oh.isJukuriPublication(orgID["organisaatiotunnus"]) ;

        let version = "theseus";
        let baseURL = BASEURL;
        let token = process.env.TOKEN;

        if (jukuriPublication) {
            baseURL = JUKURIURL;
            token = process.env.JUKURI_TOKEN;
            version = "jukuri";
        }
        return new Promise(function(resolve: any, reject: any) {
        self.tokenHandler(version)
            .then(async function() {

                const itemidquery = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
                const itemid = await connection.db.any(itemidquery, params);

                const urlFinal = baseURL + "items/" + itemid[0]["itemid"];
                const headersOpt = {
                    "rest-dspace-token": token,
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
                        resolve();
                    })
                    .catch(function (err: Error) {
                        console.log("Error while deleting julkaisu: " + id + " with error: " + err);
                        reject();
                    });
                })
                .catch(function(err: Error) {
                    console.log("Error while deleting publication from " + version + " with " + id + ", with error message: " + err);
                    reject();
                });
            });
    }

    public async PutTheseus(metadataObject: any, id: any, org: any) {
        
        let version = "theseus";
        let jukuriPublication;
        let baseURL = BASEURL;
        let token = process.env.TOKEN;

        jukuriPublication = this.isJukuriPublication(org);

        if (jukuriPublication) {
            baseURL = JUKURIURL;
            token = process.env.JUKURI_TOKEN;
            version = "jukuri";
        }

        this.tokenHandler(version)
        .then(async function() {

        const params = {"id": id};
        const itemidquery = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " + "${id};";
        let itemid: any;

        try {
            itemid = await connection.db.one(itemidquery, params);
        }
        catch (e) {
            console.log(e);
        }

        console.log("The itemid for the item to be updated " + itemid.itemid);
        const urlFinal = baseURL + "items/" + itemid.itemid + "/metadata";
        console.log(urlFinal);
        const headersOpt = {
            "rest-dspace-token": token,
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
                console.log("Successful PUT to Theseus/Jukuri");
            })
            .catch(function (err: Error) {
                console.log("Error while updating julkaisu: " + id + " to Theseus/Jukuri with error: " + err);

            });
        })
        .catch(() => {
            console.log("Couldnt update metadata for " + version + " julkaisu id " + id + " because token was invalid and couldnt acquire a new one");
        });

    }

    public async mapTheseusFields(id: any, obj: any, method: string) {

        let jukuriPublication;

        const julkaisuData = obj.julkaisu;
        const fileData = obj.filedata;
        const avainsanaData = obj.avainsanat;
        const organisaatiotekijaData = obj.organisaatiotekija;
        const isbnData = obj.julkaisu.isbn;
        const issnData = obj.julkaisu.issn;
        const tieteenalat = obj.tieteenala;
        const projektinumeroData = obj.julkaisu.projektinumero;

        const orgnizationValues = domainMapping.find((x: any) => x.code === julkaisuData.organisaatiotunnus);

        if (orgnizationValues.jukuriData) {
            jukuriPublication = true;
        } else {
            jukuriPublication = false;
        }

        const tempMetadataObject = [
            {"key": "dc.title", "value": julkaisuData["julkaisunnimi"]},
            {"key": "dc.type.okm", "value": this.mapJulkaisuTyyppiFields(julkaisuData["julkaisutyyppi"])},
            {"key": "dc.contributor.organization", "value": this.mapOrganizationFields(orgnizationValues, jukuriPublication)},
            {"key": "dc.date.issued", "value": julkaisuData["julkaisuvuosi"]},
            {"key": "dc.relation.conference", "value": julkaisuData["konferenssinvakiintunutnimi"]},
            {"key": "dc.relation.ispartof", "value": julkaisuData["emojulkaisunnimi"]},
            {"key": "dc.contributor.editor", "value": julkaisuData["emojulkaisuntoimittajat"]},
            {"key": "dc.relation.volume", "value": julkaisuData["volyymi"]},
            {"key": "dc.relation.numberinseries", "value": julkaisuData["numero"]},
            {"key": "dc.format.pagerange", "value": julkaisuData["sivut"]},
            {"key": "dc.relation.articlenumber", "value": julkaisuData["artikkelinumero"]},
            {"key": "dc.publisher", "value": julkaisuData["kustantaja"]},
            {"key": "dc.language.iso", "value": julkaisuData["julkaisunkieli"]},
            {"key": "dc.relation.doi", "value": julkaisuData["doitunniste"]},
            {"key": "dc.type", "value": "publication"},
        ];

        if (fileData) {
            tempMetadataObject.push({"key": "dc.description.abstract", "value": fileData["abstract"]});
            tempMetadataObject.push({"key": "dc.identifier.urn", "value": fileData["urn"]});
            tempMetadataObject.push({"key": "dc.embargo.terms", "value": this.cleanEmbargo(fileData["embargo"]) });
            tempMetadataObject.push( {"key": "dc.type.other", "value": fileData["julkaisusarja"]});
        }

        let metadataObject: any = [];

        if (!jukuriPublication) {
            tempMetadataObject.push({"key": "dc.okm.selfarchived", "value": julkaisuData["julkaisurinnakkaistallennettu"]});
            tempMetadataObject.push({"key": "dc.relation.ispartofjournal", "value": julkaisuData["lehdenjulkaisusarjannimi"]});
            tempMetadataObject.push({"key": "dc.embargo.terms", "value": this.cleanEmbargo(fileData["embargo"]) });


            metadataObject = [{"key": "dc.source.identifier", "value": id }];

        } else {
            // this is just for development setup
            // tempMetadataObject.push({ "key": "dc.teh", "value": "00000" });
            tempMetadataObject.push({ "key": "dc.relation.ispartofseries", "value": julkaisuData["lehdenjulkaisusarjannimi"]});
            tempMetadataObject.push({"key": "dc.okm.selfarchived", "value": this.mapZeroAndOneValues(julkaisuData["julkaisurinnakkaistallennettu"]) });
            tempMetadataObject.push({"key": "dc.okm.internationalcopublication", "value": this.mapZeroAndOneValues(julkaisuData["kansainvalinenyhteisjulkaisu"]) });
            tempMetadataObject.push({"key": "dc.okm.corporatecopublication", "value": this.mapZeroAndOneValues(julkaisuData["yhteisjulkaisuyrityksenkanssa"]) });

            metadataObject = [];
        }

        // remove empty values
        for (let i = 0; i < tempMetadataObject.length; i++) {
            if (tempMetadataObject[i]["value"] && tempMetadataObject[i]["value"] !== "") {
                metadataObject.push(tempMetadataObject[i]);
            }
        }


        if (fileData) {
            let oikeudetObject;
            if (fileData["oikeudet"] && fileData["oikeudet"] === "All rights reserved") {
                oikeudetObject = {
                    "key": "dc.rights",
                    "value": "All rights reserved. This publication is copyrighted. You may download, display and print it for Your own personal use. Commercial use is prohibited."
                };
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
        }




        if (!this.arrayIsEmpty(avainsanaData)) {
            avainsanaData.forEach((value: any) => {
                const avainsanaobject = {"key": "dc.subject.yso", "value": value};
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
                const issnobject = {"key": "dc.relation.issn", "value": value};
                metadataObject.push(issnobject);
            });
        }

        // these fields are sent to Jukuri only
        if (jukuriPublication) {
            if (!this.arrayIsEmpty(organisaatiotekijaData)) {
                organisaatiotekijaData.forEach((value: any) => {

                    if (value.orcid && value.orcid !== "") {
                        const orcidObject = {"key": "dc.contributor.orcid", "value": "https://orcid.org/" + value.orcid };
                        metadataObject.push(orcidObject);
                    }
                    if (value.hrnumero && value.hrnumero !== "") {
                        const hrnumeroObject = {"key": "dc.kiekuperson", "value": value.hrnumero };
                        metadataObject.push(hrnumeroObject);
                    }

                    if (!this.arrayIsEmpty(value.alayksikko)) {
                        value.alayksikko.forEach((value: any) => {
                            const res = value.split("-")[2];
                            const alayksikkoObject = {"key": "dc.contributor.departmentid", "value": res };
                            metadataObject.push(alayksikkoObject);
                        });
                    }
                });
            }

            if (!this.arrayIsEmpty(tieteenalat)) {
                tieteenalat.forEach((value: any) => {
                    const tieteenalaObject = {"key": "dc.okm.discipline", "value": value.tieteenalakoodi };
                    metadataObject.push(tieteenalaObject);
                });
            }
            // uncomment in production
            if (!this.arrayIsEmpty(projektinumeroData)) {
                projektinumeroData.forEach((value: any) => {
                    const pnobject = {"key": "dc.teh", "value": value};
                    metadataObject.push(pnobject);
                });
            }
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

    cleanEmbargo(embargo: any) {

        if (!embargo || embargo === "") {
            return "";
        } else {
            const embargoDate = new Date(embargo).toISOString();
            return embargoDate.split("T")[0];

        }
    }

     isJukuriPublication(orgTunnus: any) {
         let jukuriPublication: boolean = false;
         const orgnizationValues = domainMapping.find((x: any) => x.code === orgTunnus);

         if (orgnizationValues.jukuriData) {
             jukuriPublication = true;
         } else {
             jukuriPublication = false;
         }

         return jukuriPublication;
     }


     async isFileUploaded(id: number) {
        const params = {"id": id};
        const query = "SELECT filename FROM julkaisuarkisto WHERE julkaisuid = " +
             "${id};";

         const data = await connection.db.oneOrNone(query, params);
         return data;
     }


     mapZeroAndOneValues(value: any) {
        if (value === "1") {
            return "on";
        } else {
            return "ei";
        }
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


    mapOrganizationFields(org: any, jukuriPublication: boolean) {
        let theseusFormat = "";

        if (!jukuriPublication) {
            theseusFormat = org.theseusData.theseusCode;
            } else {
             theseusFormat = org.jukuriData.jukuriCode;
         }

        return theseusFormat;
    }

    mapCollectionId(org: any, jukuriPublication: boolean) {
        let collectionId = "";

        if (!jukuriPublication) {
            collectionId = org.theseusData.theseusCollectionId;
        } else {
            collectionId = org.jukuriData.jukuriCollectionId;
        }

        return collectionId;

    }


}
export const theseus = new TheseusSender();
