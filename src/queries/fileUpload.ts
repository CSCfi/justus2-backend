import { Request, Response, NextFunction } from "express";

const fs = require("fs");
const path = require("path");

// File upload dependencies
const multer  = require("multer");
const upload = multer({ dest: process.env.TEMP_FILE_FOLDER });

// Import TheseusSender class
import { theseus as ts } from "./../services/TheseusSender";

// Import audit log class
import { auditLog as auditLog } from "./../services/auditLogService";

// Database connection
const connection = require("./../db");
const dbHelpers = require("./../databaseHelpers");
const external = require("./../queries/externalServices");
const api = require("./../queries/apiQueries");

const publicationFolder = process.env.FILE_FOLDER;
const savedFileName = "file.blob";


async function uploadJulkaisu(req: Request, res: Response) {

    // TODO: Check access rights for publication in question

    upload.single("file")(req, res, async function () {

        const julkaisuId = req.body.data.julkaisuid;
        const julkaisuData = req.body.data;
        const file = (<any>req).file;

        const valid = await validate(file.originalname, file.path);

        if (valid) {
            try {
                // first move file from temp folder to publications folder
                await moveFile(file, julkaisuId);

                const itemId = await metaDataAlreadyUpdated(julkaisuId);
                const julkaisuIdExists = await fetchJulkaisuIdFromArchiveTable(julkaisuId);

                if (itemId && itemId.itemid) {
                    await postDataToArchiveTable(file, julkaisuData, req.headers, true);
                    await ts.sendBitstreamToItem(julkaisuId, itemId.itemid, true);
                } else {
                    if (julkaisuIdExists) {
                        await postDataToArchiveTable(file, julkaisuData, req.headers, true);

                    } else {
                        await postDataToQueueTable(julkaisuId);
                        await postDataToArchiveTable(file, julkaisuData, req.headers, false);
                    }
                }

                return res.status(200).json("OK");


            } catch (e) {
                console.log(e);
                if (e && e.code === "EEXIST") {
                    fs.unlinkSync(file.path);
                    return res.status(500).send("This publication has already a file");
                } else {

                    // if something goes wrong, verify that julkaisuid is removed from queue table and publication is removed from server
                    await connection.db.result("DELETE FROM julkaisujono WHERE julkaisuid = ${id}", {
                        id: julkaisuId
                    });

                    const tempFileExists = await fs.existsSync(file.path);
                    if (tempFileExists) {
                        try {
                            await fs.unlinkSync(file.path);

                        } catch (e) {
                            console.log(e);
                        }
                    }

                    const path = publicationFolder + "/" + julkaisuId;
                    const fileExists = await fs.existsSync(path);

                    if (fileExists) {
                        try {
                            await deleteJulkaisuFile(path, savedFileName);

                        } catch (e) {
                            console.log(e);
                        }
                    }

                    const table = new connection.pgp.helpers.ColumnSet(["julkaisurinnakkaistallennettu"], {table: "julkaisu"});

                    const query = connection.pgp.helpers.update({"julkaisurinnakkaistallennettu": "0"}, table) + " WHERE id = " +  parseInt(julkaisuId);
                    await connection.db.none(query);

                    return res.status(500).send("Failure in file upload");

                }
            }
        } else {
            return res.status(403).send("Invalid file");
        }

    });
}


