import { Request, Response, NextFunction } from "express";
const schedule = require("node-schedule");
// https will be used for external API calls
const https = require("https");
const promise = require("bluebird");
const kp = require("./koodistopalvelu");
const oh = require("./objecthandlers");
const fs = require("fs");
// Options used for our pgp const
const options = {
    promiseLib: promise
};

const BASEURLFINTO = "https://api.finto.fi/rest/v1/yso/search?type=skos%3AConcept&unique=true&lang=";
const BASEURLJUFO =   "https://jufo-rest.csc.fi/v1.0/etsi.php?tyyppi=";

// Initializing postgres connection by using pg-promise
const pgp = require("pg-promise")(options);
// Connection string for the database, move this to a ENV.variable later
const conString = process.env.PG_URL;
// const db will be used for all queries etc. db.any, db.none and so on
const db = pgp(conString);

// Redis client
const redis = require("redis");
const client = redis.createClient();

const dbHelpers = require("./databaseHelpers");

const authService = require("./services/authService");

// Scheduler for updating Koodistopalvelu data inside redis
// Each star represents a different value, beginning from second and ending in day
// So if we want to update it once a day at midnight we would use ("* 0 0 * * *")
const getRedis = (rediskey: string, success: any, error: any) => {
    client.get(rediskey, function (err: Error, reply: any) {
        if (!err) {
            success(reply);
        }
        else {
            error(err);
        }
    });
};

// Add Query functions here and define them in the module.exports at the end
// All GET requests first
// Get all julkaisut
function getJulkaisut(req: Request, res: Response, next: NextFunction) {
    db.any("select julkaisu.*, organisaatiotekija.id AS orgid, organisaatiotekija.etunimet, organisaatiotekija.sukunimi, organisaatiotekija.orcid, organisaatiotekija.rooli, alayksikko.alayksikko, tieteenala.tieteenalakoodi, tieteenala.jnro, taiteenala.taiteenalakoodi, taiteenala.jnro, avainsana.avainsana AS avainsanat, taidealantyyppikategoria.tyyppikategoria AS taidealantyyppikategoria, lisatieto.lisatietotyyppi, lisatieto.lisatietoteksti from julkaisu, organisaatiotekija, alayksikko, tieteenala, taiteenala, avainsana, taidealantyyppikategoria, lisatieto where julkaisu.id = organisaatiotekija.julkaisuid AND organisaatiotekija.id = alayksikko.organisaatiotekijaid AND julkaisu.id = tieteenala.julkaisuid AND julkaisu.id= taiteenala.julkaisuid AND julkaisu.id = avainsana.julkaisuid AND julkaisu.id = taidealantyyppikategoria.julkaisuid AND julkaisu.id = lisatieto.julkaisuid")
        .then((data: any) => {
            console.log(data);
            res.status(200)
                .json({
                    julkaisut: oh.ObjectHandlerAllJulkaisut(data)
    });
})
        .catch((err: any) => {
        return next(err);
});
}

function getJulkaisutmin(req: Request, res: Response, next: NextFunction) {

    const organisationCode =  authService.getOrganisationId(req.headers["shib-shib-group"]);

    if (!organisationCode) {
        return res.status(500).send("Permission denied");
    }

    const userData = authService.getUserData(req.headers);

    console.log(userData);
    console.log(organisationCode);


    if (organisationCode === "00000") {
        db.any("SELECT * FROM julkaisu")
            .then((data: any) => {
                res.status(200)
                    .json({
                        julkaisut: oh.ObjectHandlerAllJulkaisutmin(data)
                    });
            })
            .catch((err: any) => {
                return next(err);
            });
    } else {
        db.any("SELECT * FROM julkaisu WHERE organisaatiotunnus = ${id};",
            {
                id: organisationCode
            })
            .then((data: any) => {
                res.status(200)
                    .json({
                        julkaisut: oh.ObjectHandlerAllJulkaisutmin(data)
                    });
            })
            .catch((err: any) => {
                return next(err);
            });
    }
}

