import { Request, Response, NextFunction, json } from "express";
import { resolve } from "path";

const schedule = require("node-schedule");
const https = require("https");

// Redis client
const redis = require("redis");
const client = redis.createClient();

// Prefix for objecthandler import
const OH = require("./objecthandlers");

const koodistoUrl = process.env.KOODISTO_URL;
const callerId = process.env.KOODISTO_CALLER_ID;
const organisationConfig = require("./organization_config");


// Import TheseusSender class
import { theseus as ts } from "./services/TheseusSender";

// REMEMBER THIS
// (node:1239) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 connect listeners added. Use emitter.setMaxListeners() to increase limit

// Scheduler for updating Koodistopalvelu data inside redis
// Each star represents a different value, beginning from second and ending in day
// So if we want to update it once a day at midnight we would use ("0 0 0 * * *")
schedule.scheduleJob("0 0 0 * * *", function(res: Response) {
   UpdateKoodistopalveluRedis(res);
});
schedule.scheduleJob("15 0 0 * * *", function(res: Response) {
   UpdateOrgListaus(res);
});

// Interval timer for checking julkaisujono
setInterval(() =>  ts.checkQueue(), 30000);


function UpdateOrgListaus(res: Response) {
    return new Promise((resolve, reject) => {
        setOrgListausFI(res).then(() => {
            return setOrgListausSV(res);
        }).then(() => {
            return setOrgListausEN(res);
        });

    });
}

UpdateKoodistopalveluRedis(undefined).then(function() {
    return UpdateOrgListaus(undefined);
});

function UpdateKoodistopalveluRedis(res: Response) {
    return new Promise((resolve, reject) => {
        client.on("connect", () => {
            console.log("Connected to redis");
            setAlaYksikot(res).then(() => {
                return setKieletFI(res);
            }).then(() => {
                return setKieletEN(res);
            }).then(() => {
                return setKieletSV(res);
            }).then(() => {
                return setJulkaisunTilatFI(res);
            }).then(() => {
                return setJulkaisunTilatEN(res);
            }).then(() => {
                return setJulkaisunTilatSV(res);
            }).then(() => {
                return setTaideAlanTyyppiKategoriaFI(res);
            }).then(() => {
                return setTaideAlanTyyppiKategoriaEN(res);
            }).then(() => {
                return setTaideAlanTyyppiKategoriaSV(res);
            }).then(() => {
                return setTekijanRooliFI(res);
            }).then(() => {
                return setTekijanRooliEN(res);
            }).then(() => {
                return setTekijanRooliSV(res);
            }).then(() => {
                return setValtiotFI(res);
            }).then(() => {
                return setValtiotEN(res);
            }).then(() => {
                return setValtiotSV(res);
            }).then(() => {
                return setTaiteenalatFI(res);
            }).then(() => {
                return setTaiteenalatEN(res);
            }).then(() => {
                return setTaiteenalatSV(res);
            }).then(() => {
                return  setTieteenalatFI(res);
            }).then(() => {
                return  setTieteenalatEN(res);
            }).then(() => {
                return  setTieteenalatSV(res);
            }).then(() => {
                return setJulkaisunLuokatFI(res);
            }).then(() => {
                return setJulkaisunLuokatEN(res);
            }).then(() => {
                return setJulkaisunLuokatSV(res);
            }).then(() => {
                console.log("Data from Koodistopalvelu updated");
                resolve();
            });
        });
    });
}

// Used for apis where you need to combine multiple external api calls and set redis later
// when you have combined the data
function HTTPGETcombiner (URL: String, res: Response, objecthandler: Function, lang: any ) {

    const options = {
        host: koodistoUrl,
        port: 443,
        path: "/koodisto-service/rest/json" + URL,
        rejectUnauthorized: false,
        headers: {
            "Caller-Id": callerId
        }
    };

    https.get(options, (resp: Response) => {
        let data = "";
        resp.on("data", (chunk: any) => {
            data += chunk;
        });
        resp.on("end", () => {
            const newdata = JSON.parse(data);
            objecthandler(newdata, lang);
            console.log("Set info for " + objecthandler.name + " to redis successfully!");
        });
    })
    .on("error", (err: Error) => {
        console.log("Error: " + err.message);
    });
}


