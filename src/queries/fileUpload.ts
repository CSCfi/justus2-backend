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

    // TODO: Check access rights for publication in question

    const contentType = req.headers["content-type"];

    // if user sends only json object (no file), update data in julkaisuarkisto table only
    if (contentType === "application/json") {
       try {
           await updateArchiveTable(req.body);
           return res.status(200).json("OK");
       } catch (e) {
           console.log(e);
           return res.status(500).send("Could not update file data");
       }

    }

    if (contentType.startsWith("multipart/form-data")) {
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
                    await postDataToArchiveTable(file, julkaisuData);

                    return res.status(200).json("OK");

                } catch (e) {
                    console.log(e);
                    if (e.code === "EEXIST") {
                        console.log(e);
                        fs.unlinkSync(file.path);
                        return res.status(500).send("This publication has already a file");
                    } else {
                        return res.status(500).send("Failure in file upload");
                    }
                }
            } else {
                return res.status(403).send("Invalid file");
            }


        });
    }
}

async function updateArchiveTable(data: any) {

    const obj: any = {};

    if (!data.embargo || data.embargo === "" ) {
        obj["embargo"] = undefined;
    } else {
        obj["embargo"] = data.embargo;
    }

    obj["urn"] = data.urn;

    const table = new connection.pgp.helpers.ColumnSet(["embargo", "urn"], {table: "julkaisuarkisto"});
    const query = connection.pgp.helpers.update(obj, table) + "WHERE julkaisuid = " +  parseInt(data.julkaisuid);
    await connection.db.none(query);

}


async function postDataToArchiveTable(file: any, data: any) {

    const tableColumns = dbHelpers.julkaisuarkisto;

    if (!data.embargo || data.embargo === "" ) {
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