import { IncomingHttpHeaders } from "http";
const csv = require("csv-parser");
const fs = require("fs");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const csvFolder = process.env.CSV_DOWNLOAD_FOLDER;

// Database connection from db.ts
const connection = require("./../db");
const iconv = require("iconv-lite");

import { personQueries as personQueries } from "./../queries/personTableQueries";
import { PersonObject } from "../models/Person";

    async function readCSV (filePath: any, organization: string, fetchOnlyIds: boolean, requestHeaders?: IncomingHttpHeaders) {

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
                    console.log(headers);
                    const expectedHeaders = ["tunniste", "etunimi", "sukunimi", "email", "orcid", "alayksikko1", "alayksikko2", "alayksikko3"];

                    if (!arrayEquals(expectedHeaders, headers)) {
                        reject ("CSV header or content column count does not match expected. Please check your CSV file.");
                    }

                })
                .on("data", (row: PersonObject) => {
                    results.push(row);
                    ids.push(row.tunniste);
                })
                .on("end", () => {
                    if (fetchOnlyIds) {
                        getRowsToBeDeleted(ids, organization, false).then((data: any) => {
                            resolve(data);
                        }).catch((err) => {
                            reject(err.message);
                        });

                    } else {
                        processCSVData(results, organization, ids, requestHeaders).then((err: Error) => {
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

    async function writeCSV(data: any, org: string) {

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


async function processCSVData(csvData: any, organization: string, tunnisteList: any, headers: IncomingHttpHeaders) {

        // first validate
        const invalid = await validateCSVFields(csvData, organization);

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

              const listOfIds = await getRowsToBeDeleted(tunnisteList, organization, true);

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

async function validateCSVFields(csv: any, org: string) {

    const errorObject = { field: "", reason: "" };

    if (await hasDuplicates(csv, "tunniste")) {
        errorObject.field = "tunniste";
        errorObject.reason = "duplicate";
        return errorObject;
    }
    if (await hasDuplicates(csv, "orcid")) {
        errorObject.field = "orcid";
        errorObject.reason = "duplicate";
        return errorObject;
    }
    if (await hasInvalidPatternOrcid(csv)) {
        errorObject.field = "orcid";
        errorObject.reason = "format";
        return errorObject;
    }
    if (await isFieldEmpty(csv, "tunniste")) {
        errorObject.field = "tunniste";
        errorObject.reason = "missing";
        return errorObject;
    }
    if (await isFieldEmpty(csv, "etunimi")) {
        errorObject.field = "etunimi";
        errorObject.reason = "missing";
        return errorObject;
    }
    if (await isFieldEmpty(csv, "sukunimi")) {
        errorObject.field = "sukunimi";
        errorObject.reason = "missing";
        return errorObject;
    }
    if (await isAlayksikkoInvalid(csv, org)) {
        errorObject.field = "alayksikko";
        errorObject.reason = "format";
        return errorObject;
    }
     // no errors, return undefined
     return undefined;

}

async function getRowsToBeDeleted(tunnisteList: any, organization: string, onlyIds: boolean) {

    const tunnisteString =  "{ " + tunnisteList.toString() + " }";

    const params = { "tunniste": tunnisteString, "organization": organization };
    let query;

    const queryAll = "SELECT DISTINCT p.id, p.tunniste, p.etunimi, p.sukunimi, o.organisaatiotunniste FROM person p " +
        "INNER JOIN person_organization o on p.id = o.personid WHERE p.tunniste <> ALL ( ${tunniste} ) " +
        "AND o.organisaatiotunniste = ${organization} ORDER BY p.id;";

    const queryIds = "SELECT DISTINCT p.id FROM person p " +
        "INNER JOIN person_organization o on p.id = o.personid WHERE p.tunniste <> ALL ( ${tunniste} ) " +
        "AND o.organisaatiotunniste = ${organization} ORDER BY p.id;";

    if (onlyIds) {
        query = queryIds;
    } else {
        query = queryAll;
    }
    return await connection.db.any(query, params);

}

function arrayEquals(a: any, b: any) {
    return Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}

async function filterEmptyValues(csv: any, field: string) {

    const filterednames = csv.filter(function(obj: any) {
        return (obj[field] !== "") && (obj[field] !== undefined);
    });

    return filterednames;

}

async function hasDuplicates(csv: any, field: string) {

    let filteredArray;

    if (field === "orcid") {
        filteredArray = await filterEmptyValues(csv, "orcid");
    } else {
        filteredArray = csv;
    }

    const seen = new Set();
    const duplicate = filteredArray.some(function(currentObject: any) {
        return seen.size === seen.add(currentObject[field]).size;
    });

    return duplicate;
}

async function isFieldEmpty(csv: any, field: string) {
    const empty = (csv.some((e: any) => e[field] === "" || e[field] == undefined));
    return empty;
}

async function hasInvalidPatternOrcid(csv: any) {

    // first filter empty values
    const filteredArray = await filterEmptyValues(csv, "orcid");
    const regex = new RegExp( /^(|[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X])$/g);

    const invalidOrcids = filteredArray.filter(function(obj: any) {
        return (!obj.orcid.match(regex));
    });

    if (invalidOrcids.length) {
        return true;
    }
    return false;
}

async function isAlayksikkoInvalid(csv: any, org: string) {

    // format: <organization code>-<year>- for example: 02356-2020-
    const regex = new RegExp(`^${org}-\\d{4}-`);

    const unitOne = await filterEmptyValues(csv, "alayksikko1");
    const invalidUnits1 = unitOne.filter(function(obj: any) {
        return (!obj.alayksikko1.match(regex));
    });
    console.log(invalidUnits1);
    if (invalidUnits1.length) {
        return true;
    }

    const unitTwo = await filterEmptyValues(csv, "alayksikko2");
    const invalidUnits2 = unitTwo.filter(function(obj: any) {
        return (!obj.alayksikko2.match(regex));
    });
    console.log(invalidUnits2);
    if (invalidUnits2.length) {
        return true;
    }

    const unitThree = await filterEmptyValues(csv, "alayksikko3");
    const invalidUnits3 = unitThree.filter(function(obj: any) {
        return (!obj.alayksikko3.match(regex));
    });
    console.log(invalidUnits3);
    if (invalidUnits3.length) {
        return true;
    }

    return false;
}

module.exports = {
    readCSV: readCSV,
    writeCSV: writeCSV
};