// Get a specific julkaisu by "id"
// function getAjulkaisu(req: Request, res: Response, next: NextFunction) {
//     kp.HTTPGETshow();
//     db.any("select * from julkaisu where id = ${id}", {
//         id: req.params.id
//     })
//         .then((data: any) => {
//             res.status(200)
//                 .json(data[0]);
//             })
//                 .catch((err: any) => {
//                 return next(err);
//         });
// }

// Get data from all tables by julkaisuid
function getAllPublicationDataById(req: Request, res: Response, next: NextFunction) {

    // check access rights also here
    const organisationCode =  authService.getOrganisationId(req.headers["shib-shib-group"]);

    if (!organisationCode) {
        return res.status(500).send("Permission denied");
    }

    kp.HTTPGETshow();
    db.task((t: any) => {

        return t.multi("SELECT * FROM julkaisu WHERE id = ${id}; " +
                "SELECT jnro, tieteenalakoodi  FROM tieteenala WHERE julkaisuid = ${id}; " +
                "SELECT jnro, taiteenalakoodi FROM taiteenala WHERE julkaisuid = ${id}; " +
                "SELECT avainsana FROM avainsana WHERE julkaisuid = ${id}; " +
                "SELECT tyyppikategoria FROM taidealantyyppikategoria WHERE julkaisuid = ${id}; " +
                "SELECT lisatietotyyppi, lisatietoteksti FROM lisatieto WHERE julkaisuid = ${id}; ",
            {
                id: req.params.id
            })
            .spread((julkaisu: any, tieteenala: any, taiteenala: any, avainsana: any, taidealantyyppikategoria: any, lisatieto: any) => {
                getOrgTekijat(req.params.id)
                    .then((organisaatiotekija: any) => {
                        const data = {
                            "julkaisu": julkaisu[0],
                            "organisaatiotekija": oh.mapOrganisaatiotekijaAndAlayksikko(organisaatiotekija),
                            "tieteenala": oh.checkIfEmpty(tieteenala),
                            "taiteenala": oh.checkIfEmpty(taiteenala),
                            "avainsanat": oh.mapAvainsanat(avainsana),
                            "taidealantyyppikategoria": oh.mapTaideAlanTyyppikategoria(taidealantyyppikategoria),
                            "lisatieto": oh.mapLisatietoData(lisatieto)
                        };
                        res.status(200)
                            .json({
                                data
                            });
                    }).catch(function (err: any)  {
                        // getOrgTekijat promise
                        console.log(err);
                });
            }).catch(function (err: any) {
                // multi query
                console.log(err);
            });

    }).then((julkaisu: any) => {});

    function  getOrgTekijat(id: any) {
        return db.task((t: any) => {
            return t.map("SELECT id, etunimet, sukunimi, orcid, rooli FROM organisaatiotekija WHERE julkaisuid=$1", id, (orgtekija: any) => {
                return t.any("SELECT alayksikko FROM alayksikko WHERE organisaatiotekijaid=$1", orgtekija.id)
                    .then((res: any) => {
                        orgtekija.tempalayksikko = res;
                        return orgtekija;
                    });
            }).then(t.batch);
        });

    }
}

// Get org tekija, just a test
function getOrgTekija(req: Request, res: Response, next: NextFunction) {
    db.any("select * from organisaatiotekija where id = ${id}", {
        id : req.params.id
    //     test: {
    //     id: req.params.id,
    //     arvo: req.body.arvo ? req.body.arvo = "",
    // }
    })
    .then((data: any) => {
        res.status(200)
            .json({
                data: data
            });
        })
            .catch((err: any) => {
            return next(err);
    });
}

// KOODISTOPALVELU GETS

