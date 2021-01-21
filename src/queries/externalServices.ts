import { Request, Response, NextFunction } from "express";

const BASEURLFINTO = process.env.FINTO_URL;
const BASEURLJUFO = process.env.JUFO_URL;
const URN_URL = process.env.URN_URL;
const crossRefUrl = process.env.CROSSREF_URL;
const virtaUrl = process.env.VIRTA_URL;

const jufoSearchUrl = BASEURLJUFO + "/etsi.php?";
const jufoKanavaUrl = BASEURLJUFO + "/kanava";

const request = require("request");
const requestPromise = require("request-promise");

const oh = require("./../objecthandlers");
const utf8 = require("utf8");

import  * as kp  from "./../koodistopalvelu";
import { Keyword, KeywordList } from "../models/Keyword";
import { JufoKanava, JufoList } from "../models/Jufo";

async function getAvainSanat(req: Request, res: Response, next: NextFunction) {

    const lang = req.query.lang.toString().toLowerCase();
    const queryString = req.query.q.toString() + "*";
    let keywordArray = Array<Keyword>();
    let keywordList = Array<KeywordList>();

    try {
        const urlParams = {
            "lang": "en",
            "query": queryString
        };
        // always fetch keywords in english
        const promiseEn = await kp.httpBaseGet(BASEURLFINTO, urlParams);
        keywordArray = promiseEn.results;

        // if language is not english, fetch also session language results
        if (lang !== "en") {
            urlParams.lang = lang;
            const promise = await kp.httpBaseGet(BASEURLFINTO, urlParams);
            keywordArray = keywordArray.concat(promise.results);
        }
        if (keywordArray.length) {
            keywordList = oh.ObjectHandlerAvainsanat(keywordArray);
        }
        res.status(200).send(keywordList);
    } catch (e) {
        console.log("Error in keyword search:");
        console.log(e);
        res.sendStatus(500);
    }
}

