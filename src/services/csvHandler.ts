const csv = require("csv-parser");
const fs = require("fs");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const csvFolder = process.env.CSV_DOWNLOAD_FOLDER;

// Database connection from db.ts
const connection = require("./../db");
const iconv = require("iconv-lite");

const personQueries = require("./../queries/personTableQueries");

interface PersonObject  {
    hrnumero: string;
    etunimi: string;
    sukunimi: string;
    email: string;
    orcid: string;
    organisaatio: string;
    alayksikko1: string;
    alayksikko2: string;
    alayksikko3: string;
}

    async function readCSV (filePath: any, organization: string, fetchOnlyIds: boolean) {

        const results: any = [];
        const ids: any = [];

        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(iconv.decodeStream("latin1"))
                .pipe(csv(
                    {
                        headers: [
                            "hrnumero",
                            "etunimi",
                            "sukunimi",
                            "email",
                            "orcid",
                            "organisaatio",
                            "alayksikko1",
                            "alayksikko2",
                            "alayksikko3"
                        ],
                        separator: ";",
                        strict: true,
                        skipLines: 1

                    }
                ))
                .on("data", (row: PersonObject) => {
                    results.push(row);
                    ids.push(row.hrnumero);
                })
                .on("end", () => {
                    if (fetchOnlyIds) {
                        getRowsToBeDeleted(ids, organization, false).then((data: any) => {
                            resolve(data);
                        }).catch((err) => {
                            reject(err);
                        });

                    } else {
                        processCSVData(results, organization, ids).then((err: Error) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                                console.log("Data inserted to database!");
                            }

                        }).catch((err) => {
                            console.log(err);
                            reject(err);
                        });
                    }

                })
                .on("error", (err: Error) => {
                    console.log(err.message);
                    reject(err);
                });

        });

    }

    async function writeCSV(data: any, org: string) {

        const csvWriter = createCsvWriter({
            path: csvFolder + org + "_file.csv",
            header: [
                {id: "hrnumero", title: "hrnumero"},
                {id: "etunimi", title: "etunimi"},
                {id: "sukunimi", title: "sukunimi"},
                {id: "email", title: "email"},
                {id: "orcid", title: "orcid"},
                {id: "organisaatio", title: "organisaatio"},
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
                hrnumero: data[i].hrnumero,
                etunimi: data[i].etunimi,
                sukunimi: data[i].sukunimi,
                email: data[i].email,
                orcid: data[i].orcid,
                organisaatio: org,
                alayksikko1: data[i].alayksikko[0],
                alayksikko2: data[i].alayksikko[1],
                alayksikko3: data[i].alayksikko[2],
            });
        }
        return await csvWriter.writeRecords(records);
    }


async function processCSVData(csvData: any, organization: string, hrNumberList: any) {

    // loop through all rows before commit
    await connection.db.any("BEGIN");
    try {

        for (let i = 0; i < csvData.length; i++) {
            await personQueries.savePersonData(csvData[i], organization);
        }

        const listOfIds = await getRowsToBeDeleted(hrNumberList, organization, true);

        if (listOfIds.length !== 0) {
            await deleteRows(listOfIds);
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

async function deleteRows(idList: any) {

    const idArray: number[] = [];

    for (let i = 0; i < idList.length; i++) {
        idArray.push(parseInt(idList[i].id));
    }

    const params = { "idArray": [idArray] };

    await connection.db.any("DELETE FROM person " +
        "WHERE id = ANY ( ${idArray} )", params );

}

async function getRowsToBeDeleted(hrNumberList: any, organization: string, onlyIds: boolean) {

    const hrNumberString =  "{ " + hrNumberList.toString() + " }";

    const params = { "hrnumero": hrNumberString, "organization": organization };
    let query;

    const queryAll = "SELECT DISTINCT p.id, p.hrnumero, p.etunimi, p.sukunimi, o.organisaatiotunniste FROM person p " +
        "INNER JOIN person_organization o on p.id = o.personid WHERE p.hrnumero <> ALL ( ${hrnumero} ) " +
        "AND o.organisaatiotunniste = '02536' ORDER BY p.id;";

    const queryIds = "SELECT DISTINCT p.id FROM person p " +
        "INNER JOIN person_organization o on p.id = o.personid WHERE p.hrnumero <> ALL ( ${hrnumero} ) " +
        "AND o.organisaatiotunniste = '02536' ORDER BY p.id;";

    if (onlyIds) {
        query = queryIds;
    } else {
        query = queryAll;
    }
    return await connection.db.any(query, params);

}

module.exports = {
    readCSV: readCSV,
    writeCSV: writeCSV
};