function getJulkaisunTilat(req: Request, res: Response, next: NextFunction) {
    getRedis("getJulkaisunTilat", function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
}, function error(err: Error) {
    console.log("Something went wrong");
});
}
function getTekijanRooli(req: Request, res: Response, next: NextFunction) {
    getRedis("getTekijanRooli", function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
}, function error(err: Error) {
    console.log("Something went wrong");
});
}
function getKielet(req: Request, res: Response, next: NextFunction) {
    getRedis("getKielet", function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
}, function error(err: Error) {
    console.log("Something went wrong");
});
}
function getValtiot(req: Request, res: Response, next: NextFunction) {
        getRedis("getValtiot", function success(reply: any) {
            res.status(200).json(
                JSON.parse(reply)
            );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
}
function getTaideAlanTyyppiKategoria(req: Request, res: Response, next: NextFunction) {
    getRedis("getTaideAlanTyyppiKategoria", function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
}, function error(err: Error) {
    console.log("Something went wrong");
});
}
function getTaiteenalat(req: Request, res: Response, next: NextFunction) {
    getRedis("getTaiteenalat", function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
}, function error(err: Error) {
    console.log("Something went wrong");
});
}
function getTieteenalat(req: Request, res: Response, next: NextFunction) {
    getRedis("getTieteenalat", function success(reply: any) {
        res.status(200).json(
           JSON.parse(reply)
        );
}, function error(err: Error) {
    console.log("Something went wrong");
});
}
function getJulkaisunLuokat(req: Request, res: Response, next: NextFunction) {
    getRedis("getJulkaisunLuokat", function success(reply: any) {
        res.status(200).json(
           JSON.parse(reply)
        );
}, function error(err: Error) {
    console.log("Something went wrong");
});
}

function testvirta(res: Response) {
    kp.HTTPGETshow("https://virta-jtp.csc.fi/api/julkaisut/haku?julkaisunNimi=explicit", res, oh.ObjectHandlerTestVirta);
}
// NOT SURE IF NEEDED

function getAlaYksikot(req: Request, res: Response, next: NextFunction) {
    getRedis("getAlayksikot", function success(reply: any) {
        res.status(200).json(
           JSON.parse(reply)
        );
}, function error(err: Error) {
    console.log("Something went wrong");
});
}

function getUser(req: Request, res: Response, next: NextFunction) {

    const userData = authService.getUserData(req.headers);


    if (!userData) {
        return res.status(500).send("Permission denied");
    }
    else {
        oh.ObjectHandlerUser(userData, function(result: any) {
            res.status(200).json(
                result
            );
          });
 }
}
function getAvainSanat(req: Request, res: Response, next: NextFunction) {
        if (req.query.lang.toLowerCase() === "fi" || req.query.lang.toLowerCase() === "sv") {
           const url: string = BASEURLFINTO + req.query.lang + "&query=" + req.query.q + "*";
           const secondurl: string = BASEURLFINTO + "EN" + "&query=" + req.query.q + "*";
           kp.HTTPGETshow(url, res, oh.ObjectHandlerAvainsanat, secondurl);
        }
        else {
        const apiurl: string = BASEURLFINTO + req.query.lang + "&query=" + req.query.q + "*";
        console.log("This is the apiurl: " + apiurl);
        kp.HTTPGETshow(apiurl, res, oh.ObjectHandlerAvainsanat);
    }
}
function getJulkaisuSarjat(req: Request, res: Response, next: NextFunction) {
        const apiurl: string = BASEURLJUFO + "1&nimi=" + req.query.q;
        console.log("This is the apiurl: " + apiurl);

        // The jufo rest api is kinda weird, if the query word is <5 or over 50
        // it returns nothing, which breaks the code, hence the odd looking error handling

        if ((req.query.q).length >= 5 && (req.query.q).length <= 50) {
        kp.HTTPGETshow(apiurl, res, oh.ObjectHandlerJulkaisusarjat);
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
        kp.HTTPGETshow(apiurl, res, oh.ObjectHandlerKonferenssinnimet);
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
        kp.HTTPGETshow(apiurl, res, oh.ObjectHandlerKustantajat);
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
    kp.HTTPGETshow(apiurl, res, oh.ObjectHandlerJulkaisutVIRTACR);
}

// Esitäyttö, figure out how the res object should look.
function getJulkaisuVirtaCrossrefEsitäyttö(req: Request, res: Response, next: NextFunction) {
    const apiurlCR = "https://api.crossref.org/works/" + req.query.id;
    const apiurlVirta = "https://virta-jtp.csc.fi/api/julkaisut/" + req.query.id;
    console.log("This is the req query lahde: " + req.query.lahde + " And this is the req query id: " + req.query.id);
    if (req.query.lahde === "virta") {
        kp.HTTPGETshow(apiurlVirta, res , oh.ObjectHandlerVirtaEsitäyttö);
    }
    else if (req.query.lahde === "crossref") {
        kp.HTTPGETshow(apiurlCR, res, oh.ObjectHandlerCrossrefEsitäyttö);
    }
    else {
        res.send("Wrong lahde parameter, try again");
    }
}

// POST requests
// Post a julkaisu to the database
// Catch the JSON body and parse it so that we can insert the values into postgres
function postJulkaisu(req: Request, res: Response, next: NextFunction) {
    let jid: any = "";
    db.task(() => {
        const julkaisuColumns = new pgp.helpers.ColumnSet(dbHelpers.julkaisu, {table: "julkaisu"});
        const saveJulkaisu = pgp.helpers.insert(req.body.julkaisu, julkaisuColumns) + "RETURNING id";
        return db.one(saveJulkaisu)
            .then((julkaisuidinit: any) => {

                jid = julkaisuidinit.id;

                Promise.all([
                    insertOrganisaatiotekijaAndAlayksikko(req.body.organisaatiotekija, jid),
                    insertTieteenala(req.body.tieteenala, jid),
                    insertTaiteenala(req.body.taiteenala, jid),
                    insertAvainsanat(req.body.avainsanat, jid),
                    insertTyyppikategoria(req.body.taidealantyyppikategoria, jid),
                    insertLisatieto(req.body.lisatieto, jid)
                ]).then(() => {
                    res.status(200)
                        .json(julkaisuidinit);
                });
            })
            .catch(function(err: any) {
                // error in julkaisun tallennus
                return next(err);
            });
    });

}


// GET ORGANISAATIOLISTAUS
function getOrganisaatioListaus(req: Request, res: Response, next: NextFunction) {
    getRedis("getOrgListaus", function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
}, function error(err: Error) {
    console.log("Something went wrong");
});
}

