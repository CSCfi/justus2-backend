import { Request, Response, NextFunction, json } from "express";
import { resolve } from "path";

const schedule = require("node-schedule");
const https = require("https");
const axios = require("axios").default;

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

SetKoodistoDataToRedis();

// Scheduler for updating Koodistopalvelu data inside redis
// Each star represents a different value, beginning from second and ending in day
// So if we want to update it once a day at midnight we would use ("0 0 0 * * *")
schedule.scheduleJob("0 0 0 * * *", function() {
    UpdateKoodistopalveluRedis().then(() => {
        console.log("Scheduled koodisto update completed");
    });
});

// Interval timer for checking julkaisujono
if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "dev")  { 
    setInterval(() =>  ts.checkQueue(), 30000);
}


 async function SetKoodistoDataToRedis() {
    client.on("connect", async function () {
        console.log("Connected to redis");
         await UpdateKoodistopalveluRedis().then(() => {
             console.log("Koodisto data to redis updated");
         });
    });
}

async function UpdateKoodistopalveluRedis() {
    console.log("Updating koodisto data to redis");
    console.log(process.env.NODE_ENV);
    setAlaYksikot().then(() => {
        return setKielet();
    }).then(() => {
        return setJulkaisunTilat();
    }).then(() => {
        return setTaideAlanTyyppiKategoria();
    }).then(() => {
        return setTekijanRooli();
    }).then(() => {
        return setValtiot();
    }).then(() => {
        return setTaiteenalat();
    }).then(() => {
        return setTieteenalat();
    }).then(() => {
        return setJulkaisunLuokat();
    }).then(() => {
        return setOrgListaus();
    }).then(() => {
        resolve();
    });
}

// Used for apis where you need to combine multiple external api calls and set redis later
// when you have combined the data
function HTTPGETcombiner (URL: String, objecthandler: Function, lang: any ) {

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
            if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "dev")  { 
                console.log("Set info for " + objecthandler.name + " to redis successfully!");
           }         
        });
    })
    .on("error", (err: Error) => {
        console.log("Error: " + err.message);
    });
}


// Only finto and jufo services use this function, so no caller-id is needed
export async function httpBaseGet (URL: String, params?: object) {

    let responseArray;
    try {
        const promise = await axios.get(URL, { params });
        responseArray = promise.data;
    } catch (e) {
        console.log(e.message);
        throw Error;
    }
    return responseArray;

}

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
                second.push(JSON.parse(data));
                    combined.push(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)));
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
    }).catch((err: Error) => {
      console.log(err);
    });
}

function HTTPGET (URL: String, redisInfo: String, objecthandler: Function, lang?: any, orgid?: any) {
     return new Promise((resolve, reject) => {
        if (objecthandler.name === "ObjectHandlerOrgNames") {
            const proms: object [] = [];
            for (const i in orgid) {
                if (orgid[i].length > 5) {
                    if (orgid[i] === "02202669") {
                        proms.push(HTTPSUBGET("/tutkimusorganisaatio/koodi/tutkimusorganisaatio_" + "2202669"));
                    } else {
                        proms.push(HTTPSUBGET("/tutkimusorganisaatio/koodi/tutkimusorganisaatio_" + orgid[i]));
                    }
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
                if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "dev")  { 
                     console.log("Set info for " + redisInfo + " from Objecthandlers to redis successfully!");
                }        
                resolve();
            }).catch((err: any) => {
                console.log("Error: " + err);
                reject();
            });
        }
    }).catch((err: any) => {
       console.log(err);
     });
}

function setAlaYksikot() {
    return HTTPGET("/alayksikkokoodi/koodi?onlyValidKoodis=false", "getAlayksikot", OH.ObjectHandlerAlayksikot);
}

function setJulkaisunTilat() {
    return HTTPGET("/julkaisuntila/koodi?onlyValidKoodis=false", "getJulkaisunTilatFI", OH.ObjectHandlerJulkaisuntilat, "FI")
    .then(() => {
        return HTTPGET("/julkaisuntila/koodi?onlyValidKoodis=false", "getJulkaisunTilatEN", OH.ObjectHandlerJulkaisuntilat, "EN");
    }).then(() => {
        return HTTPGET("/julkaisuntila/koodi?onlyValidKoodis=false", "getJulkaisunTilatSV", OH.ObjectHandlerJulkaisuntilat, "SV");
    }).then(() => {
        resolve();
    });
}

