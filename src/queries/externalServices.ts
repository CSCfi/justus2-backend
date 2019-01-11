import { Request, Response, NextFunction } from "express";

const BASEURLFINTO = "https://api.finto.fi/rest/v1/yso/search?type=skos%3AConcept&unique=true&lang=";
const BASEURLJUFO =   "https://jufo-rest.csc.fi/v1.0/etsi.php?tyyppi=";

const URN_URL = process.env.URN_URL;
const crossRefUrl = process.env.CROSSREF_URL;
const virtaUrl = process.env.VIRTA_URL;

const request = require("request");
const requestPromise = require("request-promise");

const kp = require("./../koodistopalvelu");
const oh = require("./../objecthandlers");
const utf8 = require("utf8");

function getAvainSanat(req: Request, res: Response, next: NextFunction) {
    if (req.query.lang.toLowerCase() === "fi" || req.query.lang.toLowerCase() === "sv") {
        const url: string = BASEURLFINTO + req.query.lang + "&query=" + req.query.q + "*";
        const secondurl: string = BASEURLFINTO + "EN" + "&query=" + req.query.q + "*";
        kp.HTTPGETshow(utf8.encode(url), res, oh.ObjectHandlerAvainsanat, utf8.encode(secondurl));
    }
    else {
        const apiurl: string = BASEURLFINTO + req.query.lang + "&query=" + req.query.q + "*";
        console.log("This is the apiurl: " + apiurl);
        kp.HTTPGETshow(utf8.encode(apiurl), res, oh.ObjectHandlerAvainsanat);
    }
}
function getJulkaisuSarjat(req: Request, res: Response, next: NextFunction) {
    const apiurl: string = BASEURLJUFO + "1&nimi=" + req.query.q;
    console.log("This is the apiurl: " + apiurl);

    // The jufo rest api is kinda weird, if the query word is <5 or over 50
    // it returns nothing, which breaks the code, hence the odd looking error handling

    if ((req.query.q).length >= 5 && (req.query.q).length <= 50) {
        kp.HTTPGETshow(utf8.encode(apiurl), res, oh.ObjectHandlerJulkaisusarjat);
    }
    else {
        res.send("");
    }
}
function getKonferenssinimet(req: Request, res: Response, next: NextFunction) {
    const apiurl: string = BASEURLJUFO + "3&nimi=" + req.query.q;
    console.log("This is the apiurl: " + apiurl);

    // The jufo rest api is kinda weird, if the query word is <5 or over 50
    // it returns nothing, which breaks the code, hence the odd looking error handling

    if ((req.query.q).length >= 5 && (req.query.q).length <= 50) {
        kp.HTTPGETshow(utf8.encode(apiurl), res, oh.ObjectHandlerKonferenssinnimet);
    }
    else {
        res.send("");
    }
}
function getKustantajat(req: Request, res: Response, next: NextFunction) {
    const apiurl: string = BASEURLJUFO + "2&nimi=" + req.query.q;
    console.log("This is the apiurl: " + apiurl);

    // The jufo rest api is kinda weird, if the query word is <5 or over 50
    // it returns nothing, which breaks the code, hence the odd looking error handling

    if ((req.query.q).length >= 5 && (req.query.q).length <= 50) {
        kp.HTTPGETshow(utf8.encode(apiurl), res, oh.ObjectHandlerKustantajat);
    }
    else {
        res.send("");
    }
}
function getJufo(req: Request, res: Response, next: NextFunction) {
    const apiurl: string = "https://jufo-rest.csc.fi/v1.0/kanava/" + req.params.id;
    console.log("This is the apiurl: " + apiurl);

    // The jufo rest api is kinda weird, if the query word is <5 or over 50
    // it returns nothing, which breaks the code, hence the odd looking error handling

    if ((req.params.id).length > 0 && (req.params.id).length <= 9) {
        kp.HTTPGETshow(apiurl, res, oh.ObjectHandlerJufoID);
    }
    else {
        res.send("");
    }
}
function getJufotISSN(req: Request, res: Response, next: NextFunction) {
    const apiurl: string = "https://jufo-rest.csc.fi/v1.0/etsi.php?issn=" + req.query.issn;
    console.log("This is the apiurl: " + apiurl);

    // The jufo rest api is kinda weird, if the query word is <5 or over 50
    // it returns nothing, which breaks the code, hence the odd looking error handling

    if ((req.query.issn).length >= 5 && (req.query.issn).length <= 10) {
        kp.HTTPGETshow(apiurl, res, oh.ObjectHandlerJufoISSN);
    }
    else {
        res.send("");
    }
}
 function getJulkaisutVirtaCrossrefLista(req: Request, res: Response, next: NextFunction) {

    const julkaisu = req.query.julkaisu;
    const tekija = req.query.tekija; // VIRTA: tunnus tekijat, CROSSREF: tunnus author

    if (req.query.julkaisu.length < 5) {
        return;
    }

    const apiUrlCrossRef: string = crossRefUrl + "?sort=published&order=desc&rows=50&query.title=" + encodeURIComponent(julkaisu);
    const apiUrlVirta: string = virtaUrl + "?julkaisunNimi=" + encodeURIComponent(julkaisu);

    const virtaPromise = requestPromise({
       uri: apiUrlVirta,
       timeout: 20000,
        json: true
    });

    const crossRefPromise = requestPromise({
        uri: apiUrlCrossRef,
        json: true
    });

    const promises = [crossRefPromise, virtaPromise];

    const reflect = (p: any) => p.then((v: any) => ({v, status: "resolved" }),
        (e: any) => ({ e, status: "rejected" }));

    Promise.all(promises.map(reflect)).then(function (results) {
        const success = results.filter(x => x.status === "resolved");

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

    console.log(req.query.lahde);
    console.log(req.query.id);

    if (req.query.lahde.toLowerCase() === "crossref") {
        url = crossRefUrl + "/http://dx.doi.org" + req.query.id;
        console.log(url);
    }
    if (req.query.lahde.toLowerCase() === "virta") {
        url = "https://virta-jtp.csc.fi/api/julkaisut/" + req.query.id;
    }

    request(utf8.encode(url), { json: true }, (error: any, response: any, data: any) => {
        if (error) {
            console.log(error);
            res.sendStatus(500);
        }

        const ret = parseCrossRefData(data["message"]);
        res.status(200).json( ret );
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
            // "issn": ""
        };
        crObj.source = "CrossRef";
        crObj.title = data.cr[key].title[data.cr[key].title.length - 1];
        crObj.doi = data.cr[key].DOI;
        crObj.identifier = data.cr[key].DOI;

        // if (data.cr[key].ISSN) {
        //     crObj.issn = data.cr[key].ISSN[0];
        // }

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
            "identifier": ""
            // "issn": "" // issn

        };

        virtaObj.source = "VIRTA";
        if (data.virta[key].julkaisunNimi) { virtaObj.title = data.virta[key].julkaisunNimi; }
        if (data.virta[key].tekijat) { virtaObj.author = data.virta[key].tekijat; }
        if (data.virta[key].doi) { virtaObj.doi = data.virta[key].doi; }
        // if (data.virta[key].issn) { virtaObj.issn = data.virta[key].issn; }
        if (data.virta[key].julkaisunTunnus) { virtaObj.identifier = data.virta[key].julkaisunTunnus; }

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
    if (data.ISSN) {
        if (data.ISSN.constructor === Array && data.ISSN.length > 0) {
            obj["issn"] = data.ISSN[0];
        }  else {
            obj["issn"] = data.ISSN;
        }
    }
    obj["volyymi"] = data.volume || "";
    obj["numero"] = data.issue || "";
    obj["sivut"] = data.page || "";
    obj["artikkelinumero"] = data["article-number"] || "";

    let tekijat = "";
    Object.keys(data.author).forEach(function (key) {
        if (tekijat.length > 0) tekijat += "; ";
        tekijat += data.author[key].family + ", " + data.author[key].given;
    });
    obj["tekijat"] = tekijat;

    let vuosi;
    if (data.issued) {
        if (data.issued["date-parts"]) {
            vuosi = "" + data.issued["date-parts"];
            obj["julkaisuvuosi"] = vuosi.split(",")[0];
        }
    }

    return obj;
}

function getUrn(req: Request, res: Response, next: NextFunction) {

    request(utf8.encode(URN_URL), { json: true }, (error: any, response: any, data: any) => {
        if (error) {
            console.log(error);
            res.sendStatus(500);
        }
        res.status(200).json({ data });
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
    getUrn: getUrn

};