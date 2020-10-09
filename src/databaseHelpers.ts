
const julkaisu = [
    "organisaatiotunnus",
    "julkaisutyyppi",
    "julkaisuvuosi",
    "julkaisunnimi",
    "tekijat",
    "julkaisuntekijoidenlukumaara",
    "konferenssinvakiintunutnimi",
    "emojulkaisunnimi",
    "emojulkaisuntoimittajat",
    "lehdenjulkaisusarjannimi",
    "volyymi",
    "numero",
    "sivut",
    "artikkelinumero",
    "kustantaja",
    "julkaisunkustannuspaikka",
    "julkaisunkieli",
    "julkaisunkansainvalisyys",
    "julkaisumaa",
    "kansainvalinenyhteisjulkaisu",
    "yhteisjulkaisuyrityksenkanssa",
    "doitunniste",
    "pysyvaverkkoosoite",
    "julkaisurinnakkaistallennettu",
    "avoinsaatavuus",
    "rinnakkaistallennetunversionverkkoosoite",
    "lisatieto",
    "jufotunnus",
    "jufoluokitus",
    "julkaisuntila",
    "username",
    "modified"
];

const julkaisuListFields = [
    "organisaatiotunnus",
    "julkaisuvuosi",
    "julkaisunnimi",
    "tekijat",
    "julkaisuntila",
    "username",
    "modified"
];

const julkaisuarkisto = [
      "julkaisuid",
      "filename",
      "embargo",
      "mimetype",
      "urn",
      "abstract",
      "versio",
      "oikeudet",
      "julkaisusarja",
      "destination"
];

const julkaisuarkistoUpdateFields = [
    "embargo",
    "abstract",
    "versio",
    "oikeudet",
    "julkaisusarja"
];

const theseusJulkaisuFields = [
    "organisaatiotunnus",
    "julkaisutyyppi",
    "julkaisuvuosi",
    "julkaisunnimi",
    "tekijat",
    "konferenssinvakiintunutnimi",
    "emojulkaisunnimi",
    "emojulkaisuntoimittajat",
    "lehdenjulkaisusarjannimi",
    "volyymi",
    "numero",
    "sivut",
    "artikkelinumero",
    "kustantaja",
    "julkaisunkieli",
    "doitunniste",
    "julkaisurinnakkaistallennettu",
    "rinnakkaistallennetunversionverkkoosoite",
    "yhteisjulkaisuyrityksenkanssa",
    "kansainvalinenyhteisjulkaisu",
    "avoinsaatavuus",
    "pysyvaverkkoosoite"
];

const personFields = ["tunniste", "sukunimi", "etunimi", "email"];


const organisasaatiotekija = ["julkaisuid", "etunimet", "sukunimi", "orcid", "hrnumero", "rooli"];
const tieteenala = ["julkaisuid", "tieteenalakoodi", "jnro"];
const taiteenala = ["julkaisuid", "taiteenalakoodi", "jnro"];

const kaytto_loki = ["name", "mail", "uid", "julkaisu", "organization", "role", "itable", "action", "data"];

let addJulkaisuIdToObject = function(obj: any, jid: any) {
    Object.keys(obj).forEach(function (key) {
        obj[key].julkaisuid = JSON.parse(jid);
    });
    return obj;
};

let constructObject = function(obj: any, jid: any, value: any) {
    const finalObject: any = [];
    for (let i = 0; i < obj.length; i++) {
        if (typeof finalObject[i] === "undefined") {
            finalObject[i] = {};
        }
        finalObject[i].julkaisuid =  jid;
        finalObject[i][value] = obj[i];
    }
    return finalObject;
};

let fields = function (prefix: any, theseus?: boolean) {
    if (!prefix) prefix = "julkaisu";
    if (!theseus) {
        return prefix + "." + julkaisu.join("," + prefix + ".");

    } else {
        return prefix + "." + theseusJulkaisuFields.join("," + prefix + ".");
    }
};

let minFields = function (prefix: any) {
    if (!prefix) prefix = "julkaisu";
    return prefix + "." + julkaisuListFields.join("," + prefix + ".");
};

module.exports = {
    julkaisu: julkaisu,
    julkaisuListFields: julkaisuListFields,
    julkaisuarkisto: julkaisuarkisto,
    julkaisuarkistoUpdateFields: julkaisuarkistoUpdateFields,
    organisaatiotekija: organisasaatiotekija,
    tieteenala: tieteenala,
    taiteenala: taiteenala,
    kaytto_loki: kaytto_loki,
    theseusJulkaisuFields: theseusJulkaisuFields,
    personFields: personFields,
    addJulkaisuIdToObject: addJulkaisuIdToObject,
    constructObject: constructObject,
    getTableFields: fields,
    getListFields: minFields


};