async function postDataToArchiveTable(file: any, data: any, headers: any, julkaisuIdOrItemIdExists?: boolean) {

    const tableColumns = dbHelpers.julkaisuarkisto;
    const obj: any = {};

        if (data.embargo && data.embargo !== "") {
                obj["embargo"] = data.embargo;
        } else {
            obj["embargo"] = undefined;
        }

        if (data.abstract  &&  data.abstract !== "") {
            obj["abstract"] = data.abstract;
        } else {
            obj["abstract"] = undefined;
        }

        if (data.versio && data.versio !== "") {
            obj["versio"] = data.versio;
        } else {
            obj["versio"] = undefined;
        }

        if (data.oikeudet && data.oikeudet !== "") {
            obj["oikeudet"] = data.oikeudet;
        } else {
            obj["oikeudet"] = undefined;
        }

        if (data.julkaisusarja && data.julkaisusarja !== "") {
            obj["julkaisusarja"] = data.julkaisusarja;
        } else {
            obj["julkaisusarja"] = undefined;
        }

        obj["filename"] = file.originalname;
        obj["mimetype"] = file.mimetype;
        obj["julkaisuid"] = data.julkaisuid;

        if (!data.urn) {
            const urn = await external.getUrnData();
            obj["urn"] = urn;
        } else {
            obj["urn"] = data.urn;
        }

        let query;
        let method;
        const table = new connection.pgp.helpers.ColumnSet(tableColumns, {table: "julkaisuarkisto"});

        if (julkaisuIdOrItemIdExists) {
            obj["destination"] = "jukuri";
            query = connection.pgp.helpers.update(obj, table) + " WHERE julkaisuid = " +  parseInt(data.julkaisuid);
            method = "PUT";
        } else {
            obj["destination"] = "theseus";
            query = connection.pgp.helpers.insert(obj, table) + "RETURNING id";
            method = "POST";
        }


    await connection.db.oneOrNone(query);
    // update kaytto_loki table
    await auditLog.postAuditData(headers, method, "julkaisuarkisto", data.julkaisuid, data);

}

async function postDataToQueueTable(julkaisuid: any) {

    const tableColumns = new connection.pgp.helpers.ColumnSet(["julkaisuid"], {table: "julkaisujono"});
    const query = connection.pgp.helpers.insert({"julkaisuid": julkaisuid }, tableColumns) + "RETURNING id";
    await connection.db.one(query);

}

async function moveFile (file: any, id: any) {

    const publicationDir = publicationFolder + "/" + id;
    await  fs.mkdirSync(publicationDir);

    const oldPath = file.path;
    const newPath = publicationDir + "/" + savedFileName;

    await fs.copyFileSync(oldPath, newPath);
    await fs.unlinkSync(oldPath);

}

async function validate(fileName: any, filePath: any) {

    // validate that file has no file extension such as: .php, .js and .sh
    const fileExt = path.extname(fileName).toLowerCase();
    if (fileExt === ".php" || fileExt === ".js" || fileExt === ".sh" || fileExt === ".exe" ) {
        console.log("Invalid file extension, removing file...");
        fs.unlinkSync(filePath);
        console.log("Done!");
        return false;
    } else {
        return true;
    }
}

 async function deleteJulkaisu(req: Request, res: Response) {

    const julkaisuid = req.params.id;
    const filePath = publicationFolder + "/" + julkaisuid;

    const isPublicatioFileInTheseus = await isPublicationInTheseus(julkaisuid);
    const jukuriPublication = await isJukuriPublication(julkaisuid);

     if (isPublicatioFileInTheseus) {

         if (jukuriPublication) {
             return res.status(403).send("Publication is already approved, remove file from Jukuri");
         }

        ts.DeleteFromTheseus(julkaisuid)
         .then(async function() {
            try {

                 const params = {"id": julkaisuid};

                 await connection.db.result("DELETE FROM julkaisuarkisto WHERE julkaisuid = ${id}", params);

                 const obj = {"julkaisurinnakkaistallennettu": "0", "rinnakkaistallennetunversionverkkoosoite": ""};
                 const updateRinnakkaistallennusColumns = connection.pgp.helpers.update(obj,
                     ["julkaisurinnakkaistallennettu", "rinnakkaistallennetunversionverkkoosoite"], "julkaisu")
                     + "WHERE id = ${id}";
                 await connection.db.oneOrNone(updateRinnakkaistallennusColumns, params);

                 await auditLog.postAuditData(req.headers, "DELETE", "julkaisuarkisto", julkaisuid, [undefined]);
                 return res.status(200).send("File removed successfully");

             } catch (err) {
                 console.log(err);
                 return res.sendStatus(500);
             }
        })
        .catch((err: Error) => {
            console.log("Couldn't delete the julkaisu " + julkaisuid + ", so we won't remove the ID from the archive table, err message: " + err);   
        });
         
     } else {
         // file is not yet transferred to Theseus so remove file from server and id from julkaisujono table
         try {

             const params = {"id": julkaisuid};
             await deleteJulkaisuFile(filePath, savedFileName);

             if (jukuriPublication) {
                 await connection.db.result("UPDATE julkaisuarkisto set filename = null, mimetype = null, embargo = null, " +
                     "abstract = null, versio = null, oikeudet = null, julkaisusarja = null  WHERE julkaisuid = ${id}", params);

                 await auditLog.postAuditData(req.headers, "PUT", "julkaisuarkisto", julkaisuid,
                     [{ "filename": "null", "mimetype": "null", "embargo": "null", "abstract": "null", "versio": "null", "oikeudet": "null", "julkaisusarja": "null" }]);

             } else {
                 await connection.db.result("DELETE FROM julkaisujono WHERE julkaisuid = ${id}", params);
                 await connection.db.result("DELETE FROM julkaisuarkisto WHERE julkaisuid = ${id}", params);
                 await auditLog.postAuditData(req.headers, "DELETE", "julkaisuarkisto", julkaisuid, [undefined]);
             }

             return res.status(200).send("File removed successfully");

         } catch (err) {
             console.log(err);
             return res.sendStatus(500);
         }

     }

}


