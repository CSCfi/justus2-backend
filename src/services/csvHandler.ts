import { IncomingHttpHeaders } from "http";
const csv = require("csv-parser");
const fs = require("fs");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const csvFolder = process.env.CSV_DOWNLOAD_FOLDER;

// Database connection from db.ts
const connection = require("./../db");
const iconv = require("iconv-lite");

import { personQueries as personQueries } from "../queries/personQueries";
import { Person } from "../types/Person";

class CsvHandler {

    readCSV = async (filePath: any, organization: string, fetchOnlyIds: boolean, requestHeaders?: IncomingHttpHeaders) => {

        const results: any = [];
        const ids: any = [];

        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(iconv.decodeStream("latin1"))
                .pipe(csv(
                    {
                        separator: ";",
                        strict: true,
                    }
                ))
                .on("headers", (headers: any) => {
                    const expectedHeaders = ["tunniste", "etunimi", "sukunimi", "email", "orcid", "alayksikko1", "alayksikko2", "alayksikko3"];

                    if (!this.arrayEquals(expectedHeaders, headers)) {
                        reject("CSV header or content column count does not match expected. Please check your CSV file.");
                    }

                })
                .on("data", (row: Person) => {
                    results.push(row);
                    ids.push(row.tunniste);
                })
                .on("end", () => {
                    if (fetchOnlyIds) {
                        personQueries.getRowsToBeDeleted(ids, organization, false).then((data: any) => {
                            resolve(data);
                        }).catch((err) => {
                            reject(err.message);
                        });

                    } else {
                        this.processCSVData(results, organization, ids, requestHeaders).then((err: Error) => {
                            if (err) {
                                reject(err.message);
                            } else {
                                resolve();
                                console.log("Data inserted to database!");
                            }
                        }).catch((err) => {
                            console.log(err);
                            reject(err.message);
                        });
                    }

                })
                .on("error", (err: Error) => {
                    console.log(err.message);
                    reject(err.message);
                });

        });

    }

    writeCSV = async (data: any, org: string) => {

        const csvWriter = createCsvWriter({
            path: csvFolder + org + "_file.csv",
            header: [
                {id: "tunniste", title: "tunniste"},
                {id: "etunimi", title: "etunimi"},
                {id: "sukunimi", title: "sukunimi"},
                {id: "email", title: "email"},
                {id: "orcid", title: "orcid"},
                {id: "alayksikko1", title: "alayksikko1"},
                {id: "alayksikko2", title: "alayksikko2"},
                {id: "alayksikko3", title: "alayksikko3"}
            ],
            fieldDelimiter: ";",
            encoding: "latin1"
        });
        const records: any = [];

        for (let i = 0; i < data.length; i++) {
            await records.push({
                tunniste: data[i].tunniste,
                etunimi: data[i].etunimi,
                sukunimi: data[i].sukunimi,
                email: data[i].email,
                orcid: data[i].orcid,
                alayksikko1: data[i].alayksikko[0],
                alayksikko2: data[i].alayksikko[1],
                alayksikko3: data[i].alayksikko[2],
            });
        }
        return await csvWriter.writeRecords(records);
    }


    processCSVData = async (csvData: any, organization: string, tunnisteList: any, headers: IncomingHttpHeaders) => {

        // first validate
        const invalid = await this.validateCSVFields(csvData, organization);

        if (invalid) {
            let errorText;
            if (invalid.reason === "duplicate") {
                console.log(invalid.reason);
                errorText = "CSV contains duplicate value in field " + invalid.field;
            }
            if (invalid.reason === "missing") {
                console.log(invalid.reason);
                errorText = "CSV has missing value in field " + invalid.field;
            }
            if (invalid.reason === "format") {
                console.log(invalid.reason);
                errorText = "Invalid format in field " + invalid.field;
            }
            return new Error(errorText);
        } else {
            await connection.db.any("BEGIN");
            try {

                // loop through all rows before commit
                for (let i = 0; i < csvData.length; i++) {
                    await personQueries.savePersonData(csvData[i], organization, headers);
                }

                const listOfIds = await personQueries.getRowsToBeDeleted(tunnisteList, organization, true);

                if (listOfIds.length !== 0) {
                    for (let i = 0; i < listOfIds.length; i++) {
                        await personQueries.deletePerson(listOfIds[i].id, headers);
                    }
                }
                await connection.db.any("COMMIT");

            } catch (e) {
                console.log("In process CSV data error block");
                console.log(e);
                // if error exists in any row, rollback and return error to client
                await connection.db.any("ROLLBACK");
                return e;
            }
        }
    }

    validateCSVFields = async (csv: any, org: string) => {

        const errorObject = {field: "", reason: ""};

        if (await this.hasDuplicates(csv, "tunniste")) {
            errorObject.field = "tunniste";
            errorObject.reason = "duplicate";
            return errorObject;
        }
        if (await this.hasDuplicates(csv, "orcid")) {
            errorObject.field = "orcid";
            errorObject.reason = "duplicate";
            return errorObject;
        }
        if (await this.hasInvalidPatternOrcid(csv)) {
            errorObject.field = "orcid";
            errorObject.reason = "format";
            return errorObject;
        }
        if (await this.isFieldEmpty(csv, "tunniste")) {
            errorObject.field = "tunniste";
            errorObject.reason = "missing";
            return errorObject;
        }
        if (await this.isFieldEmpty(csv, "etunimi")) {
            errorObject.field = "etunimi";
            errorObject.reason = "missing";
            return errorObject;
        }
        if (await this.isFieldEmpty(csv, "sukunimi")) {
            errorObject.field = "sukunimi";
            errorObject.reason = "missing";
            return errorObject;
        }
        if (await this.isAlayksikkoInvalid(csv, org)) {
            errorObject.field = "alayksikko";
            errorObject.reason = "format";
            return errorObject;
        }
        // no errors, return undefined
        return undefined;

    }

    arrayEquals = (a: any, b: any) => {
        return Array.isArray(a) &&
            Array.isArray(b) &&
            a.length === b.length &&
            a.every((val, index) => val === b[index]);
    }

    filterEmptyValues = async (csv: any, field: string) => {

        const filterednames = csv.filter(function (obj: any) {
            return (obj[field] !== "") && (obj[field] !== undefined);
        });

        return filterednames;

    }

    hasDuplicates = async (csv: any, field: string) => {

        let filteredArray;

        if (field === "orcid") {
            filteredArray = await this.filterEmptyValues(csv, "orcid");
        } else {
            filteredArray = csv;
        }

        const seen = new Set();
        const duplicate = filteredArray.some(function (currentObject: any) {
            return seen.size === seen.add(currentObject[field]).size;
        });

        return duplicate;
    }

    isFieldEmpty = async (csv: any, field: string)  => {
        const empty = (csv.some((e: any) => e[field] === "" || e[field] == undefined));
        return empty;
    }

    hasInvalidPatternOrcid = async (csv: any) => {

        // first filter empty values
        const filteredArray = await this.filterEmptyValues(csv, "orcid");
        const regex = new RegExp(/^(|[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X])$/g);

        // trim whitespaces
        Object.keys(filteredArray).map(k => filteredArray[k].orcid = filteredArray[k].orcid.trim());

        const invalidOrcids = filteredArray.filter(function (obj: any) {
            return (!obj.orcid.match(regex) || obj.orcid === "0000-0000-0000-0000");
        });

        if (invalidOrcids.length) {
            return true;
        }
        return false;
    }

    isAlayksikkoInvalid = async (csv: any, org: string) => {

        // format: <organization code>-<year>- for example: 02356-2020-
        const regex = new RegExp(`^${org}-\\d{4}-`);

        const unitOne = await this.filterEmptyValues(csv, "alayksikko1");
        const invalidUnits1 = unitOne.filter(function (obj: any) {
            return (!obj.alayksikko1.match(regex));
        });
        console.log(invalidUnits1);
        if (invalidUnits1.length) {
            return true;
        }

        const unitTwo = await this.filterEmptyValues(csv, "alayksikko2");
        const invalidUnits2 = unitTwo.filter(function (obj: any) {
            return (!obj.alayksikko2.match(regex));
        });
        console.log(invalidUnits2);
        if (invalidUnits2.length) {
            return true;
        }

        const unitThree = await this.filterEmptyValues(csv, "alayksikko3");
        const invalidUnits3 = unitThree.filter(function (obj: any) {
            return (!obj.alayksikko3.match(regex));
        });
        console.log(invalidUnits3);
        if (invalidUnits3.length) {
            return true;
        }

        return false;
    }

}

export const csvHandler = new CsvHandler();

