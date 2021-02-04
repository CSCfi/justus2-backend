import { PersonObject } from "../models/Person";
import { auditLog } from "../services/auditLogService";
// Database connection from db.ts
const connection = require("./../db");

class PersonTableQueries {

    async savePersonData(person: PersonObject, organization: string) {

        const tunniste = person.tunniste;

        const personParams = {"tunniste": tunniste, "organization": organization};

        const query = "SELECT DISTINCT p.id FROM person p " +
            "INNER JOIN person_organization o " +
            "ON o.personid = p.id " +
            "WHERE o.organisaatiotunniste = ${organization} " +
            "AND p.tunniste = ${tunniste};";

        const data = await connection.db.oneOrNone(query, personParams);

        // no data in person table; insert new record
        if (!data) {

            await this.insertNewPerson(person, organization);

        } else {

            // TODO: add try catch

            const personid = data.id;

            const updatePersonObj = {
                "etunimi": person.etunimi,
                "sukunimi": person.sukunimi,
                "email": person.email,
                "modified": new Date()
            };

            // update data in person table
            await this.updatePerson(personid, updatePersonObj, organization);

            // delete previous organisational units
            await this.deleteOrganizationData(personid, organization);

            // insert organisational units
            await this.insertOrganisaatioTekija(personid, person, organization);

            if (!person.orcid || person.orcid === "") {
                console.log("ei orcid tietoa");
                return;

            } else {
                const identifierId = await this.checkIfPersonHasOrcid(personid);

                if (identifierId) {
                    // if identifier id exists, update orcid
                    const orcidData = await this.checkIfOrcidExists(organization, person.orcid, personid);
                    if (orcidData) {
                        throw new Error("Error in orcid field, orcid is already in use in this organization.");
                    }
                    await this.updateOrcid(personid, person.orcid, organization);
                } else {
                    // otherwise insert new record
                    const orcidData = await this.checkIfOrcidExists(organization, person.orcid);
                    if (orcidData) {
                        throw new Error("Error in orcid field, orcid is already in use in this organization.");
                    }
                    await this.insertOrcid(personid, person.orcid, organization);

                }

            }

        }

    }

    async updatePerson(personid: number, updatePersonObj: any, organization: string) {

        const personColumns = [
            "etunimi",
            "sukunimi",
            "email",
            "modified"
        ];

        const personIdParams = {"personid": personid};

        const personTable = new connection.pgp.helpers.ColumnSet(personColumns, {table: "person"});
        const updatePersonQuery = connection.pgp.helpers.update(updatePersonObj, personTable) + " WHERE id = " + "${personid}" + " RETURNING id;";
        await connection.db.one(updatePersonQuery, personIdParams);

        await auditLog.postPersonTableAuditData(personid, organization, "PUT", "person", updatePersonObj);

    }

    async checkIfPersonHasOrcid(personid: number) {
        const personIdParams = {"personid": personid};

        const orcidQuery = "SELECT id FROM person_identifier WHERE personid = " +
            "${personid} AND tunnistetyyppi = 'orcid';";

        return await connection.db.oneOrNone(orcidQuery, personIdParams);
    }

    async updateOrcid(personid: number, orcid: string, organization: string) {
        const personIdParams = {"personid": personid};

        const updatIdentifierObj = {"tunniste": orcid, "modified": new Date()};
        const identifierTable = new connection.pgp.helpers.ColumnSet(["tunniste", "modified"], {table: "person_identifier"});
        const updateIdentifierQuery = connection.pgp.helpers.update(updatIdentifierObj, identifierTable) +
            " WHERE personid = " + "${personid}" + " AND tunnistetyyppi = 'orcid' RETURNING id;";

        await auditLog.postPersonTableAuditData(personid, organization, "PUT", "person_identifier", updatIdentifierObj);
        await connection.db.one(updateIdentifierQuery, personIdParams);
    }

    async insertNewPerson(person: any, organization: string) {

        const personColumns = [
            "etunimi",
            "sukunimi",
            "email",
            "tunniste"
        ];

        const personValues = [{
            "tunniste": person.tunniste, "etunimi": person.etunimi,
            "sukunimi": person.sukunimi, "email": person.email
        }];

        const savePerson = new connection.pgp.helpers.ColumnSet(personColumns, {table: "person"});
        const personPromise = connection.pgp.helpers.insert(personValues, savePerson) + " RETURNING id";

        // insert data to person table
        const personId = await connection.db.one(personPromise);

        await auditLog.postPersonTableAuditData(personId.id, organization, "POST", "person", personValues);

        // insert data to person_organization table
        await this.insertOrganisaatioTekija(personId.id, person, organization);

        // insert data to person_identifier table (save orcid only if data exists)
        if (person.orcid && person.orcid !== "") {
            const orcidData = await this.checkIfOrcidExists(organization, person.orcid);
            if (orcidData) {
                throw new Error("Error in orcid field, orcid is already in use in this organization.");
            }

            await this.insertOrcid(personId.id, person.orcid, organization);
        }
    }