// Post orgtekija, just a test
function postOrg(req: Request, res: Response, next: NextFunction) {
    db.none("INSERT INTO organisaatiotekija VALUES (2, 5, 'Victor', 'Tester', 'csc', 'Seniorez Developez')")
    .then(function() {
        res.status(200)
        .json({
            message: "Insert successful"
        });
    })
    .catch(function(err: any) {
    return next(err);
});
}

function postAdminAction(req: Request, res: Response, next: NextFunction) {
    // TODO ADD CODE HERE
}

// PUT requests
async function updateJulkaisu(req: Request, res: Response, next: NextFunction) {

    const julkaisuColumns = new pgp.helpers.ColumnSet(dbHelpers.julkaisu, {table: "julkaisu"});
    const updateJulkaisu = pgp.helpers.update(req.body.julkaisu, julkaisuColumns) + "WHERE id = " +  parseInt(req.params.id);


    // begin transaction
    await db.any("BEGIN");

    try {

        const julkaisu = await db.none(updateJulkaisu);

        await db.result("DELETE FROM alayksikko WHERE organisaatiotekijaid = ${orgid}", {
            orgid: req.body.organisaatiotekija.id
        });
        await db.result("DELETE FROM organisaatiotekija WHERE julkaisuid = ${id}", {
            id: req.params.id
        });
        const organisaatiotekija = await insertOrganisaatiotekijaAndAlayksikko(req.body.organisaatiotekija, req.params.id);

        await db.result("DELETE FROM tieteenala WHERE julkaisuid = ${id}", {
            id: req.params.id
        });
        const tieteenala = await insertTieteenala(req.body.tieteenala, req.params.id);

        await db.result("DELETE FROM taiteenala WHERE julkaisuid = ${id}", {
            id: req.params.id
        });
        const taiteenala = await insertTaiteenala(req.body.taiteenala, req.params.id);

        await db.result("DELETE FROM avainsana WHERE julkaisuid = ${id}", {
            id: req.params.id
        });
        const avainsana = await insertAvainsanat(req.body.avainsanat, req.params.id);

        await db.result("DELETE FROM taidealantyyppikategoria WHERE julkaisuid = ${id}", {
            id: req.params.id
        });
        const taidealantyyppikategoria = await insertTyyppikategoria(req.body.taidealantyyppikategoria, req.params.id);

        await db.result("DELETE FROM lisatieto WHERE julkaisuid = ${id}", {
            id: req.params.id
        });
        const lisatieto = await insertLisatieto(req.body.lisatieto, req.params.id);

        await db.any("COMMIT");
        return res.sendStatus(200);


    } catch (err) {
        // if error exists in any query, rollback
        console.log(err);
        await db.any("ROLLBACK");
        res.sendStatus(500);
    }

}