function setKielet() {
    return HTTPGET("/kieli/koodi?onlyValidKoodis=false", "getKieletFI", OH.ObjectHandlerKielet, "FI")
    .then(() => {
        return HTTPGET("/kieli/koodi?onlyValidKoodis=false", "getKieletSV", OH.ObjectHandlerKielet, "SV");
    }).then(() => {
        return HTTPGET("/kieli/koodi?onlyValidKoodis=false", "getKieletEN", OH.ObjectHandlerKielet, "EN");
    }).then(() => {
        resolve();
    });
}

function setValtiot() {
    return HTTPGET("/maatjavaltiot2/koodi?onlyValidKoodis=false", "getValtiotFI", OH.ObjectHandlerValtiot, "FI")
    .then(() => {
        return HTTPGET("/maatjavaltiot2/koodi?onlyValidKoodis=false", "getValtiotSV", OH.ObjectHandlerValtiot, "SV");
    }).then(() => {
        return HTTPGET("/maatjavaltiot2/koodi?onlyValidKoodis=false", "getValtiotEN", OH.ObjectHandlerValtiot, "EN");
    }).then(() => {
        resolve();
    });
}

function setTaideAlanTyyppiKategoria() {
    return HTTPGET("/taidealantyyppikategoria/koodi?onlyValidKoodis=false", "getTaideAlanTyyppiKategoriaFI", OH.ObjectHandlerTaidealantyyppikategoria, "FI")
   .then(() => {
        return HTTPGET("/taidealantyyppikategoria/koodi?onlyValidKoodis=false", "getTaideAlanTyyppiKategoriaSV", OH.ObjectHandlerTaidealantyyppikategoria, "SV");
    }).then(() => {
        return HTTPGET("/taidealantyyppikategoria/koodi?onlyValidKoodis=false", "getTaideAlanTyyppiKategoriaEN", OH.ObjectHandlerTaidealantyyppikategoria, "EN");
    }).then(() => {
        resolve();
    });
 }

function setTaiteenalat() {
    return HTTPGET("/taiteenala/koodi?onlyValidKoodis=false", "getTaiteenalatFI", OH.ObjectHandlerTaiteenalat, "FI")
    .then(() => {
        return HTTPGET("/taiteenala/koodi?onlyValidKoodis=false", "getTaiteenalatSV", OH.ObjectHandlerTaiteenalat, "SV");
    }).then(() => {
        return HTTPGET("/taiteenala/koodi?onlyValidKoodis=false", "getTaiteenalatEN", OH.ObjectHandlerTaiteenalat, "EN");
    }).then(() => {
        resolve();
    });
}

function setTekijanRooli() {
    return HTTPGET("/julkaisuntekijanrooli/koodi?onlyValidKoodis=false", "getTekijanRooliFI", OH.ObjectHandlerRoolit, "FI")
    .then(() => {
        return HTTPGET("/julkaisuntekijanrooli/koodi?onlyValidKoodis=false", "getTekijanRooliSV", OH.ObjectHandlerRoolit, "SV");
    }).then(() => {
        return HTTPGET("/julkaisuntekijanrooli/koodi?onlyValidKoodis=false", "getTekijanRooliEN", OH.ObjectHandlerRoolit, "EN");
    }).then(() => {
        resolve();
    });
}

function setTieteenalat() {
    HTTPGETcombiner("/paatieteenala/koodi?onlyValidKoodis=false", OH.ObjectHandlerTieteenalat, "FI");
    HTTPGETcombiner("/paatieteenala/koodi?onlyValidKoodis=false", OH.ObjectHandlerTieteenalat, "SV");
    HTTPGETcombiner("/paatieteenala/koodi?onlyValidKoodis=false", OH.ObjectHandlerTieteenalat, "EN");
}

function setJulkaisunLuokat() {
    HTTPGETcombiner("/julkaisunpaaluokka/koodi?onlyValidKoodis=false", OH.ObjectHandlerJulkaisunluokat, "FI");
    HTTPGETcombiner("/julkaisunpaaluokka/koodi?onlyValidKoodis=false", OH.ObjectHandlerJulkaisunluokat, "EN");
    HTTPGETcombiner("/julkaisunpaaluokka/koodi?onlyValidKoodis=false", OH.ObjectHandlerJulkaisunluokat, "SV");
}

function setOrgListaus() {
    const orgid = organisationConfig.getOrganisationCodes();
    return HTTPGET("", "getOrgListausFI", OH.ObjectHandlerOrgNames, "FI", orgid)
    .then(() => {
        return HTTPGET("", "getOrgListausSV", OH.ObjectHandlerOrgNames, "SV", orgid);
    }).then(() => {
        return HTTPGET("", "getOrgListausEN", OH.ObjectHandlerOrgNames, "EN", orgid);
    }).then(() => {
        resolve();
    });
}

module.exports = {
HTTPGETshow: HTTPGETshow,
HTTPGET: HTTPGET
};