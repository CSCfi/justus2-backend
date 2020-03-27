const csv = require("csv-parser");
const fs = require("fs");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const csvFolder = process.env.CSV_DOWNLOAD_FOLDER;

// Database connection from db.ts
const connection = require("./../db");

const iconv = require("iconv-lite");

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

    async function readCSV (filePath: any) {

        // fs.readdirSync("./csv-data").forEach((fileName: string) => {
        //     console.log(fileName);
        //     creteJsonObject(fileName);
        // });

        const results: any = [];

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
                })
                .on("end", () => {
                    processCSVData(results).then(() => {
                        console.log("Data inserted to database!");
                        resolve();
                    }).catch(function (err) {
                        console.log(err);
                        reject(err);
                    });
                })
                .on("error", (err: Error) => {
                    console.log(err.message);
                    reject(err);
                });

        });

    }

    async function writeCSV(data: any, org: string) {

        // TODO: if no data, return empty CSV with headers

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


async function processCSVData(csvData: any) {
        for (let i = 0; i < csvData.length; i++) {
            await  savePersonData(csvData[i]);
    }
}

async function savePersonData(person: PersonObject) {

    const personColumns = [
        "etunimi",
        "sukunimi",
        "email"
    ];

    const organizationColumns = [
        "personid",
        "organisaatiotunniste",
        "alayksikko"
    ];

   // first check if hrnumero in guestion exists on database
    const hrnumero = person.hrnumero;

    if (!hrnumero || hrnumero === "") {
        return;
    }

    const hrnumeroParams = {"hrnumero": hrnumero};

    const query = "SELECT id FROM person WHERE hrnumero = " +
        "${hrnumero};";

    const data = await connection.db.oneOrNone(query, hrnumeroParams);

    // TODO: Validation: Required fields: hrnumero, etunimi, sukunimi, alayksikko1 (for specific organizations), validate also alayksikko format

    if (!data) {
    //   insert new record
        try {
            const personValues = [{"hrnumero": person.hrnumero, "etunimi": person.etunimi,
                "sukunimi": person.sukunimi, "email": person.email}];

            personColumns.push("hrnumero");

            const savePerson = new connection.pgp.helpers.ColumnSet(personColumns, {table: "person"});
            const personPromise = connection.pgp.helpers.insert(personValues, savePerson) + " RETURNING id";

            // db.any("BEGIN");
            // TODO: Add transaction

            const personId = await connection.db.one(personPromise);

            // TODO: refactor alyksikko insert

            const organizationValues = [{"personid": personId.id, "organisaatiotunniste": person.organisaatio, "alayksikko": person.alayksikko1}];
            const saveOrganization = new connection.pgp.helpers.ColumnSet(organizationColumns, {table: "person_organization"});
            const organizationPromise = connection.pgp.helpers.insert(organizationValues, saveOrganization) + " RETURNING id";

            await connection.db.one(organizationPromise);

            // save orcid only if data exists
            if (person.orcid || person.orcid !== "") {
                await insertOrcid(personId.id, person.orcid);
            }


            if (person.alayksikko2) {
                const organizationValues2 = [{"personid": personId.id, "organisaatiotunniste": person.organisaatio, "alayksikko": person.alayksikko2}];
                const organizationPromise2 = connection.pgp.helpers.insert(organizationValues2, saveOrganization) + " RETURNING id";
                const organizationId2 = await connection.db.one(organizationPromise2);
            }

            if (person.alayksikko3) {
                const organizationValues3 = [{"personid": personId.id, "organisaatiotunniste": person.organisaatio, "alayksikko": person.alayksikko3}];
                const organizationPromise3 = connection.pgp.helpers.insert(organizationValues3, saveOrganization) + " RETURNING id";
                const organizationId3 = await connection.db.one(organizationPromise3);
            }

        }
        catch (e) {
            return e;
        }

    } else {

        const personid = data.id;

        personColumns.push("modified");
        const updatePersonObj = {"etunimi": person.etunimi, "sukunimi": person.sukunimi, "email": person.email, "modified": new Date() };
        const personTable = new connection.pgp.helpers.ColumnSet(personColumns, {table: "person"});
        const updatePersonQuery = connection.pgp.helpers.update(updatePersonObj, personTable) + " WHERE hrnumero = " + "${hrnumero}" + " RETURNING id;";

        await connection.db.one(updatePersonQuery, hrnumeroParams);

        if (!person.orcid || person.orcid === "") {
            return;
        } else {
        //    update or insert orcid to database
            const personidParams = {"personid": personid};
            const orcidQuery = "SELECT id FROM person_identifier WHERE personid = " +
                "${personid} AND tunnistetyyppi = 'orcid';";

            const identifierId = await connection.db.oneOrNone(orcidQuery, personidParams);

            if (identifierId) {
            // update orcid
                const updatIdentifierObj = {"tunniste": person.orcid, "modified": new Date() };
                const identifierTable = new connection.pgp.helpers.ColumnSet(["tunniste", "modified"], {table: "person_identifier"});
                const updateIdentifierQuery = connection.pgp.helpers.update(updatIdentifierObj, identifierTable) +
                    " WHERE personid = " + "${personid}" + " AND tunnistetyyppi = 'orcid' RETURNING id;";

                const identifierPromise = await connection.db.one(updateIdentifierQuery, personidParams);

            } else {
                // insert new record
                await insertOrcid(personid, person.orcid);

            }

        }

    }

}

async function insertOrcid(personID: number, orcid: String) {
    const identifierValues = [{"personid": personID, "tunnistetyyppi": "orcid", "tunniste": orcid }];
    const saveIdentifier = new connection.pgp.helpers.ColumnSet(identifierColumns, {table: "person_identifier"});
    const identifierPromise = connection.pgp.helpers.insert(identifierValues, saveIdentifier) + " RETURNING id";

    await connection.db.one(identifierPromise);
}


const identifierColumns = [
    "personid",
    "tunnistetyyppi",
    "tunniste"
];


module.exports = {
    readCSV: readCSV,
    writeCSV: writeCSV

};


