import { Request, Response, NextFunction } from "express";

const https = require("https");

// Redis client
const redis = require("redis");
const client = redis.createClient();

// Prefix for objecthandler import
const OH = require("../objecthandlers");

const koodistoUrl = process.env.KOODISTO_URL;
const callerId = process.env.KOODISTO_CALLER_ID;
const organisationConfig = require("../config/organization_config");


class KoodistoServiceRequests {

    private languageOptions = ["FI", "SV", "EN"];

    setKoodistoDataToRedis = () => {
        const self = this;
        client.on("connect", async function () {
            console.log("Connected to redis");
            try {
                await self.updateKoodistopalveluRedis();
                console.log("Koodisto data to redis updated");
            } catch (e) {
                console.log(e);
            }
        });
    }

    updateKoodistopalveluRedis = async () => {
        await this.setAlaYksikot();
        await this.setKielet();
        await this.setJulkaisunTilat();
        await this.setTaideAlanTyyppiKategoria();
        await this.setTekijanRooli();
        await this.setValtiot();
        await this.setTaiteenalat();
        await this.setTieteenalat();
        await this.setJulkaisunLuokat();
        await this.setOrgListaus();
    }

// Used for apis where you need to combine multiple external api calls and set redis later
// when you have combined the data
    httpGetCombiner = (URL: String, objecthandler: Function, lang: any) => {

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
                if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "dev") {
                    console.log("Set info for " + objecthandler.name + " to redis successfully!");
                }
            });
        })
            .on("error", (err: Error) => {
                console.log("Error: " + err.message);
            });
    }


    httpSubGet = (URL: String) => {
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
            https.get(options, (resp: any) => {
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

    httpGet = (URL: String, redisInfo: String, objecthandler: Function, lang?: any, orgid?: any) => {
        return new Promise((resolve, reject) => {
            if (objecthandler.name === "ObjectHandlerOrgNames") {
                const proms: object [] = [];
                for (const i in orgid) {
                    if (orgid[i].length > 5) {
                        if (orgid[i] === "02202669") {
                            proms.push(this.httpSubGet("/tutkimusorganisaatio/koodi/tutkimusorganisaatio_" + "2202669"));
                        } else {
                            proms.push(this.httpSubGet("/tutkimusorganisaatio/koodi/tutkimusorganisaatio_" + orgid[i]));
                        }
                    } else {
                        proms.push(this.httpSubGet("/oppilaitosnumero/koodi/oppilaitosnumero_" + orgid[i]));
                    }
                }
                Promise.all(proms).then((values: object []) => {
                    const list: object [] = [];
                    for (const j in values) {
                        try {
                            list.push(JSON.parse(String(values[j])));
                        } catch (err) {
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
            } else {
                this.httpSubGet(URL).then((data) => {
                    const newdata = JSON.parse(String(data));
                    client.set(redisInfo, JSON.stringify(objecthandler(newdata, lang)));
                    if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "dev") {
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

    setAlaYksikot = async () => {
        await this.httpGet("/alayksikkokoodi/koodi?onlyValidKoodis=false", "getAlayksikot", OH.ObjectHandlerAlayksikot);
    }

    setJulkaisunTilat = async () => {
        for (const lang of this.languageOptions) {
            const redisInfo = "getJulkaisunTilat" + lang;
            await this.httpGet("/julkaisuntila/koodi?onlyValidKoodis=false", redisInfo, OH.ObjectHandlerJulkaisuntilat, lang);
        }
    }

    setKielet = async () => {
        for (const lang of this.languageOptions) {
            const redisInfo = "getKielet" + lang;
            await this.httpGet("/kieli/koodi?onlyValidKoodis=false", redisInfo, OH.ObjectHandlerKielet, lang);
        }
    }

    setValtiot = async () => {
        for (const lang of this.languageOptions) {
            const redisInfo = "getValtiot" + lang;
            await this.httpGet("/maatjavaltiot2/koodi?onlyValidKoodis=false", redisInfo, OH.ObjectHandlerValtiot, lang);
        }
    }

    setTaideAlanTyyppiKategoria = async () => {
        for (const lang of this.languageOptions) {
            const redisInfo = "getTaideAlanTyyppiKategoria" + lang;
            await this.httpGet("/taidealantyyppikategoria/koodi?onlyValidKoodis=false", redisInfo, OH.ObjectHandlerTaidealantyyppikategoria, lang);
        }
    }

    setTaiteenalat = async () => {
        for (const lang of this.languageOptions) {
            const redisInfo = "getTaiteenalat" + lang;
            await this.httpGet("/taiteenala/koodi?onlyValidKoodis=false", redisInfo, OH.ObjectHandlerTaiteenalat, lang);
        }
    }

    setTekijanRooli = async () => {
        for (const lang of this.languageOptions) {
            const redisInfo = "getTekijanRooli" + lang;
            await this.httpGet("/julkaisuntekijanrooli/koodi?onlyValidKoodis=false", redisInfo, OH.ObjectHandlerRoolit, lang);
        }
    }

    setTieteenalat = async () => {
        for (const lang of this.languageOptions) {
            this.httpGetCombiner("/paatieteenala/koodi?onlyValidKoodis=false", OH.ObjectHandlerTieteenalat, lang);
        }
    }

    setJulkaisunLuokat = async () => {
        for (const lang of this.languageOptions) {
            this.httpGetCombiner("/julkaisunpaaluokka/koodi?onlyValidKoodis=false", OH.ObjectHandlerJulkaisunluokat, lang);
        }
    }

    setOrgListaus = async () => {
        const orgId = organisationConfig.getOrganisationCodes();

        for (const lang of this.languageOptions) {
            const redisInfo = "getOrgListaus" + lang;
            await this.httpGet("", redisInfo, OH.ObjectHandlerOrgNames, "FI", orgId);
        }
    }

}

export const koodistoServiceRequests = new KoodistoServiceRequests();