async function deleteJulkaisuFile(fPath: any, fName: any) {
    await fs.unlinkSync(fPath + "/" + fName);
    await fs.rmdirSync(fPath);
}

async function isJukuriPublication(id: any) {
    const params = {"id": id};
    const query = "SELECT destination FROM julkaisuarkisto WHERE julkaisuid = " +
        "${id};";

    const data = await connection.db.oneOrNone(query, params);

    if (data.destination === "jukuri") {
        return true;
    } else {
        return false;
    }

}


async function fileHasBeenUploadedToJustus(id: any) {

    console.log(id);
    const params = {"id": id};
    const query = "SELECT 1 FROM julkaisuarkisto WHERE julkaisuid = " +
        "${id};";

    const data = await connection.db.oneOrNone(query, params);

    return data;
}

async function metaDataAlreadyUpdated(id: any) {
    const params = {"id": id};
    const query = "SELECT itemid FROM julkaisuarkisto WHERE julkaisuid = " +
        "${id};";

    const data = await connection.db.oneOrNone(query, params);
    console.log(data);

    return data;
}

async function isPublicationInTheseus(id: any) {

    const params = {"id": id};
    const query = "SELECT 1 FROM julkaisujono WHERE julkaisuid = " +
        "${id};";

    const data = await connection.db.oneOrNone(query, params);

    if (data) {
        return false;
    } else {
        return true;
    }
}

async function fetchJulkaisuIdFromArchiveTable(id: any) {
    const params = {"id": id};
    const query = "SELECT 1 FROM julkaisuarkisto WHERE julkaisuid = " +
        "${id};";

    const data = await connection.db.oneOrNone(query, params);
    if (data) {
        return true;
    } else {
        return false;
    }

}


async function downloadJulkaisu(req: Request, res: Response) {

        const isFileInTheseus = await isPublicationInTheseus(req.params.id);
        console.log(publicationFolder + "/" + req.params.id + "/file.blob");

        if (!isFileInTheseus) {

            const publicationToDownload = publicationFolder + "/" + req.params.id + "/file.blob";
            const params = {"id": req.params.id};
            const query = "SELECT mimetype, filename FROM julkaisuarkisto WHERE julkaisuid = " +
                "${id};";

            const data = await connection.db.oneOrNone(query, params);

            res.header("Content-type", data.mimetype);
            res.download(publicationToDownload, data.filename, function (err: any) {
                if (err) {
                    console.log(err);
                }
            });
        }

      else {
        return res.status(500).send("Error in downloading publication");
    }

}

module.exports = {
    uploadJulkaisu: uploadJulkaisu,
    deleteJulkaisu: deleteJulkaisu,
    fileHasBeenUploadedToJustus: fileHasBeenUploadedToJustus,
    isPublicationInTheseus: isPublicationInTheseus,
    deleteJulkaisuFile: deleteJulkaisuFile,
    downloadJulkaisu: downloadJulkaisu,
    postDataToQueueTable: postDataToQueueTable

};