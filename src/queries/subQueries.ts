const oh = require("./../objecthandlers");

// Database connection from db.ts
const con = require("./../db");

async function getIssn(julkaisuid: any) {
    const query = "SELECT issn FROM julkaisu_issn WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await con.db.any(query);
    if (result.length < 1) {
        return [""];
    } else {
        result = oh.mapIssnAndIsbn("issn", result);
        console.log(result);
        return result;
    }
}

async function getIsbn(julkaisuid: any) {
    const query = "SELECT isbn FROM julkaisu_isbn WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await con.db.any(query);
    if (result.length < 1) {
        return [""];
    } else {
        result = oh.mapIssnAndIsbn("isbn", result);
        return result;
    }
}

async function getOrganisaatiotekija(julkaisuid: any) {
    let result = await getOrgTekijatAndAlayksikko(julkaisuid);
    result = oh.mapOrganisaatiotekijaAndAlayksikko(result);
    return result;
}

async function getTieteenala(julkaisuid: any) {
    const query =  "SELECT jnro, tieteenalakoodi  FROM tieteenala WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await con.db.any(query);
    result = oh.checkIfEmpty(result);
    return result;
}

async function getTaiteenala(julkaisuid: any) {
    const query =  "SELECT jnro, taiteenalakoodi  FROM taiteenala WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await con.db.any(query);
    result = oh.checkIfEmpty(result);
    return result;
}

async function getTyyppikategoria(julkaisuid: any) {
    const query =  "SELECT tyyppikategoria FROM taidealantyyppikategoria WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await con.db.any(query);
    result = oh.mapTaideAlanTyyppikategoria(result);
    return result;
}

async function getAvainsana(julkaisuid: any) {
    const query =  "SELECT avainsana FROM avainsana WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await con.db.any(query);
    result = oh.mapAvainsanat(result);
    return result;
}

async function getLisatieto(julkaisuid: any) {
    const query = "SELECT lisatietotyyppi, lisatietoteksti FROM lisatieto WHERE julkaisuid =  " + julkaisuid + ";";
    let result = await con.db.any(query);
    result = oh.mapLisatietoData(result);
    return result;
}

function getOrgTekijatAndAlayksikko(id: any) {
    return con.db.task((t: any) => {
        return t.map("SELECT id, etunimet, sukunimi, orcid, rooli FROM organisaatiotekija WHERE julkaisuid=$1", id, (orgtekija: any) => {
            return t.any("SELECT alayksikko FROM alayksikko WHERE organisaatiotekijaid=$1", orgtekija.id)
                .then((res: any) => {
                    orgtekija.tempalayksikko = res;
                    return orgtekija;
                });
        }).then(t.batch);
    });

}
module.exports = {
    getIsbn: getIsbn,
    getIssn: getIssn,
    getAvainsana: getAvainsana,
    getOrganisaatiotekija: getOrganisaatiotekija,
    getTieteenala: getTieteenala,
    getTaiteenala: getTaiteenala,
    getTyyppikategoria: getTyyppikategoria,
    getLisatieto: getLisatieto








};
