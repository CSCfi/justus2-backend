const csv = require("csv-parser");
const fs = require("fs");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// Database connection from db.ts
const connection = require("./../db");

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


module.exports = {
    readCSV: async function () {

        // fs.readdirSync("./csv-data").forEach((fileName: string) => {
        //     console.log(fileName);
        //     creteJsonObject(fileName);
        // });

        createJsonObject("person3.csv");
    },

    writeCSV: async function(data: any) {

        // TODO: if no data, return empty CSV with headers

        const csvWriter = createCsvWriter({

            path: "./csv-writer/persons.csv",
            header: [
                {id: "hrnumero", title: "hrnumero"},
                {id: "etunimi", title: "etunimi"},
                {id: "sukunimi", title: "sukunimi"},
                {id: "email", title: "email"},
                {id: "orcid", title: "orcid"},
                {id: "alayksikko1", title: "alayksikko1"}

            ],
            fieldDelimiter: ";"
        });
        const records: any = [];

         // TODO: Validation: Required fields: hrnumero, etunimi, sukunimi, alayksikko1 (for specific organizations), validate also alayksikko format

        for (let i = 0; i < data.length; i++) {
            console.log(i);
            await records.push({
                hrnumero: data[i].hrnumero, etunimi: data[i].etunimi, sukunimi: data[i].sukunimi, email: data[i].email,
                orcid: data[i].orcid, alayksikko1: data[i].alayksikko1
            });
        }

        csvWriter.writeRecords(records)
            .then(() => {
                console.log("...Done");
            });
    }
};

async function createJsonObject(fileName: string) {

    const results: any = [];
    const folderPath = "./csv-data/" + fileName;
    fs.createReadStream(folderPath)
        .pipe(csv(
            {
                headers: ["hrnumero", "etunimi", "sukunimi", "email", "orcid", "organisaatio", "alayksikko1", "alayksikko2", "alayksikko3"],
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
            });
        })
        .on("error", (err: Error) => {
            console.log(err.message);
        });
}

async function processCSVData(csvData: any) {
    for (let i = 0; i < csvData.length; i++) {
        await savePersonData(csvData[i]);
    }

}

async function savePersonData(result: PersonObject) {

    const personColumns = [
        "hrnumero",
        "etunimi",
        "sukunimi",
        "email"
    ];

    const organizationColumns = [
        "personid",
        "organisaatiotunniste",
        "alayksikko"
    ];

    const identifierColumns = [
        "personid",
        "tunnistetyyppi",
        "tunniste"
    ];

    // person table, return id
    const personValues = [{"hrnumero": result.hrnumero, "etunimi": result.etunimi,
        "sukunimi": result.sukunimi, "email": result.email}];

    const savePerson = new connection.pgp.helpers.ColumnSet(personColumns, {table: "person"});
    const personPromise = connection.pgp.helpers.insert(personValues, savePerson) + " RETURNING id";

    // db.any("BEGIN");
    // TODO: Add transaction

    const personId = await connection.db.one(personPromise);


    // TODO: refactor alyksikko insert

    const organizationValues = [{"personid": personId.id, "organisaatiotunniste": result.organisaatio, "alayksikko": result.alayksikko1}];
    const saveOrganization = new connection.pgp.helpers.ColumnSet(organizationColumns, {table: "person_organization"});
    const organizationPromise = connection.pgp.helpers.insert(organizationValues, saveOrganization) + " RETURNING id";

    const organizationId = await connection.db.one(organizationPromise);

    if (result.alayksikko2) {
        const organizationValues2 = [{"personid": personId.id, "organisaatiotunniste": result.organisaatio, "alayksikko": result.alayksikko2}];
        const organizationPromise2 = connection.pgp.helpers.insert(organizationValues2, saveOrganization) + " RETURNING id";
        const organizationId2 = await connection.db.one(organizationPromise2);
    }

    if (result.alayksikko3) {
        const organizationValues3 = [{"personid": personId.id, "organisaatiotunniste": result.organisaatio, "alayksikko": result.alayksikko3}];
        const organizationPromise3 = connection.pgp.helpers.insert(organizationValues3, saveOrganization) + " RETURNING id";
        const organizationId3 = await connection.db.one(organizationPromise3);
    }

    const identifierValues = [{"personid": personId.id, "tunnistetyyppi": "orcid", "tunniste": result.orcid }];
    const saveIdentifier = new connection.pgp.helpers.ColumnSet(identifierColumns, {table: "person_identifier"});
    const identifierPromise = connection.pgp.helpers.insert(identifierValues, saveIdentifier) + " RETURNING id";

    const identifierId = await connection.db.one(identifierPromise);

}



