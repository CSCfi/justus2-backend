import { Request, Response, NextFunction } from "express";
import { authService as authService } from "../services/authService";
import { csvHandler as csvHandler } from "../services/csvHandler";

const fs = require("fs");
const path = require("path");

const csvUploadFolder = process.env.CSV_UPLOAD_FOLDER;

// File upload dependencies
const multer  = require("multer");

export const countRowsToBeDeleted = async (req: Request, res: Response) => {

    const user = req.session.userData;
    // const user = await authService.getUserData(req.headers);

    if (!user) {
        return res.status(401).send("Unauthorized");
    }

    const organization = user.organisaatio;
    const isAdmin = await authService.isAdmin(user);

    if (organization && isAdmin) {
        try {
            const storage = multer.diskStorage(
                {
                    destination: csvUploadFolder,
                    filename: function (req: any, file: any, cb: any) {
                        cb(undefined, organization);
                    }
                }
            );

            const fileFilter = (req: any, file: any, cb: any) => {
                const fileExt = path.extname(file.originalname).toLowerCase();
                if (fileExt === ".csv") {
                    cb(undefined, true);
                } else {
                    cb(new Error("Invalid file type"), false);
                }
            };

            const csvUpload = multer({
                storage: storage,
                fileFilter: fileFilter
            });

            csvUpload.single("file")(req, res, function (err: Error) {
                if (err) {
                    console.log(err);
                    return res.status(500).send(err.message);
                } else if (!(<any>req).file) {
                    return res.status(400).send("File is missing");
                }

                try {
                    const file = (<any>req).file;
                    const promise = csvHandler.readCSV(file.path, organization, true);
                    promise.then((data: any) => {
                        res.status(200).json(data);
                    }).catch(function (err: any) {
                        console.log(err);
                        res.status(500).send(err);
                        setTimeout(function () {
                            fs.unlinkSync(file.path);
                        }, 2000);

                    });
                } catch (e) {
                    console.log(e.message);
                    return res.status(500).send(e.message);
                }

            });
        } catch (e) {
            return res.status(500).send(e.message);
        }

    } else {
        return res.status(403).send("Permission denied");
    }
};

export const savePersons = async (req: Request, res: Response) => {

    const user = req.session.userData;
    // const user = await authService.getUserData(req.headers);

    if (!user) {
        return res.status(401).send("Unauthorized");
    }

    const organization = user.organisaatio;
    const isAdmin = await authService.isAdmin(user);

    if (organization && isAdmin) {
        const filePath = csvUploadFolder + organization;
        const promise = csvHandler.readCSV(filePath, organization, false, req.headers);

        promise.then(() => {
            fs.unlinkSync(filePath);
            res.status(200).send("OK");
        }).catch(function (err: any) {
            console.log(err);
            fs.unlinkSync(filePath);
            res.status(500).send(err.message);
        });
    } else {
        return res.status(403).send("Permission denied");
    }

};

export const deleteCsvFile = async (req: Request, res: Response) => {

    const user = req.session.userData;
    // const user = await authService.getUserData(req.headers);

    if (!user) {
        return res.status(401).send("Unauthorized");
    }

    const organization = user.organisaatio;

    if (organization) {
        const filePath = csvUploadFolder + organization;

        fs.unlink(filePath, (err: Error) => {
            if (err) {
                console.log(err.message);
                res.status(500).send(err.message);
            } else {
                console.log("CSV file removed successfully");
                res.sendStatus(200);
            }

        });
    } else {
        return res.status(403).send("Permission denied");
    }


};