    async insertOrganisaatioTekija(personid: number, alayksikkoData: any, organization: string) {

        const organizationColumns = [
            "personid",
            "organisaatiotunniste",
            "alayksikko"
        ];
        const kayttoLokiData = [];

        const organizationValues = [{
            "personid": personid,
            "organisaatiotunniste": organization,
            "alayksikko": alayksikkoData.alayksikko1
        }];
        const saveOrganization = new connection.pgp.helpers.ColumnSet(organizationColumns, {table: "person_organization"});
        const organizationPromise = connection.pgp.helpers.insert(organizationValues, saveOrganization) + " RETURNING id";

        await connection.db.one(organizationPromise);
        kayttoLokiData.push(organizationValues[0]);

        if (alayksikkoData.alayksikko2) {
            const organizationValues2 = [{
                "personid": personid,
                "organisaatiotunniste": organization,
                "alayksikko": alayksikkoData.alayksikko2
            }];
            const organizationPromise2 = connection.pgp.helpers.insert(organizationValues2, saveOrganization) + " RETURNING id";
            await connection.db.one(organizationPromise2);
            kayttoLokiData.push(organizationValues2[0]);
        }

        if (alayksikkoData.alayksikko3) {
            const organizationValues3 = [{
                "personid": personid,
                "organisaatiotunniste": organization,
                "alayksikko": alayksikkoData.alayksikko3
            }];
            const organizationPromise3 = connection.pgp.helpers.insert(organizationValues3, saveOrganization) + " RETURNING id";
            await connection.db.one(organizationPromise3);
            kayttoLokiData.push(organizationValues3[0]);
        }

        await auditLog.postPersonTableAuditData(personid, organization, "POST", "person_organization", kayttoLokiData);
    }

    async deleteOrganizationData(personid: number, organization: string) {

        const personIdParams = {"personid": personid};

        await connection.db.result("DELETE FROM person_organization WHERE personid = ${personid}", personIdParams);
        await auditLog.postPersonTableAuditData(personid, organization, "DELETE", "person_organization", undefined);
    }

    async insertOrcid(personID: number, orcid: string, organization: string) {

        const identifierColumns = [
            "personid",
            "tunnistetyyppi",
            "tunniste"
        ];

        const identifierValues = [{"personid": personID, "tunnistetyyppi": "orcid", "tunniste": orcid}];
        const saveIdentifier = new connection.pgp.helpers.ColumnSet(identifierColumns, {table: "person_identifier"});
        const identifierPromise = connection.pgp.helpers.insert(identifierValues, saveIdentifier) + " RETURNING id";

        await auditLog.postPersonTableAuditData(personID, organization, "POST", "person_identifier", identifierValues);
        await connection.db.one(identifierPromise);
    }

    async deleteIdentifierData(personid: number, tyyppi: string, organization: string) {
        console.log("Deleting orcid for person " + personid);
        const orcidParams = { "tunnistetyyppi": tyyppi, "personid": personid };
        await connection.db.result("DELETE FROM person_identifier WHERE tunnistetyyppi = ${tunnistetyyppi} AND personid = ${personid}", orcidParams);
        await auditLog.postPersonTableAuditData(personid, organization, "DELETE", "person_identifier", undefined);

    }

    async checkIfPersonExists(organization: string, tunniste: string) {
        const params = {"organization": organization, "tunniste": tunniste};

        const tunnisteQuery = "SELECT p.id, p.tunniste FROM person p INNER JOIN person_organization o ON p.id = o.personid" +
            " WHERE p.tunniste = ${tunniste} AND o.organisaatiotunniste = ${organization};";

        return await connection.db.oneOrNone(tunnisteQuery, params);
    }

    async checkIfOrcidExists(organization: string, orcid: string, personid?: string) {
        let params;

        const baseQuery =
            "SELECT DISTINCT 1 FROM person_identifier i INNER JOIN person_organization o ON i.personid = o.personid" +
            " WHERE i.tunnistetyyppi = ${tunnistetyyppi} AND i.tunniste = ${tunniste} AND o.organisaatiotunniste = ${organization}";

        let orcidQuery;

        if (personid) {
            params = {"tunnistetyyppi": "orcid", "tunniste": orcid, "organization": organization, "personid": personid};
            orcidQuery = baseQuery + " AND i.personid != ${personid};";

        } else {
            params = {"tunnistetyyppi": "orcid", "tunniste": orcid, "organization": organization};
            orcidQuery = baseQuery + ";";
        }

        return await connection.db.oneOrNone(orcidQuery, params);
    }

}

export const personQueries = new PersonTableQueries();