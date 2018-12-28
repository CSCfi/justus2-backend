import { Request, Response, NextFunction } from "express";

const fs = require("fs");
const path = require("path");

// File upload dependencies
const multer  = require("multer");
const upload = multer({ dest: "temp/" });

// Database connection
const connection = require("./../db");
const dbHelpers = require("./../databaseHelpers");

const publicationFolder = "publications";
const savedFileName = "file.blob";


async function uploadJulkaisu(req: Request, res: Response) {
    upload.single("file") (req, res, async function () {

        const julkaisuId = req.body.data.julkaisuid;
        const julkaisuData = req.body.data;
        const file = (<any>req).file;

        const valid = await validate(file.originalname, file.path);

        if (!valid) {
            return res.status(403).send( "Invalid file" );
        } else {
            const fileMoved = await moveFile(file, julkaisuId);
            if (fileMoved) {
                await updateQueueTable(file, julkaisuId);
                await updateArchiveTable(file, julkaisuData);

                return res.status(200).json("OK");
            } else {
                // if file transfer leads to error, delete file from temp folder
                fs.unlinkSync(file.path);
                return res.status(500).send( "Failure in file transfer" );
            }
        }

    });

}

async function updateArchiveTable(file: any, data: any) {

    const tableColumns = dbHelpers.julkaisuarkisto;

    if (data.embargo === "" ) {
        data["embargo"] = undefined;
    }

    data["filename"] = file.originalname;
    data["mimetype"] = file.mimetype;

    const table = new connection.pgp.helpers.ColumnSet(tableColumns, {table: "julkaisuarkisto"});
    const query = connection.pgp.helpers.insert(data, table) + "RETURNING id";

    connection.db.one(query);

}

async function updateQueueTable(file: any, julkaisuid: any) {

    try {
        const tableColumns = new connection.pgp.helpers.ColumnSet(["julkaisuid"], {table: "julkaisujono"});
        const query = connection.pgp.helpers.insert({"julkaisuid": julkaisuid }, tableColumns) + "RETURNING id";
        await connection.db.one(query);
    } catch (e) {
        console.log(e);
    }
}

async function moveFile (file: any, id: any) {

   let done: boolean = true;
   const publicationDir = publicationFolder + "/" + id;

    try {
          fs.mkdirSync(publicationDir);
    } catch (e) {

        if (e.code === "EEXIST") {
        //    remove old file
        }
        // TODO: catch error if file already exists
        done = false;
    }
        // after creating folder we move publication to that folder
        const oldPath = file.path;
        const newPath = publicationDir + "/" + savedFileName;

        try {
             fs.rename(oldPath, newPath);
        } catch (e) {
            console.log(e);
            done = false;
        }

    return done;
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

    try {
        await fs.unlinkSync(filePath + "/" + savedFileName);
        await fs.rmdir(filePath);
        // this query removes data also from julkaisuarkisto table
        await connection.db.result("DELETE FROM julkaisujono WHERE julkaisuid = ${id}", {
            id: julkaisuid
        });
        console.log("File removed successfully");
        return res.status(200).send("File removed successfully");
    } catch (e) {
        console.log(e);
        return res.status(500).send( "Error in removing file" );
    }
}


module.exports = {
    uploadJulkaisu: uploadJulkaisu,
    deleteJulkaisu: deleteJulkaisu
};