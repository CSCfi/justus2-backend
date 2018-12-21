import { Request, Response, NextFunction } from "express";

const fs = require("fs");
const path = require("path");

// File upload dependencies
const multer  = require("multer");
const upload = multer({ dest: "temp/" });

// Database connection
const connection = require("./../db");

const publicationFolder = "publications";

async function uploadJulkaisu(req: Request, res: Response) {
    upload.single("file") (req, res, async function () {

        const julkaisuid = req.body.data.id;
        const file = (<any>req).file;

        const valid = await validate(file.originalname, file.path);

        // if (!valid) {
        //     return res.status(403).send( "Invalid file" );
        // } else {
        //     return res.status(200).send("File uploaded succesfully");
        // }

        const fileMoved = await moveFile(file, julkaisuid);

        if (fileMoved) {
            await updateHelperTables(file, julkaisuid);
        } else {
            // if file transfer leads to error, delete file from temp folder
            fs.unlinkSync(file.path);
            return res.status(500).send( "Failure in file transfer" );
        }

    });

}

async function updateHelperTables(file: any, julkaisuid: any) {

    const julkaisuColumns = new connection.pgp.helpers.ColumnSet(["julkaisuid"], {table: "julkaisujono"});
    const query = connection.pgp.helpers.insert({"julkaisuid": julkaisuid }, julkaisuColumns) + "RETURNING id";

    const jonoid = await connection.db.one(query);
    console.log(jonoid);

}


async function moveFile (file: any, id: any) {

   let done: boolean = true;

    const publicationDir = publicationFolder + "/" + id;

    try {
        // create folder for publications, for identifying we put file to folder which name is publication id
        fs.mkdirSync(publicationDir, function (err: any) {
            // if (err) throw err;
        });

        // after creating folder we move publication to that folder
        const oldPath = file.path;
        const newPath = publicationDir + "/" + file.filename;

        // TODO: rename also filename (etc file.blob)
        fs.rename(oldPath, newPath, function (err: any) {
            // if (err) throw err;
            console.log("Successfully moved publication");
        });

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


module.exports = {
    uploadJulkaisu: uploadJulkaisu
};