import { Request, Response, NextFunction } from "express";

const BASEURLFINTO = "https://api.finto.fi/rest/v1/yso/search?type=skos%3AConcept&unique=true&lang=";
const BASEURLJUFO =   "https://jufo-rest.csc.fi/v1.0/etsi.php?tyyppi=";

const kp = require("./../koodistopalvelu");
const oh = require("./../objecthandlers");
const utf8 = require("utf8");

const https = require("https");
const http = require("http");



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
function getJulkaisutVIRTACR(req: Request, res: Response, next: NextFunction) {
    const apiurl: string = "https://api.crossref.org/works?sort=published&order=desc&rows=50&query.title=" + req.query.q;
    console.log("This is the apiurl: " + apiurl);

    // The jufo rest api is kinda weird, if the query word is <5 or over 50
    // it returns nothing, which breaks the code, hence the odd looking error handling
    kp.HTTPGETshow(utf8.encode(apiurl), res, oh.ObjectHandlerJulkaisutVIRTACR);
}

// Esitäyttö, figure out how the res object should look.
function getJulkaisuVirtaCrossrefEsitaytto(req: Request, res: Response, next: NextFunction) {
    const apiurlCR = "https://api.crossref.org/works/" + req.query.id;
    const apiurlVirta = "https://virta-jtp.csc.fi/api/julkaisut/" + req.query.id;
    console.log("This is the req query lahde: " + req.query.lahde + " And this is the req query id: " + req.query.id);
    if (req.query.lahde === "virta") {
        kp.HTTPGETshow(utf8.encode(apiurlVirta), res , oh.ObjectHandlerVirtaEsitaytto);
    }
    else if (req.query.lahde === "crossref") {
        kp.HTTPGETshow(utf8.encode(apiurlCR), res, oh.ObjectHandlerCrossrefEsitaytto);
    }
    else {
        res.send("Wrong lahde parameter, try again");
    }
}

function getUrn(req: Request, res: Response, next: NextFunction) {

    const urnUrl = "http://generator.urn.fi/cgi-bin/urn_generator.cgi?type=nbn";

    http.get(utf8.encode(urnUrl), (resp: any) => {
        let data = "";

        resp.on("data", (chunk: any) => {
            data += chunk;
        });
        resp.on("end", () => {
            console.log(data);
            res.status(200).json({ data });
        });
    }).on("error", (err: any) => {
        console.log("Error: " + err.message);
        res.sendStatus(500);
    });

}

module.exports = {

    getAvainSanat: getAvainSanat,
    getJulkaisuSarjat: getJulkaisuSarjat,
    getKonferenssinimet: getKonferenssinimet,
    getKustantajat: getKustantajat,
    getJufo: getJufo,
    getJufotISSN: getJufotISSN,
    getJulkaisutVIRTACR: getJulkaisutVIRTACR,
    getJulkaisuVirtaCrossrefEsitaytto: getJulkaisuVirtaCrossrefEsitaytto,
    getUrn: getUrn

};