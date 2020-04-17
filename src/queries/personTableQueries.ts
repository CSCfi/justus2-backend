export {};
// Database connection from db.ts
const connection = require("./../db");

async function savePersonData(person: PersonObject, organization: string) {

    // TODO: return error if organization does not match current user's organization

    const personColumns = [
        "etunimi",
        "sukunimi",
        "email"
    ];

    // first check if hrnumero in guestion exists on database
    const hrnumero = person.hrnumero;

    if (!hrnumero || hrnumero === "") {
        return;
    }

    const personParams = {"hrnumero": hrnumero, "organization": organization};

    const query = "SELECT DISTINCT p.id FROM person p " +
        "INNER JOIN person_organization o " +
        "ON o.personid = p.id " +
        "WHERE o.organisaatiotunniste = ${organization} " +
        "AND p.hrnumero = ${hrnumero};";

    const data = await connection.db.oneOrNone(query, personParams);

    // TODO: Validation: Required fields: hrnumero, etunimi, sukunimi, alayksikko1 (for specific organizations), validate also alayksikko format

    // no data in person table; insert new record
    if (!data) {

        await insertNewPerson(person, organization);

    } else {

        const personid = data.id;
        const personIdParams = {"personid": personid};

        personColumns.push("modified");
        const updatePersonObj = {
            "etunimi": person.etunimi,
            "sukunimi": person.sukunimi,
            "email": person.email,
            "modified": new Date()
        };
        const personTable = new connection.pgp.helpers.ColumnSet(personColumns, {table: "person"});
        const updatePersonQuery = connection.pgp.helpers.update(updatePersonObj, personTable) + " WHERE id = " + "${personid}" + " RETURNING id;";
        await connection.db.one(updatePersonQuery, personIdParams);

        // first delete previous records
        await connection.db.result("DELETE FROM person_organization WHERE personid = ${personid}", personIdParams);

        // insert new data, create separate function of organization insert
        await insertOrganisaatioTekija(personid, person, organization);

        if (!person.orcid || person.orcid === "") {
            return;
        } else {
            //    update or insert
            const identifierId = checkIfOrcidExists(personid);

            if (identifierId) {
                // update orcid
                await updateOrcid(personid, person.orcid);
            } else {
                // insert new record
                await insertOrcid(personid, person.orcid);

            }

        }

    }

}

async function checkIfOrcidExists(personid: number) {
    const personIdParams = {"personid": personid};


    const orcidQuery = "SELECT id FROM person_identifier WHERE personid = " +
        "${personid} AND tunnistetyyppi = 'orcid';";

    return await connection.db.oneOrNone(orcidQuery, personIdParams);
}

async function updateOrcid(personid: number, orcid: string) {
    const personIdParams = {"personid": personid};

    const updatIdentifierObj = {"tunniste": orcid, "modified": new Date()};
    const identifierTable = new connection.pgp.helpers.ColumnSet(["tunniste", "modified"], {table: "person_identifier"});
    const updateIdentifierQuery = connection.pgp.helpers.update(updatIdentifierObj, identifierTable) +
        " WHERE personid = " + "${personid}" + " AND tunnistetyyppi = 'orcid' RETURNING id;";

    await connection.db.one(updateIdentifierQuery, personIdParams);
}

async function insertNewPerson(person: PersonObject, organization: string) {

    const personColumns = [
        "etunimi",
        "sukunimi",
        "email",
        "hrnumero"
    ];

    const personValues = [{"hrnumero": person.hrnumero, "etunimi": person.etunimi,
        "sukunimi": person.sukunimi, "email": person.email}];

    const savePerson = new connection.pgp.helpers.ColumnSet(personColumns, {table: "person"});
    const personPromise = connection.pgp.helpers.insert(personValues, savePerson) + " RETURNING id";

    // insert data to person table
    const personId = await connection.db.one(personPromise);

    // insert data to person_organization table
    await insertOrganisaatioTekija(personId.id, person, organization);

    // insert data to person_identifier table (save orcid only if data exists)
    if (person.orcid && person.orcid !== "") {
        await insertOrcid(personId.id, person.orcid);
    }
}

async function insertOrganisaatioTekija(personid: number, person: PersonObject, organization: string) {

    console.log("in insert organisaatiotekija");

    const organizationColumns = [
        "personid",
        "organisaatiotunniste",
        "alayksikko"
    ];

    const organizationValues = [{"personid": personid, "organisaatiotunniste": organization, "alayksikko": person.alayksikko1}];
    const saveOrganization = new connection.pgp.helpers.ColumnSet(organizationColumns, {table: "person_organization"});
    const organizationPromise = connection.pgp.helpers.insert(organizationValues, saveOrganization) + " RETURNING id";

    await connection.db.one(organizationPromise);

    if (person.alayksikko2) {
        const organizationValues2 = [{"personid": personid, "organisaatiotunniste": organization, "alayksikko": person.alayksikko2}];
        const organizationPromise2 = connection.pgp.helpers.insert(organizationValues2, saveOrganization) + " RETURNING id";
        await connection.db.one(organizationPromise2);
    }

    if (person.alayksikko3) {
        const organizationValues3 = [{"personid": personid, "organisaatiotunniste": organization, "alayksikko": person.alayksikko3}];
        const organizationPromise3 = connection.pgp.helpers.insert(organizationValues3, saveOrganization) + " RETURNING id";
        await connection.db.one(organizationPromise3);
    }
}

async function insertOrcid(personID: number, orcid: string) {

    const identifierColumns = [
        "personid",
        "tunnistetyyppi",
        "tunniste"
    ];

    const identifierValues = [{"personid": personID, "tunnistetyyppi": "orcid", "tunniste": orcid }];
    const saveIdentifier = new connection.pgp.helpers.ColumnSet(identifierColumns, {table: "person_identifier"});
    const identifierPromise = connection.pgp.helpers.insert(identifierValues, saveIdentifier) + " RETURNING id";

    await connection.db.one(identifierPromise);
}

module.exports = {
    savePersonData: savePersonData,
    insertNewPerson: insertNewPerson,
    insertOrganisaatioTekija: insertOrganisaatioTekija,
    updateOrcid: updateOrcid,
    insertOrcid: insertOrcid,
    checkIfOrcidExists: checkIfOrcidExists
};
