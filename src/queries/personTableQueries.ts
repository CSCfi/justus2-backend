import { IncomingHttpHeaders } from "http";
import { PersonObject } from "../models/Person";
import { auditLog } from "../services/auditLogService";
// Database connection from db.ts
const connection = require("./../db");

class PersonTableQueries {

    async savePersonData(person: PersonObject, organization: string, headers: IncomingHttpHeaders) {

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

            const personid = await this.insertPerson(person, organization, headers);

            // insert data to person_organization table
            await this.insertOrganisaatioTekija(personid, person, organization, headers);

            // insert data to person_identifier table (save orcid only if data exists)
            if (person.orcid && person.orcid !== "") {
                const orcidData = await this.checkIfOrcidExists(organization, person.orcid);
                if (orcidData) {
                    throw new Error("Error in orcid field, orcid is already in use in this organization.");
                }

                await this.insertOrcid(personid, person.orcid, headers);
            }

        } else {

            const personid = data.id;

            const updatePersonObj = {
                "etunimi": person.etunimi,
                "sukunimi": person.sukunimi,
                "email": person.email,
                "modified": new Date()
            };

            // update data in person table
            await this.updatePerson(personid, updatePersonObj, headers);

            // delete previous organisational units
            await this.deleteOrganizationData(personid, headers);

            // insert organisational units
            await this.insertOrganisaatioTekija(personid, person, organization, headers);

            if (!person.orcid || person.orcid === "") {
                return;

            } else {
                const identifierId = await this.checkIfPersonHasOrcid(personid);

                if (identifierId) {
                    // if identifier id exists, update orcid
                    const orcidData = await this.checkIfOrcidExists(organization, person.orcid, personid);
                    if (orcidData) {
                        throw new Error("Error in orcid field, orcid is already in use in this organization.");
                    }
                    await this.updateOrcid(personid, person.orcid, headers);
                } else {
                    // otherwise insert new record
                    const orcidData = await this.checkIfOrcidExists(organization, person.orcid);
                    if (orcidData) {
                        throw new Error("Error in orcid field, orcid is already in use in this organization.");
                    }
                    await this.insertOrcid(personid, person.orcid, headers);

                }

            }

        }

    }

    async updatePerson(personid: number, updatePersonObj: any, headers: IncomingHttpHeaders) {

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

        await auditLog.postPersonTableAuditData(headers, personid, "PUT", "person", updatePersonObj);

    }


    async updateOrcid(personid: number, orcid: string, headers: IncomingHttpHeaders) {
        const personIdParams = {"personid": personid};

        const updatIdentifierObj = {"tunniste": orcid, "modified": new Date()};
        const identifierTable = new connection.pgp.helpers.ColumnSet(["tunniste", "modified"], {table: "person_identifier"});
        const updateIdentifierQuery = connection.pgp.helpers.update(updatIdentifierObj, identifierTable) +
            " WHERE personid = " + "${personid}" + " AND tunnistetyyppi = 'orcid' RETURNING id;";

        await connection.db.one(updateIdentifierQuery, personIdParams);
        await auditLog.postPersonTableAuditData(headers, personid, "PUT", "person_identifier", updatIdentifierObj);

    }

    async insertPerson(person: any, organization: string, headers: IncomingHttpHeaders) {
        const personColumns = [
            "etunimi",
            "sukunimi",
            "email",
            "tunniste"
        ];

        const personValues = {
            "tunniste": person.tunniste, "etunimi": person.etunimi,
            "sukunimi": person.sukunimi, "email": person.email
        };

        const savePerson = new connection.pgp.helpers.ColumnSet(personColumns, {table: "person"});
        const personPromise = connection.pgp.helpers.insert(personValues, savePerson) + " RETURNING id";

        // insert data to person table
        const personid = await connection.db.one(personPromise);
        await auditLog.postPersonTableAuditData(headers, personid.id, "POST", "person", personValues);
        return personid.id;
    }

    async insertOrganisaatioTekija(personid: number, alayksikkoData: any, organization: string, headers: IncomingHttpHeaders) {

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

        await auditLog.postPersonTableAuditData(headers, personid, "POST", "person_organization", kayttoLokiData);
    }

    async insertOrcid(personID: number, orcid: string, headers: IncomingHttpHeaders) {

        const identifierColumns = [
            "personid",
            "tunnistetyyppi",
            "tunniste"
        ];

        const identifierValues = [{"personid": personID, "tunnistetyyppi": "orcid", "tunniste": orcid}];
        const saveIdentifier = new connection.pgp.helpers.ColumnSet(identifierColumns, {table: "person_identifier"});
        const identifierPromise = connection.pgp.helpers.insert(identifierValues, saveIdentifier) + " RETURNING id";

        await connection.db.one(identifierPromise);
        await auditLog.postPersonTableAuditData(headers, personID, "POST", "person_identifier", identifierValues);
    }

    async deletePerson(personid: number, headers: IncomingHttpHeaders) {
        const params = {"personid": personid};
        await connection.db.result("DELETE FROM person WHERE id = ${personid}", params);
        await auditLog.postPersonTableAuditData(headers, personid, "DELETE", "person", undefined);
    }

    async deleteOrganizationData(personid: number, headers: IncomingHttpHeaders) {
        const personIdParams = {"personid": personid};
        await connection.db.result("DELETE FROM person_organization WHERE personid = ${personid}", personIdParams);
        await auditLog.postPersonTableAuditData(headers, personid, "DELETE", "person_organization", undefined);
    }

    async deleteIdentifierData(personid: number, tyyppi: string, headers: IncomingHttpHeaders) {
        const orcidParams = { "tunnistetyyppi": tyyppi, "personid": personid };
        await connection.db.result("DELETE FROM person_identifier WHERE tunnistetyyppi = ${tunnistetyyppi} AND personid = ${personid}", orcidParams);
        await auditLog.postPersonTableAuditData(headers, personid, "DELETE", "person_identifier", undefined);

    }

    async checkIfPersonExists(organization: string, tunniste: string) {
        const params = {"organization": organization, "tunniste": tunniste};

        const tunnisteQuery = "SELECT p.id, p.tunniste FROM person p INNER JOIN person_organization o ON p.id = o.personid" +
            " WHERE p.tunniste = ${tunniste} AND o.organisaatiotunniste = ${organization};";

        return await connection.db.oneOrNone(tunnisteQuery, params);
    }

    async checkIfPersonHasOrcid(personid: number) {
        const personIdParams = {"personid": personid};

        const orcidQuery = "SELECT id FROM person_identifier WHERE personid = " +
            "${personid} AND tunnistetyyppi = 'orcid';";

        return await connection.db.oneOrNone(orcidQuery, personIdParams);
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