// Only finto and jufo services use this function, so no caller-id is needed
export function HTTPGETshow (URL: String, res: Response, objecthandler: Function, secondURL?: String, queryParams?: String) {

    if (secondURL) {
        const urls = [URL, secondURL];
        const first: object []  = [
        ];
        const second: object [] = [
        ];
        const combined: object [] = [
        ];
        let requests: number = 0;
        for (const i in urls) {
        let data = "";
        https.get(urls[i], (resp: Response) => {
            resp.on("data", (chunk: any) => {
                data += chunk;
            });
            resp.on("end", () => {
                requests ++;
                if (requests === 1) {
                    first.push(JSON.parse(data));
                }
                if (requests === 2) {
                // console.log("combined data as string" + data);
                second.push(JSON.parse(data));
                    combined.push(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)));
                        // console.log("This is the data : " + combined);
                        res.send(objecthandler(JSON.parse(JSON.stringify(combined))));
                }
            });
        })
        .on("error", (err: Error) => {
            console.log("Error: " + err.message);
        });
        }
    }
    else {
        https.get(URL, (resp: Response) => {
            let data = "";
            resp.on("data", (chunk: any) => {
                data += chunk;
            });
            resp.on("end", () => {
                if (!data) {
                    res.send("{}");
                } else {
                    const newdata = JSON.parse(data);
                    res.send(objecthandler(newdata, queryParams));
                }

            });
        })
        .on("error", (err: Error) => {
            console.log("Error: " + err.message);
        });
        }
}

function HTTPSUBGET (URL: String) {

    return new Promise((resolve, reject) => {
        const options = {
            host: koodistoUrl,
            port: 443,
            path: "/koodisto-service/rest/json" + URL,
            rejectUnauthorized: false,
            headers: {
                "Caller-Id": callerId
            }
        };

        https.get(options, (resp: any) =>  {
            let data = "";
            resp.on("data", (chunk: any) => {
                data += chunk;
            });
            resp.on("end", () => {
                resolve(data);
            });
        })
        .on("error", (err: Error) => {
            console.log("Error: " + err.message);
            reject();
        });
    });
}

function HTTPGET (URL: String, redisInfo: String, objecthandler: Function, lang?: any, orgid?: any) {
    return new Promise((resolve, reject) => {
        if (objecthandler.name === "ObjectHandlerOrgNames") {
            const proms: object [] = [];
            for (const i in orgid) {
                if (orgid[i].length > 5) {
                    proms.push(HTTPSUBGET("/tutkimusorganisaatio/koodi/tutkimusorganisaatio_" + orgid[i]));
                }
                else {
                    proms.push(HTTPSUBGET("/oppilaitosnumero/koodi/oppilaitosnumero_" + orgid[i]));
                }
            }
            Promise.all(proms).then((values: object []) => {
                const list: object [] = [];
                for (const j in values) {
                    try {
                        list.push(JSON.parse(String(values[j])));
                    }
                    catch (err) {
                        console.log("EXCEPTION");
                        console.log(err);
                    }
                }
                OH.ObjectHandlerOrgNames(list, orgid, lang);
                resolve();
            }).catch((err: Error) => {
                console.log("Error: " + err);
                reject();
            });
        }
        else {
            HTTPSUBGET(URL).then((data) => {
                const newdata = JSON.parse(String(data));
                client.set(redisInfo, JSON.stringify(objecthandler(newdata, lang)));
                console.log("Set info for " + redisInfo + " from Objecthandlers to redis successfully!");
                resolve();
            }).catch((err: any) => {
                console.log("Error: " + err);
                reject();
            });
        }
    });
}

