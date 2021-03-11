import { IncomingHttpHeaders } from "http";
import { Person } from "../types/Person";
import { auditLog } from "../services/auditLogService";

// Database connection from db.ts
const connection = require("./../db");
const dbFields = require("../types/DatabaseFields");

class PersonQueries {

    savePersonData = async (person: Person, organization: string, headers: IncomingHttpHeaders) => {

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


    queryHrData = async (organizationCode: string) => {

        const params = {"organisaatiotunniste": organizationCode};
        const query = "SELECT 1 FROM person_organization WHERE organisaatiotunniste = " +
            "${organisaatiotunniste} FETCH FIRST 1 ROW ONLY;";
        const data = await connection.db.oneOrNone(query, params);
        if (data) {
            return true;
        } else {
            return false;
        }

    }


    queryPersons = async(organization: string) => {

        const params = {"organisaatio": organization};
        let queryParsonsAndOrganizations;
        let persons;

        queryParsonsAndOrganizations = "SELECT p.id, p.tunniste, p.etunimi, p.sukunimi, p.email, p.modified " +
            ", json_agg(o.alayksikko) AS alayksikko " +
            "FROM person p " +
            "INNER JOIN person_organization o ON p.id = o.personid " +
            "WHERE o.organisaatiotunniste = ${organisaatio} " +
            "GROUP BY p.id " +
            "ORDER BY p.modified DESC;";

        persons = await connection.db.any(queryParsonsAndOrganizations, params);
        return persons;

    }

    getRowsToBeDeleted = async (tunnisteList: any, organization: string, onlyIds: boolean) => {

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



    updatePerson = async (personid: number, updatePersonObj: any, headers: IncomingHttpHeaders) => {

        const personColumns = [...dbFields.personFields];
        personColumns.push("modified");

        const personIdParams = {"personid": personid};

        const personTable = new connection.pgp.helpers.ColumnSet(personColumns, {table: "person"});
        const updatePersonQuery = connection.pgp.helpers.update(updatePersonObj, personTable) + " WHERE id = " + "${personid}" + " RETURNING id;";
        await connection.db.one(updatePersonQuery, personIdParams);

        await auditLog.postPersonTableAuditData(headers, personid, "PUT", "person", updatePersonObj);

    }


    updateOrcid = async (personid: number, orcid: string, headers: IncomingHttpHeaders) => {
        const personIdParams = {"personid": personid};

        const updatIdentifierObj = {"tunniste": orcid, "modified": new Date()};
        const identifierTable = new connection.pgp.helpers.ColumnSet(["tunniste", "modified"], {table: "person_identifier"});
        const updateIdentifierQuery = connection.pgp.helpers.update(updatIdentifierObj, identifierTable) +
            " WHERE personid = " + "${personid}" + " AND tunnistetyyppi = 'orcid' RETURNING id;";

        await connection.db.one(updateIdentifierQuery, personIdParams);

        const auditLogData = {"tunnistetyyppi": "orcid", "tunniste": orcid, "modified": new Date()};
        await auditLog.postPersonTableAuditData(headers, personid, "PUT", "person_identifier", auditLogData);

    }

    insertPerson = async (person: any, organization: string, headers: IncomingHttpHeaders) => {

        const personColumns = [...dbFields.personFields];
        personColumns.push("tunniste");

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

    insertOrganisaatioTekija = async (personid: number, alayksikkoData: any, organization: string, headers: IncomingHttpHeaders) => {

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

    insertOrcid = async (personID: number, orcid: string, headers: IncomingHttpHeaders) => {

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

    deletePerson = async (personid: number, headers: IncomingHttpHeaders) => {
        const params = {"personid": personid};
        await connection.db.result("DELETE FROM person WHERE id = ${personid}", params);
        await auditLog.postPersonTableAuditData(headers, personid, "DELETE", "person", undefined);
    }

    deleteOrganizationData = async (personid: number, headers: IncomingHttpHeaders) => {
        const personIdParams = {"personid": personid};
        await connection.db.result("DELETE FROM person_organization WHERE personid = ${personid}", personIdParams);
        await auditLog.postPersonTableAuditData(headers, personid, "DELETE", "person_organization", undefined);
    }

    deleteIdentifierData = async (personid: number, tyyppi: string, headers: IncomingHttpHeaders) => {
        const orcidParams = { "tunnistetyyppi": tyyppi, "personid": personid };
        await connection.db.result("DELETE FROM person_identifier WHERE tunnistetyyppi = ${tunnistetyyppi} AND personid = ${personid}", orcidParams);
        await auditLog.postPersonTableAuditData(headers, personid, "DELETE", "person_identifier", undefined);

    }

    checkIfPersonExists = async (organization: string, tunniste: string) => {
        const params = {"organization": organization, "tunniste": tunniste};

        const tunnisteQuery = "SELECT p.id, p.tunniste FROM person p INNER JOIN person_organization o ON p.id = o.personid" +
            " WHERE p.tunniste = ${tunniste} AND o.organisaatiotunniste = ${organization};";

        return await connection.db.oneOrNone(tunnisteQuery, params);
    }

    getOrcidData = async (id: number) => {
        const params = {"id": id};
        const query = "SELECT tunniste FROM person_identifier WHERE tunnistetyyppi = 'orcid'" +
            " and personid = ${id};";
        const result = await connection.db.oneOrNone(query, params);

        if (!result) {
            return result;
        } else {
            return result.tunniste;
        }
    }

    checkIfPersonHasOrcid = async (personid: number) => {
        const personIdParams = {"personid": personid};

        const orcidQuery = "SELECT id FROM person_identifier WHERE personid = " +
            "${personid} AND tunnistetyyppi = 'orcid';";

        return await connection.db.oneOrNone(orcidQuery, personIdParams);
    }


    checkIfOrcidExists = async (organization: string, orcid: string, personid?: string) => {
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

export const personQueries = new PersonQueries();