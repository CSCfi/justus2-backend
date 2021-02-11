import { Request, Response, NextFunction } from "express";

import { theseus as ts } from "../services/theseusSender";
import { auditLog as auditLog } from "../services/auditLogService";
import { validate as validate } from "../services/validatorService";
import { julkaisuArkistoQueries as julkaisuArkisto } from "../queries/julkaisuArkistoQueries";
import { FileData } from "../types/FileData";

// Database connection
const connection = require("../db");

const publicationFolder = process.env.FILE_FOLDER;
const savedFileName = "file.blob";

// File upload dependencies
const multer  = require("multer");
const fs = require("fs");
const path = require("path");

    export const uploadJulkaisu = async (req: Request, res: Response) => {

        const upload = multer({dest: process.env.TEMP_FILE_FOLDER}).single("file");

        // TODO: Check access rights for publication in question
        upload(req, res, async function () {


            const julkaisuId = req.body.data.julkaisuid;
            const julkaisuData: FileData = req.body.data;
            const file = (<any>req).file;

            try {
                await validate.fileData(julkaisuData, file);
                await validateFileExtension(file.originalname, file.path);
            } catch (e) {
                await julkaisuArkisto.removeJulkaisurinnakkaistallennettuValue(julkaisuId);
                return res.status(500).send(e.message);
            }

            console.log("Starting file upload for publication: " + julkaisuId);

            try {
                // first move file from temp folder to publications folder
                await moveFile(file, julkaisuId);

                const itemId = await julkaisuArkisto.metaDataAlreadyUpdated(julkaisuId);
                const julkaisuIdExists = await julkaisuArkisto.fetchJulkaisuIdFromArchiveTable(julkaisuId);

                if (itemId && itemId.itemid) {
                    await julkaisuArkisto.postDataToArchiveTable(file, julkaisuData, req.headers, true);
                    await ts.sendBitstreamToItem(julkaisuId, itemId.itemid, true);
                } else {
                    if (julkaisuIdExists) {
                        await julkaisuArkisto.postDataToArchiveTable(file, julkaisuData, req.headers, true);

                    } else {
                        await julkaisuArkisto.postDataToQueueTable(julkaisuId);
                        await julkaisuArkisto.postDataToArchiveTable(file, julkaisuData, req.headers, false);
                    }
                }

                console.log("Successfully uploaded file for publication: " + julkaisuId);
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

                    await julkaisuArkisto.removeJulkaisurinnakkaistallennettuValue(julkaisuId);
                    console.log(e);
                    return res.status(500).send(e.code);
                }
            }

        });
    };

    export const downloadJulkaisu = async (req: Request, res: Response) => {

        const isFileInTheseus = await julkaisuArkisto.isPublicationInTheseus(req.params.id);
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
        } else {
            return res.status(500).send("Error in downloading publication");
        }

    };

    export const deleteJulkaisu = async (req: Request, res: Response) => {

        const julkaisuid = req.params.id;
        const filePath = publicationFolder + "/" + julkaisuid;

        const isPublicatioFileInTheseus = await julkaisuArkisto.isPublicationInTheseus(julkaisuid);
        const jukuriPublication = await julkaisuArkisto.isJukuriPublication(julkaisuid);

        if (isPublicatioFileInTheseus) {

            if (jukuriPublication) {
                return res.status(403).send("Publication is already approved, remove file from Jukuri");
            }

            try {
                const responseStatus = await ts.DeleteFromTheseus(julkaisuid);
                const params = {"id": julkaisuid};

                await connection.db.result("DELETE FROM julkaisuarkisto WHERE julkaisuid = ${id}", params);

                const obj = {"julkaisurinnakkaistallennettu": "0", "rinnakkaistallennetunversionverkkoosoite": ""};
                const updateRinnakkaistallennusColumns = connection.pgp.helpers.update(obj,
                    ["julkaisurinnakkaistallennettu", "rinnakkaistallennetunversionverkkoosoite"], "julkaisu")
                    + "WHERE id = ${id}";
                await connection.db.oneOrNone(updateRinnakkaistallennusColumns, params);

                await auditLog.postAuditData(req.headers, "DELETE", "julkaisuarkisto", julkaisuid, [undefined]);
                if (responseStatus === 404) {
                    return res.status(404).send("File already deleted form Theseus");
                } else {
                    return res.status(200).send("File removed successfully");
                }

            } catch (e) {
                console.log("Couldn't delete the julkaisu " + julkaisuid + ", so we won't remove the ID from the archive table, err message: " + e);
                return res.status(500).send(e);
            }

        } else {
            // file is not yet transferred to Theseus so remove file from server and id from julkaisujono table
            try {

                const params = {"id": julkaisuid};
                await deleteJulkaisuFile(filePath, savedFileName);

                if (jukuriPublication) {
                    await connection.db.result("UPDATE julkaisuarkisto set filename = null, mimetype = null, urn = null, embargo = null, " +
                        "abstract = null, versio = null, oikeudet = null, julkaisusarja = null  WHERE julkaisuid = ${id}", params);

                    await auditLog.postAuditData(req.headers, "PUT", "julkaisuarkisto", julkaisuid,
                        [{
                            "filename": "null",
                            "mimetype": "null",
                            "urn": "null",
                            "embargo": "null",
                            "abstract": "null",
                            "versio": "null",
                            "oikeudet": "null",
                            "julkaisusarja": "null"
                        }]);

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

    };

    const moveFile = async (file: any, id: any) => {

        const publicationDir = publicationFolder + "/" + id;
        await fs.mkdirSync(publicationDir);

        const oldPath = file.path;
        const newPath = publicationDir + "/" + savedFileName;

        await fs.copyFileSync(oldPath, newPath);
        await fs.unlinkSync(oldPath);

    };

    const validateFileExtension = async (fileName: any, filePath: any) => {
        // only pdf files are allowed
        const fileExt = path.extname(fileName).toLowerCase();
        if (fileExt !== ".pdf") {
            console.log("Invalid file extension, removing file...");
            fs.unlinkSync(filePath);
            console.log("Done!");
            throw Error("Invalid file extension");
        }
    };

    export const deleteJulkaisuFile = async (fPath: any, fName: any) => {
        await fs.unlinkSync(fPath + "/" + fName);
        await fs.rmdirSync(fPath);
    };







