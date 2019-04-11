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
                // then insert id to julkaisujono table
                await postDataToQueueTable(file, julkaisuId);
                // then insert publication related other data to julkaisuarkisto table
                await postDataToArchiveTable(file, julkaisuData, req.headers);

                return res.status(200).json("OK");

            } catch (e) {
                console.log(e);
                if (e.code === "EEXIST") {
                    console.log(e);
                    fs.unlinkSync(file.path);
                    return res.status(500).send("This publication has already a file");
                } else {

                    // if something goes wrong, verify that julkaisuid is removed from queue table and publication is removed from server
                    await connection.db.result("DELETE FROM julkaisujono WHERE julkaisuid = ${id}", {
                        id: julkaisuId
                    });

                    const path = publicationFolder + "/" + julkaisuId;
                    const fileExists = await fs.existsSync(path);

                    if (fileExists) {
                        try {
                            await deleteJulkaisuFile(path, savedFileName);

                        } catch (e) {
                            console.log(e);
                        }
                    }
                    return res.status(500).send("Failure in file upload");
                }
            }
        } else {
            return res.status(403).send("Invalid file");
        }

    });
}


async function postDataToArchiveTable(file: any, data: any, headers: any) {

    const tableColumns = dbHelpers.julkaisuarkisto;

    if (!data.embargo || data.embargo === "" ) {
        data["embargo"] = undefined;
    }

    if (!data.abstract || data.abstract === "") {
        data["abstract"] = undefined;
    }

    if (!data.versio || data.versio === "") {
        data["versio"] = undefined;
    }

    if (!data.oikeudet || data.oikeudet === "") {
        data["oikeudet"] = undefined;
    }

    if (!data.julkaisusarja || data.julkaisusarja === "") {
        data["julkaisusarja"] = undefined;
    }

    data["filename"] = file.originalname;
    data["mimetype"] = file.mimetype;

    const table = new connection.pgp.helpers.ColumnSet(tableColumns, {table: "julkaisuarkisto"});
    const query = connection.pgp.helpers.insert(data, table) + "RETURNING id";

    await connection.db.one(query);

    // update kaytto_loki table
    await auditLog.postAuditData(headers, "POST", "julkaisuarkisto", data.julkaisuid, data);


}

async function postDataToQueueTable(file: any, julkaisuid: any) {
    const tableColumns = new connection.pgp.helpers.ColumnSet(["julkaisuid"], {table: "julkaisujono"});
    const query = connection.pgp.helpers.insert({"julkaisuid": julkaisuid }, tableColumns) + "RETURNING id";
    await connection.db.one(query);

}

async function moveFile (file: any, id: any) {

    const publicationDir = publicationFolder + "/" + id;
    await  fs.mkdirSync(publicationDir);

    const oldPath = file.path;
    const newPath = publicationDir + "/" + savedFileName;

    await fs.copyFileSync(oldPath, newPath, (err: any) => {
        if (err) throw err;
        console.log("Temp file was copied to new folder");
        fs.unlinkSync(oldPath);
    });

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

     const isPublicatioFileInTheseus = await isPublicationInTheseus(req.params.id);

     if (isPublicatioFileInTheseus) {
         try {
             await ts.DeleteFromTheseus(julkaisuid);
             await connection.db.result("DELETE FROM julkaisuarkisto WHERE julkaisuid = ${id}", {
                 id: julkaisuid
             });
             await auditLog.postAuditData(req.headers, "DELETE", "julkaisuarkisto", julkaisuid, [undefined]);
             return res.status(200).send("File removed successfully");
         } catch (err) {
             console.log(err);
             return res.sendStatus(500);
         }
     } else {
         // file is not yet transferred to Theseus so remove file from server and id from julkaisujono table
         try {
             await deleteJulkaisuFile(filePath, savedFileName);
             await connection.db.result("DELETE FROM julkaisujono WHERE julkaisuid = ${id}", {
                 id: julkaisuid
             });
             await connection.db.result("DELETE FROM julkaisuarkisto WHERE julkaisuid = ${id}", {
                 id: julkaisuid
             });
             await auditLog.postAuditData(req.headers, "DELETE", "julkaisuarkisto", julkaisuid, [undefined]);
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


async function fileHasBeenUploadedToJustus(id: any) {

    console.log(id);
    const params = {"id": id};
    const query = "SELECT 1 FROM julkaisuarkisto WHERE julkaisuid = " +
        "${id};";

    const data = await connection.db.oneOrNone(query, params);

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

module.exports = {
    uploadJulkaisu: uploadJulkaisu,
    deleteJulkaisu: deleteJulkaisu,
    fileHasBeenUploadedToJustus: fileHasBeenUploadedToJustus,
    isPublicationInTheseus: isPublicationInTheseus,
    deleteJulkaisuFile: deleteJulkaisuFile

};