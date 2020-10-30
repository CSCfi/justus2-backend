const organizationContacts = require("./../organization_contacts");
const domainMappings = organizationContacts.domainMappings;

const commonVisibleFields = [
    "etunimet",
    "sukunimi",
    "julkaisutyyppi",
    "julkaisuvuosi",
    "julkaisuvuodenlisatieto",
    "julkaisunnimi",
    "tekijat",
    "julkaisuntekijoidenlukumaara",
    "organisaatiotekija",
    "orcid",
    "konferenssinvakiintunutnimi",
    "isbn",
    "issn",
    "volyymi",
    "numero",
    "lehdenjulkaisusarjannimi",
    "kustantaja",
    "julkaisunkansainvalisyys",
    "tieteenala",
    "taiteenala",
    "taidealantyyppikategoria",
    "kansainvalinenyhteisjulkaisu",
    "yhteisjulkaisuyrityksenkanssa",
    "avoinsaatavuus",
    "emojulkaisunnimi",
    "emojulkaisuntoimittajat",
    "sivut",
    "artikkelinumero",
    "julkaisunkustannuspaikka",
    "avainsanat",
    "julkaisumaa",
    "julkistamispaikkakunta",
    "tapahtumanlisatieto",
    "julkaisunkieli",
    "doitunniste",
    "muutunniste",
    "pysyvaverkkoosoite",
    "tekijanrooli",
    "lisatieto"
];
const commonRequiredFields = [
    "etunimet",
    "sukunimi",
    "julkaisutyyppi",
    "julkaisuvuosi",
    "julkaisunnimi",
    "tekijat",
    "julkaisuntekijoidenlukumaara",
    "organisaatiotekija",
    "konferenssinvakiintunutnimi",
    "isbn",
    "issn",
    "lehdenjulkaisusarjannimi",
    "kustantaja",
    "julkaisunkansainvalisyys",
    "tieteenala",
    "tieteenalakoodi",
    "taiteenala",
    "taiteenalakoodi",
    "kansainvalinenyhteisjulkaisu",
    "yhteisjulkaisuyrityksenkanssa",
    "avoinsaatavuus",
    "rinnakkaistallennetunversionverkkoosoite"
];

function getOrganisationCodes() {

    const organisationCodes: any = [];

    for (let i = 0; i < domainMappings.length; i++ ) {
        organisationCodes.push(domainMappings[i].code);
    }

    // remove duplicates
    function filter(list: any) {
        return Array.from(new Set(list));
    }
    return  filter(organisationCodes);

}


module.exports = {
    domainMappings: domainMappings,
    commonVisibleFields: commonVisibleFields,
    commonRequiredFields: commonRequiredFields,
    getOrganisationCodes: getOrganisationCodes
};