async function getJulkaisuSarjat(req: Request, res: Response, next: NextFunction) {
    const queryString = req.query.q.toString();
    let jufoData = Array<JufoList>();
    let journalList = Array<JufoList>();
    const urlParams = {
        "tyyppi": 1,
        "nimi": queryString
    };
    try {
        jufoData = await kp.httpBaseGet(jufoSearchUrl, urlParams);
        if (jufoData.length) {
            journalList = oh.ObjectHandlerJulkaisusarjat(jufoData, queryString);
        } else {
            journalList = [];
        }
        res.status(200).send(journalList);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }

}
async function getKustantajat(req: Request, res: Response, next: NextFunction) {
    const queryString = req.query.q.toString();
    let jufoData = Array<JufoList>();
    let publisherList = Array<JufoList>();
    const urlParams = {
        "tyyppi": 2,
        "nimi": queryString
    };
    try {
        jufoData = await kp.httpBaseGet(jufoSearchUrl, urlParams);
        if (jufoData.length) {
            publisherList = oh.ObjectHandlerJufoList(jufoData);
        } else {
            publisherList = [];
        }
        res.status(200).send(publisherList);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
}

async function getKonferenssinimet(req: Request, res: Response, next: NextFunction) {
    const queryString = req.query.q.toString();
    let jufoData = Array<JufoList>();
    let conferenceList = Array<JufoList>();
    const urlParams = {
        "tyyppi": 3,
        "nimi": queryString
    };
    try {
        jufoData = await kp.httpBaseGet(jufoSearchUrl, urlParams);
        if (jufoData.length) {
            conferenceList = oh.ObjectHandlerJufoList(jufoData);
        } else {
            conferenceList = [];
        }
        res.status(200).send(conferenceList);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }
}

async function getJufo(req: Request, res: Response, next: NextFunction) {

    const url: string = jufoKanavaUrl + "/" + req.params.id;

    try {
        const jufoRaw = await kp.httpBaseGet(url);
        // Jufo api returns always array though fetching data with id
        const jufo: JufoKanava = oh.ObjectHandlerJufoID(jufoRaw[0]);
        res.status(200).send(jufo);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }

}
async function getJufotISSN(req: Request, res: Response, next: NextFunction) {
    const issn: string = req.query.issn.toString();
    let jufoData = Array<JufoList>();
    const urlParams = {
        "issn": issn
    };
    try {
        jufoData = await kp.httpBaseGet(jufoSearchUrl, urlParams);
        const journalList: JufoList = oh.ObjectHandlerJufoISSN(jufoData);
        res.status(200).send(journalList);
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
    }

}
function getJulkaisutVirtaCrossrefLista(req: Request, res: Response, next: NextFunction) {

    const julkaisu = req.query.julkaisu.toString();
    const tekija = req.query.tekija.toString();

    if (req.query.julkaisu.length < 5) {
        return;
    }

    let apiUrlCrossRef: string = crossRefUrl + "?query.bibliographic=" + encodeURIComponent(julkaisu);
    let apiUrlVirta: string = virtaUrl + "/haku?julkaisunNimi=" + encodeURIComponent(julkaisu);

    console.log("This is the api url for CrossRef: " + apiUrlCrossRef);
    console.log("This is the api url for VIRTA: " + apiUrlVirta);

    if (tekija && tekija !== "undefined" && tekija !== "") {
        apiUrlCrossRef = apiUrlCrossRef + "&query.author=" + encodeURIComponent(tekija);
        apiUrlVirta = apiUrlVirta + "&henkiloHaku=" + encodeURIComponent(tekija);
    }

    const virtaPromise = requestPromise({
        uri: apiUrlVirta,
        timeout: 1000000,
        json: true
    });

    const crossRefPromise = requestPromise({
        uri: apiUrlCrossRef,
        timeout: 1000000,
        json: true
    });

    const promises = [crossRefPromise, virtaPromise];

    const reflect = (p: any) => p.then((v: any) => ({v, status: "resolved" }),
        (e: any) => ({ e, status: "rejected" }));

    Promise.all(promises.map(reflect)).then(function (results) {

        const obj = {
            "cr": "",
            "virta": ""
        };

        if (results[0].status === "resolved") {
            obj.cr = (results[0].v["message"].items);
        }

        if (results[1].status === "resolved") {
            obj.virta = results[1].v;
        }

        const ret = parseCrAndVirtaData(obj);
        res.status(200).json( ret );

    }).catch(function (err) {
        console.log(err);
    });

}

function getJulkaisuVirtaCrossrefEsitaytto(req: Request, res: Response, next: NextFunction) {

    let url = "";
    let ret = {};

    console.log(req.query.lahde);
    console.log(req.query.id);

    const lahde: string = req.query.lahde.toString();

    if (lahde.toLowerCase() === "crossref") {
        url = crossRefUrl + "/" + req.query.id;
    }
    if (lahde.toLowerCase() === "virta") {
        url =  virtaUrl + "/" + req.query.id;
    }

    request(utf8.encode(url), { json: true }, (error: any, response: any, data: any) => {

        if (error) {
            console.log(error);
            res.sendStatus(500);
        }

        if (response.statusCode !== 200) {
            if (response.statusCode === 404 || response.statusCode === 400) {
                res.sendStatus(404);
            } else {
                res.sendStatus(500);
            }
        } else {
            if (lahde.toLowerCase() === "crossref") {
                ret = parseCrossRefData(data["message"]);
            }
            if (lahde.toLowerCase() === "virta") {
                ret = parseVirtaData(data);
            }
            res.status(200).json( ret );
        }

    });
}

function parseCrAndVirtaData(data: any) {

    const ret: any = [];

    Object.keys(data.cr).forEach(function (value, key) {
        const crObj = {
            "source": "",
            "title": "",
            "author": "",
            "doi": "",
            "identifier": ""
        };
        crObj.source = "CrossRef";
        crObj.title = data.cr[key].title[data.cr[key].title.length - 1];
        crObj.doi = data.cr[key].DOI;
        crObj.identifier = data.cr[key].DOI;

        if (data.cr[key].author) {
            Object.keys(data.cr[key].author).forEach(function (aval, akey) {
                if (crObj.author.length > 0) {
                    crObj.author += "; ";
                }
                crObj.author += data.cr[key].author[akey].family + ", " + data.cr[key].author[akey].given;
            });
        }
        ret.push(crObj);

    });

    Object.keys(data.virta).forEach(function (value, key) {
        const virtaObj = {
            "source": "",
            "title": "",
            "author": "",
            "doi": "",
            "identifier": "",
            "organisation": ""
        };

        virtaObj.source = "VIRTA";
        if (data.virta[key].julkaisunNimi) { virtaObj.title = data.virta[key].julkaisunNimi; }
        if (data.virta[key].tekijat) { virtaObj.author = data.virta[key].tekijat; }
        if (data.virta[key].doi) { virtaObj.doi = data.virta[key].doi; }
        if (data.virta[key].julkaisunTunnus) { virtaObj.identifier = data.virta[key].julkaisunTunnus; }
        if (data.virta[key].organisaatioTunnus) { virtaObj.organisation = data.virta[key].organisaatioTunnus; }

        ret.push(virtaObj);

    });

    return ret;
}

function parseCrossRefData(data: any) {

    const obj: any = {};

    obj["doitunniste"] = data.DOI;
    if (data.title.constructor === Array && data.title.length > 0) {
        obj["julkaisunnimi"] = data.title[0];
    }  else {
        obj["julkaisunnimi"] = data.title;
    }

    obj["issn"] = [];
    if (data.ISSN) {
        if (data.ISSN.constructor === Array ) {
            obj["issn"] = data.ISSN;
        }  else {
            obj["issn"].push(data.ISSN);
        }
    } else {
        obj["issn"] = [""];
    }

    obj["isbn"] = [];
    if (data.ISBN) {
        if (data.ISBN.constructor === Array ) {
            obj["isbn"] = data.ISBN;
        }  else {
            obj["isbn"].push(data.ISBN);
        }
    } else {
        obj["isbn"] = [""];
    }

    if (data["container-title"]) {
        obj["lehdenjulkaisusarjannimi"] = data["container-title"][0];
    }

    obj["volyymi"] = data.volume || "";
    obj["numero"] = data.issue || "";
    obj["sivut"] = data.page || "";
    obj["artikkelinumero"] = data["article-number"] || "";
    obj["kustantaja"] = data["publisher"] || "";

    let tekijat = "";

    if (data.author) {
        Object.keys(data.author).forEach(function (key) {
            if (tekijat.length > 0) tekijat += "; ";
            tekijat += data.author[key].family + ", " + data.author[key].given;
        });

    }

    obj["tekijat"] = tekijat;

    let vuosi;
    if (data.issued) {
        if (data.issued["date-parts"]) {
            vuosi = "" + data.issued["date-parts"];
            obj["julkaisuvuosi"] = parseInt(vuosi.split(",")[0]);
        }
    }

    return obj;
}

function parseVirtaData(data: any) {

    const obj: any = {"julkaisu": { "issn": [], "isbn": []}, "avainsanat": [], "tieteenala": [] };

    obj["julkaisu"]["julkaisutyyppi"] = data["JulkaisutyyppiKoodi"];
    if (data["JulkaisuVuosi"])obj["julkaisu"]["julkaisuvuosi"] = parseInt(data["JulkaisuVuosi"]);
    if (data["JulkaisunNimi"])obj["julkaisu"]["julkaisunnimi"] = data["JulkaisunNimi"];
    if (data["TekijatiedotTeksti"])obj["julkaisu"]["tekijat"] = data["TekijatiedotTeksti"];
    if (data["TekijoidenLkm"])obj["julkaisu"]["julkaisuntekijoidenlukumaara"] = data["TekijoidenLkm"];
    if (data["KonferenssinNimi"])obj["julkaisu"]["konferenssinvakiintunutnimi"] = data["KonferenssinNimi"];
    if (data["EmojulkaisunNimi"])obj["julkaisu"]["emojulkaisunnimi"] = data["EmojulkaisunNimi"];
    if (data["LehdenNimi"])obj["julkaisu"]["lehdenjulkaisusarjannimi"] = data["LehdenNimi"];
    if (data["VolyymiTeksti"])obj["julkaisu"]["volyymi"] = data["VolyymiTeksti"];
    if (data["LehdenNumeroTeksti"])obj["julkaisu"]["numero"] = data["LehdenNumeroTeksti"];
    if (data["SivunumeroTeksti"])obj["julkaisu"]["sivut"] = data["SivunumeroTeksti"];
    if (enableZeroValue(data["Artikkelinumero"])) obj["julkaisu"]["artikkelinumero"] = data["Artikkelinumero"].toString();
    if (data["KustantajanNimi"])obj["julkaisu"]["kustantaja"] = data["KustantajanNimi"];
    if (data["KustannuspaikkaTeksti"])obj["julkaisu"]["julkaisunkustannuspaikka"] = data["KustannuspaikkaTeksti"];
    if (data["JulkaisunKieliKoodi"])obj["julkaisu"]["julkaisunkieli"] = data["JulkaisunKieliKoodi"];
    if (enableZeroValue(data["JulkaisunKansainvalisyysKytkin"])) obj["julkaisu"]["julkaisunkansainvalisyys"] = data["JulkaisunKansainvalisyysKytkin"].toString();
    if (data["JulkaisumaaKoodi"])obj["julkaisu"]["julkaisumaa"] = data["JulkaisumaaKoodi"];
    if (data["JulkaisumaaKoodi"])obj["julkaisu"]["julkaisumaa"] = data["JulkaisumaaKoodi"].toString();
    if (enableZeroValue(data["YhteisjulkaisuKVKytkin"])) obj["julkaisu"]["kansainvalinenyhteisjulkaisu"] = data["YhteisjulkaisuKVKytkin"].toString();
    if (enableZeroValue(data["YhteisjulkaisuYritysKytkin"])) obj["julkaisu"]["yhteisjulkaisuyrityksenkanssa"] = data["YhteisjulkaisuYritysKytkin"].toString();
    if (data["DOI"])obj["julkaisu"]["doitunniste"] = data["DOI"];
    if (data["PysyvaOsoiteTeksti"])obj["julkaisu"]["pysyvaverkkoosoite"] = data["PysyvaOsoiteTeksti"];
    if (enableZeroValue(data["AvoinSaatavuusKoodi"])) obj["julkaisu"]["avoinsaatavuus"] = data["AvoinSaatavuusKoodi"].toString();
    if (enableZeroValue(data["RinnakkaistallennettuKytkin"])) obj["julkaisu"]["julkaisurinnakkaistallennettu"] = data["RinnakkaistallennettuKytkin"].toString();
    if (enableZeroValue(data["JufoTunnus"])) { obj["julkaisu"]["jufotunnus"] = data["JufoTunnus"].toString(); }
    if (enableZeroValue(data["JufoLuokkaKoodi"])) { obj["julkaisu"]["jufoluokitus"] = data["JufoLuokkaKoodi"].toString(); }

    if (data["ISSN"]) {
        if (data["ISSN"].constructor === Array ) {
            obj["julkaisu"]["issn"] = data["ISSN"];
        }  else {
            obj["julkaisu"].issn.push(data["ISSN"]);
        }
    }
    else {
        obj["julkaisu"]["issn"] = [""];
    }

    if (data["ISBN"]) {
        if (data["ISBN"].constructor === Array ) {
            obj["julkaisu"]["isbn"] = data["ISBN"];
        }  else {
            obj["julkaisu"].isbn.push(data["ISBN"]);
        }
    }
    else {
        obj["julkaisu"]["isbn"] = [""];
    }

    if (data["Rinnakkaistallennettu"]) {
        if (data["Rinnakkaistallennettu"]["RinnakkaistallennusOsoiteTeksti"].length > 1) {
            obj["julkaisu"]["rinnakkaistallennetunversionverkkoosoite"] = data["Rinnakkaistallennettu"]["RinnakkaistallennusOsoiteTeksti"][0];
        } else {
            obj["julkaisu"]["rinnakkaistallennetunversionverkkoosoite"] = data["Rinnakkaistallennettu"]["RinnakkaistallennusOsoiteTeksti"];
        }
    }

    if (data["Avainsanat"]) {
        obj["avainsanat"] = data["Avainsanat"]["AvainsanaTeksti"];
    } else {
        delete obj["avainsanat"];
    }

    if (data["TieteenalaKoodit"]) {
        if (data["TieteenalaKoodit"]["TieteenalaKoodi"].length > 1) {
            for (let i = 0; i < data["TieteenalaKoodit"]["TieteenalaKoodi"].length; i++) {
                obj["tieteenala"].push( {"jnro": "", "tieteenalakoodi": "" });
                obj["tieteenala"][i].jnro = data["TieteenalaKoodit"]["TieteenalaKoodi"][i]["JNro"];
                obj["tieteenala"][i].tieteenalakoodi = data["TieteenalaKoodit"]["TieteenalaKoodi"][i]["content"];
            }
        } else {
            obj["tieteenala"].push( {"jnro": "", "tieteenalakoodi": "" });
            obj["tieteenala"][0]["jnro"] = data["TieteenalaKoodit"]["TieteenalaKoodi"]["JNro"];
            obj["tieteenala"][0]["tieteenalakoodi"] = data["TieteenalaKoodit"]["TieteenalaKoodi"]["content"];
        }
    } else {
        delete obj["tieteenala"];
    }

    return obj;
}

function enableZeroValue(field: any) {

    let ret;

    // return false if field doesn't exist
    if (field === false || field === null || typeof(field) === "undefined" ) {
        return false;
    }

    ret = field + "";

    // return true if field length is greater than zero
    return ret.length > 0;

}

async function getUrn(req: Request, res: Response) {
    try {
        const data =  await getUrnData();
        return res.status(200).json({ data });
    } catch (e) {
        console.log(e);
    }
}

function getUrnData() {
    return new Promise(function (resolve, reject) {
        request(URN_URL, function (error: any, res: any, body: any) {
            if (!error && res.statusCode == 200) {
                resolve(body);
            } else {
                reject(error);
            }
        });

    });
}


module.exports = {

    getAvainSanat: getAvainSanat,
    getJulkaisuSarjat: getJulkaisuSarjat,
    getKonferenssinimet: getKonferenssinimet,
    getKustantajat: getKustantajat,
    getJufo: getJufo,
    getJufotISSN: getJufotISSN,
    getJulkaisutVirtaCrossrefLista: getJulkaisutVirtaCrossrefLista,
    getJulkaisuVirtaCrossrefEsitaytto: getJulkaisuVirtaCrossrefEsitaytto,
    getUrn: getUrn,
    getUrnData: getUrnData

};