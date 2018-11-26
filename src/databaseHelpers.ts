
const julkaisu = [
    "organisaatiotunnus",
    "julkaisutyyppi",
    "julkaisuvuosi",
    "julkaisunnimi",
    "tekijat",
    "julkaisuntekijoidenlukumaara",
    "konferenssinvakiintunutnimi",
    "emojulkaisunnimi",
    "isbn",
    "emojulkaisuntoimittajat",
    "lehdenjulkaisusarjannimi",
    "issn",
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
    "modified"];

const organisasaatiotekija = ["julkaisuid", "etunimet", "sukunimi", "orcid", "rooli"];
const tieteenala = ["julkaisuid", "tieteenalakoodi", "jnro"];
const taiteenala = ["julkaisuid", "taiteenalakoodi", "jnro"];

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

let fields = function (prefix: any) {
    if (!prefix) prefix = "julkaisu";
    return prefix + "." + julkaisu.join("," + prefix + ".");
};


module.exports = {
    julkaisu: julkaisu,
    organisaatiotekija: organisasaatiotekija,
    tieteenala: tieteenala,
    taiteenala: taiteenala,
    addJulkaisuIdToObject: addJulkaisuIdToObject,
    constructObject: constructObject,
    getTableFields: fields


};