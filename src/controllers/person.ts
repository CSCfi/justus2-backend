import { Request, Response, NextFunction } from "express";

// Database connection from db.ts
const connection = require("../db");
const db = connection.db;
const fs = require("fs");

import { authService as authService } from "../services/authService";
import { personQueries as personQueries } from "../queries/personQueries";
import { csvHandler as csvHandler } from "../services/csvHandler";
import { UserObject } from "../types/User";

let userData: UserObject["perustiedot"];

export const downloadPersons = async(req: Request, res: Response) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(userData);
    const isAdmin = await authService.isAdmin(userData);

    if (hasOrganisation && isAdmin) {

        const organization = userData.organisaatio;

        try {

            const csvFilePath = process.env.CSV_DOWNLOAD_FOLDER;
            const fileName = organization + "_persons.csv";
            console.log(fileName);

            // query persons and organisational units
            const persons = await personQueries.queryPersons(organization);

            // query orcid
            for (let i = 0; i < persons.length; i++) {
                const personid = persons[i].id;
                persons[i].orcid = await personQueries.getOrcidData(personid);
            }

            // create CSV file to csv-download folder
            csvHandler.writeCSV( persons, organization).then(() => {

                // send data to UI
               return res.download(csvFilePath + organization + "_file.csv", fileName, function (err: any) {
                    if (err) {
                        console.log(err);
                    }
                   // after download delete csv file
                    setTimeout(function() {
                        fs.unlinkSync(csvFilePath + organization + "_file.csv");
                        console.log("File removed successfully");
                    }, 2000);
                });
            });

        } catch (e) {
            console.log(e);
            res.status(500).send(e.message);
        }

    } else {
        return res.status(403).send("Permission denied");
    }

};

export const getPersonListaus = async(req: Request, res: Response) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(userData);

    if (hasOrganisation) {
        const organization = userData.organisaatio;

        try {
            // query persons and organisational units
            const persons = await personQueries.queryPersons(organization);

            // query orcid
            for (let i = 0; i < persons.length; i++) {
                const personid = persons[i].id;
                persons[i].orcid = await personQueries.getOrcidData(personid);
            }
            res.status(200).json({persons});
        } catch (err) {
            console.log(err);
            res.sendStatus(500);
        }

    } else {
        return res.status(403).send("Permission denied");
    }

};


export const postPerson = async (req: Request, res: Response) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(userData);
    const isAdmin = await authService.isAdmin(userData);

    if (hasOrganisation && isAdmin) {

        await db.any("BEGIN");

        try {
            const organization = userData.organisaatio;

            const personObj = req.body;
            const tunniste = req.body.tunniste;
            const orcid = req.body.orcid;

            // First verify that user with this tunniste and organization combination does not exist in database
            const tunnisteData = await personQueries.checkIfPersonExists(organization, tunniste);

            if (tunnisteData) {
                return res.status(400).send("This user already exists in database");
            }

            personObj.alayksikko1 = personObj.alayksikko[0];
            personObj.alayksikko2 = personObj.alayksikko[1];
            personObj.alayksikko3 = personObj.alayksikko[2];
            delete personObj.alayksikko;

            const personid = await personQueries.insertPerson(personObj, organization, req.headers);

            // insert data to person_organization table
            await personQueries.insertOrganisaatioTekija(personid, personObj, organization, req.headers);

            // insert data to person_identifier table (save orcid only if data exists)
            if (orcid && orcid !== "") {
                const orcidData = await personQueries.checkIfOrcidExists(organization, orcid);
                // before saving check that this orcid does not already exist in database
                if (orcidData) {
                    return res.status(400).send("This orcid is already in use in this organization");
                }
                await personQueries.insertOrcid(personid, orcid, req.headers);
            }
            await db.any("COMMIT");
            res.status(200).send("OK");
        } catch (e) {
            console.log(e);
            await db.any("ROLLBACK");
            res.status(500).send(e.message);
        }
    } else {
        return res.status(403).send("Permission denied");
    }
};

export const updatePerson = async (req: Request, res: Response) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(userData);
    const isAdmin = await authService.isAdmin(userData);

    const organization = userData.organisaatio;

    const orcid = req.body.orcid;
    const personid = req.body.id;

    const personData = {
        "etunimi": req.body.etunimi,
        "sukunimi": req.body.sukunimi,
        "email": req.body.email,
        "modified": new Date()
    };

    const alayksikkoData = {
        "alayksikko1": req.body.alayksikko[0],
        "alayksikko2": req.body.alayksikko[1],
        "alayksikko3": req.body.alayksikko[2],
    };

    if (hasOrganisation && isAdmin) {

        await db.any("BEGIN");

        try {

            // update data in person table
            await personQueries.updatePerson(personid, personData, req.headers);

            // delete previous organisational units
            await personQueries.deleteOrganizationData(personid, req.headers);

            // insert organisational units
            await personQueries.insertOrganisaatioTekija(personid, alayksikkoData, organization, req.headers);

            // check if user currently has orcid
            const identifierId = await personQueries.checkIfPersonHasOrcid(personid);

            if (!orcid && identifierId) {
                await personQueries.deleteIdentifierData(personid, "orcid", req.headers);
            } else if (orcid && identifierId) {
                // Verify that ORCID is not in use in this organization
                const orcidData = await personQueries.checkIfOrcidExists(organization, orcid, personid);
                if (orcidData) {
                    return res.status(400).send("This orcid is already in use in this organization");
                }
                await personQueries.updateOrcid(personid, orcid, req.headers);
            } else if (!identifierId && orcid) {
                // Verify that ORCID is not in use in this organization
                const orcidData = await personQueries.checkIfOrcidExists(organization, orcid, undefined);
                if (orcidData) {
                    return res.status(400).send("This orcid is already in use in this organization");
                }
                await personQueries.insertOrcid(personid, orcid, req.headers);
            }

            await db.any("COMMIT");
            res.status(200).send("Update successful!");

        } catch (err) {
            console.log(err);
            await db.any("ROLLBACK");
            res.status(500).send(err.message);
        }
    } else {
        return res.status(403).send("Permission denied");
    }

};

export const getPublicationListForOnePerson = async (req: Request, res: Response) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(userData);
    const isAdmin = await authService.isAdmin(userData);

    if (hasOrganisation && isAdmin) {

        try {
            const orcid = req.params.orcid;
            const params = {"orcid": orcid};

            const query = "SELECT o.orcid, j.id, j.julkaisunnimi FROM organisaatiotekija o" +
                " INNER JOIN julkaisu j on o.julkaisuid = j.id" +
                " WHERE o.orcid = ${orcid};";

            const publications = await db.any(query, params);

            res.status(200).json({publications});
        } catch (e) {
            console.log(e.message);
            res.sendStatus(500);
        }

    } else {
        return res.status(403).send("Permission denied");
    }
};

export const removePerson = async (req: Request, res: Response) => {

    userData = req.session.userData;
    // userData = await authService.getUserData(req.headers);

    const hasOrganisation = await authService.hasOrganisation(userData);
    const isAdmin = await authService.isAdmin(userData);

    if (hasOrganisation && isAdmin) {

        try {

            const personid = parseInt(req.params.id);
            await personQueries.deletePerson(personid, req.headers);

            res.status(200).send("Person successfully deleted");
        } catch (e) {
            console.log(e.message);
            res.sendStatus(500);
        }

    } else {
        return res.status(403).send("Permission denied");
    }
};