function putJulkaisuntila(req: Request, res: Response, next: NextFunction) {
    // TODO ADD CODE HERE
}

function insertTieteenala(obj: any, jid: any) {

    const tieteenalaObj =  dbHelpers.addJulkaisuIdToObject(obj, jid);
    const tieteenalaColumns = new pgp.helpers.ColumnSet(dbHelpers.tieteenala, {table: "tieteenala"});
    const saveTieteenala = pgp.helpers.insert(tieteenalaObj, tieteenalaColumns) + "RETURNING id";

    return db.many(saveTieteenala)
        .then((response: any) => {
            // console.log(response);
        }).catch(function(err: any) {
            console.log(err);
        });
}



// insert functions, used both in update and post requests
function insertTaiteenala(obj: any, jid: any) {

    if (!obj || obj.length < 1) { return Promise.resolve(true); }

    const taiteenalaObj =  dbHelpers.addJulkaisuIdToObject(obj, jid);
    const tieteenalaColumns = new pgp.helpers.ColumnSet(dbHelpers.taiteenala, {table: "taiteenala"});
    const saveTieteenala = pgp.helpers.insert(taiteenalaObj, tieteenalaColumns) + "RETURNING id";

    return db.many(saveTieteenala)
        .then((response: any) => {
            // console.log(response);
        }).catch(function(err: any) {
            console.log(err);
        });
}

function insertAvainsanat(obj: any, jid: any) {

    if (!obj || obj.length < 1) { return Promise.resolve(true); }

    const avainsanaObj = dbHelpers.constructObject(obj, jid, "avainsana");
    const avainsanatColumns = new pgp.helpers.ColumnSet(["julkaisuid", "avainsana"], {table: "avainsana"});
    const saveAvainsanat = pgp.helpers.insert(avainsanaObj, avainsanatColumns) + "RETURNING id";
    return db.many(saveAvainsanat)
        .then((response: any) => {
            // console.log(response);
        }).catch(function(err: any) {
            console.log(err);
        });
}
function insertTyyppikategoria(obj: any, jid: any) {

    if (!obj || obj.length < 1) { return Promise.resolve(true); }

    const tyyppikategoriaObj = dbHelpers.constructObject(obj, jid, "tyyppikategoria");
    const tyyppikategoriaColumns = new pgp.helpers.ColumnSet(["julkaisuid", "tyyppikategoria"], {table: "taidealantyyppikategoria"});
    const saveTyyppikategoria = pgp.helpers.insert(tyyppikategoriaObj, tyyppikategoriaColumns) + "RETURNING id";

    return db.many(saveTyyppikategoria)
        .then((response: any) => {
            // console.log(response);
        }).catch(function(err: any) {
            console.log(err);
        });
}