function setJulkaisunTilatFI(res: Response) {
    return HTTPGET("/julkaisuntila/koodi?onlyValidKoodis=false", res, "getJulkaisunTilatFI", OH.ObjectHandlerJulkaisuntilat, "FI");
}
function setJulkaisunTilatEN(res: Response) {
    return HTTPGET("/julkaisuntila/koodi?onlyValidKoodis=false", res, "getJulkaisunTilatEN", OH.ObjectHandlerJulkaisuntilat, "EN");
}
function setJulkaisunTilatSV(res: Response) {
    return HTTPGET("/julkaisuntila/koodi?onlyValidKoodis=false", res, "getJulkaisunTilatSV", OH.ObjectHandlerJulkaisuntilat, "SV");
}
function setKieletFI(res: Response) {
    return HTTPGET("/kieli/koodi?onlyValidKoodis=false", res, "getKieletFI", OH.ObjectHandlerKielet, "FI");
}
function setKieletEN(res: Response) {
    return HTTPGET("/kieli/koodi?onlyValidKoodis=false", res, "getKieletEN", OH.ObjectHandlerKielet, "EN");
}
function setKieletSV(res: Response) {
    return HTTPGET("/kieli/koodi?onlyValidKoodis=false", res, "getKieletSV", OH.ObjectHandlerKielet, "SV");
}
function setValtiotFI(res: Response) {
    return HTTPGET("/maatjavaltiot2/koodi?onlyValidKoodis=false", res, "getValtiotFI", OH.ObjectHandlerValtiot, "FI");
}
function setValtiotEN(res: Response) {
    return HTTPGET("/maatjavaltiot2/koodi?onlyValidKoodis=false", res, "getValtiotEN", OH.ObjectHandlerValtiot, "EN");
}
function setValtiotSV(res: Response) {
    return HTTPGET("/maatjavaltiot2/koodi?onlyValidKoodis=false", res, "getValtiotSV", OH.ObjectHandlerValtiot, "SV");
}
function setTaideAlanTyyppiKategoriaFI(res: Response) {
    return HTTPGET("/taidealantyyppikategoria/koodi?onlyValidKoodis=false", res, "getTaideAlanTyyppiKategoriaFI", OH.ObjectHandlerTaidealantyyppikategoria, "FI");
}
function setTaideAlanTyyppiKategoriaEN(res: Response) {
    return HTTPGET("/taidealantyyppikategoria/koodi?onlyValidKoodis=false", res, "getTaideAlanTyyppiKategoriaEN", OH.ObjectHandlerTaidealantyyppikategoria, "EN");
}
function setTaideAlanTyyppiKategoriaSV(res: Response) {
    return HTTPGET("/taidealantyyppikategoria/koodi?onlyValidKoodis=false", res, "getTaideAlanTyyppiKategoriaSV", OH.ObjectHandlerTaidealantyyppikategoria, "SV");
}
function setTaiteenalatFI(res: Response) {
    return HTTPGET("/taiteenala/koodi?onlyValidKoodis=false", res, "getTaiteenalatFI", OH.ObjectHandlerTaiteenalat, "FI");
}
function setTaiteenalatEN(res: Response) {
    return HTTPGET("/taiteenala/koodi?onlyValidKoodis=false", res, "getTaiteenalatEN", OH.ObjectHandlerTaiteenalat, "EN");
}
function setTaiteenalatSV(res: Response) {
    return HTTPGET("/taiteenala/koodi?onlyValidKoodis=false", res, "getTaiteenalatSV", OH.ObjectHandlerTaiteenalat, "SV");
}
function setTekijanRooliFI(res: Response) {
    return HTTPGET("/julkaisuntekijanrooli/koodi?onlyValidKoodis=false", res, "getTekijanRooliFI", OH.ObjectHandlerRoolit, "FI");
}
function setTekijanRooliEN(res: Response) {
    return HTTPGET("/julkaisuntekijanrooli/koodi?onlyValidKoodis=false", res, "getTekijanRooliEN", OH.ObjectHandlerRoolit, "EN");
}
function setTekijanRooliSV(res: Response) {
    return HTTPGET("/julkaisuntekijanrooli/koodi?onlyValidKoodis=false", res, "getTekijanRooliSV", OH.ObjectHandlerRoolit, "SV");
}
function setTieteenalatFI(res: Response) {
    return HTTPGETcombiner("/paatieteenala/koodi?onlyValidKoodis=false", res, OH.ObjectHandlerTieteenalat, "FI");
}
function setTieteenalatEN(res: Response) {
    return HTTPGETcombiner("/paatieteenala/koodi?onlyValidKoodis=false", res, OH.ObjectHandlerTieteenalat, "EN");
}
function setTieteenalatSV(res: Response) {
    return HTTPGETcombiner("/paatieteenala/koodi?onlyValidKoodis=false", res, OH.ObjectHandlerTieteenalat, "SV");
}
function setJulkaisunLuokatFI(res: Response) {
    return HTTPGETcombiner("/julkaisunpaaluokka/koodi?onlyValidKoodis=false", res, OH.ObjectHandlerJulkaisunluokat, "FI");
}
function setJulkaisunLuokatEN(res: Response) {
    return HTTPGETcombiner("/julkaisunpaaluokka/koodi?onlyValidKoodis=false", res, OH.ObjectHandlerJulkaisunluokat, "EN");
}
function setJulkaisunLuokatSV(res: Response) {
    return HTTPGETcombiner("/julkaisunpaaluokka/koodi?onlyValidKoodis=false", res, OH.ObjectHandlerJulkaisunluokat, "SV");
}
function setAlaYksikot(res: Response) {
    return HTTPGET("/alayksikkokoodi/koodi?onlyValidKoodis=false", res, "getAlayksikot", OH.ObjectHandlerAlayksikot);
}
function setOrgListausFI() {
    const orgid = organisationConfig.getOrganisationCodes();
    return HTTPGET("", "getOrgListausFI", OH.ObjectHandlerOrgNames, "FI", orgid);
}
function setOrgListausSV() {
    const orgid = organisationConfig.getOrganisationCodes();
    return HTTPGET("", "getOrgListausSV", OH.ObjectHandlerOrgNames, "SV", orgid);
}
function setOrgListausEN() {
    const orgid = organisationConfig.getOrganisationCodes();
    return HTTPGET("", "getOrgListausEN", OH.ObjectHandlerOrgNames, "EN", orgid);
}

module.exports = {
HTTPGETshow: HTTPGETshow,
HTTPGET: HTTPGET
};