function insertLisatieto(obj: any, jid: any) {

    if (!obj || obj.length < 1) { return Promise.resolve(true); }

    const temp = obj;
    const lisatietoObj: any = [];

    Object.keys(temp).forEach(function (val, key) {
        if (typeof lisatietoObj[key] === "undefined") {
            lisatietoObj[key] = {"julkaisuid": "", "lisatietotyyppi": "", "lisatietoteksti": ""};
        }
        lisatietoObj[key].julkaisuid = jid;
        lisatietoObj[key].lisatietotyyppi = val;
        lisatietoObj[key].lisatietoteksti = temp[val];
    });

    const lisatietoColumns = new pgp.helpers.ColumnSet(["julkaisuid", "lisatietotyyppi", "lisatietoteksti"], {table: "lisatieto"});
    const saveLisatieto = pgp.helpers.insert(lisatietoObj, lisatietoColumns) + "RETURNING id";

    return db.many(saveLisatieto)
        .then((lisatietoid: any) => {
            // console.log(lisatietoid);
        }).catch(function (err: any) {
            // lisatieto error
            console.log(err);
        });

}


function insertOrganisaatiotekijaAndAlayksikko(obj: any, jid: any) {

    const orgTekijaObj = dbHelpers.addJulkaisuIdToObject(obj, jid);
    const organisaatiotekijaColumns = new pgp.helpers.ColumnSet(dbHelpers.organisaatiotekija, {table: "organisaatiotekija"});
    const saveOrganisaatiotekija = pgp.helpers.insert(orgTekijaObj, organisaatiotekijaColumns) + "RETURNING id";

    return db.many(saveOrganisaatiotekija)
        .then((orgid: any) => {

            if (!obj[0].alayksikko[0]) {return Promise.resolve(true); }
            // if (!obj[0].alayksikko[0]) {return Promise.resolve(true); }

            const alayksikkoObj = [];
            for (let i = 0; i < orgid.length; i++) {
                for (let j = 0; j < obj[i].alayksikko.length; j++) {
                    alayksikkoObj.push({"alayksikko" : obj[i].alayksikko[j], "organisaatiotekijaid":  orgid[i].id});
                }
            }
            const alayksikkoColumns = new pgp.helpers.ColumnSet(["organisaatiotekijaid", "alayksikko"], {table: "alayksikko"});
            const saveAlayksikko = pgp.helpers.insert(alayksikkoObj, alayksikkoColumns) + "RETURNING id";

            return db.many(saveAlayksikko)
                .then((alyksikkoid: any) => {
                    // console.log(alyksikkoid);
                }).catch(function (err: any) {
                    // error in alayksikko
                    console.log(err);
                });


        }).catch(function (err: any) {
            // error in organisaatiotekija
            console.log(err);
        });

}

module.exports = {
    // GET requests
    getOrgTekija: getOrgTekija,
    getJulkaisut: getJulkaisut,
    getJulkaisutmin: getJulkaisutmin,
    // getAjulkaisu: getAjulkaisu,
    getAllPublicationDataById: getAllPublicationDataById,
    getJulkaisunLuokat: getJulkaisunLuokat,
    getJulkaisunTilat: getJulkaisunTilat,
    getTekijanRooli: getTekijanRooli,
    getKielet: getKielet,
    getValtiot: getValtiot,
    getTaideAlanTyyppiKategoria: getTaideAlanTyyppiKategoria,
    getTaiteenalat: getTaiteenalat,
    getTieteenalat: getTieteenalat,
    getUser: getUser,
    getAvainSanat: getAvainSanat,
    getJulkaisuSarjat: getJulkaisuSarjat,
    getAlaYksikot: getAlaYksikot,
    getKonferenssinimet: getKonferenssinimet,
    getKustantajat: getKustantajat,
    getJufo: getJufo,
    getJufotISSN: getJufotISSN,
    getJulkaisutVIRTACR: getJulkaisutVIRTACR,
    getJulkaisuVirtaCrossrefEsitäyttö: getJulkaisuVirtaCrossrefEsitäyttö,
    getOrganisaatioListaus: getOrganisaatioListaus,
    testvirta: testvirta,
    // POST requests
    postJulkaisu: postJulkaisu,
    postOrg: postOrg,
    postAdminAction: postAdminAction,
    // PUT requests
    // putJulkaisu: putJulkaisu,
    putJulkaisuntila: putJulkaisuntila,
    // Update requests
    updateJulkaisu: updateJulkaisu,

};