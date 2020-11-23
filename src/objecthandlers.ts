/*  Alot of theese ObjectHandlers will look identical but we are still using
    different ObjectHandlers for now, just incase we want to modify
    the JSON response its easier to have them in separate functions
*/

import { Request, Response, NextFunction } from "express";
import { UserObject } from "./models/User";

const https = require("https");
const redis = require("redis");
const client = redis.createClient();
const organisationConfig = require("./organization_config");
const domainMapping = organisationConfig.domainMappings;

const koodistoUrl = process.env.KOODISTO_URL;
const callerId = process.env.KOODISTO_CALLER_ID;

const theseusHandleLink = process.env.THESEUS_HANDLE_LINK;
const jukuriHandleLink = process.env.JUKURI_HANDLE_LINK;

const getRedis = (rediskey: string, success: any, error: any) => {
    client.mget(rediskey, function (err: Error, reply: any) {
        if (!err) {
            success(reply);
        }
        else {
            error(err);
        }
    });
};

function namechecker(name: any) {
    if (name == undefined) {
        return "";
    }
    else {
        return name.nimi;
    }
}

// Objecthandler for Koodistopalvelu kielet
function ObjectHandlerKielet(obj: any, lang: any): object[] {
    const kielet: object[] = [
    ];
    obj.forEach((e: any) => {
        const metadata = e.metadata.find( (e: any) => e.kieli === lang);
        const namecheck = metadata;
        const keyvalues = {
            arvo: e.koodiArvo,
            selite: namechecker(namecheck),
        };
        kielet.push(keyvalues);
        kielet.sort((a: any, b: any) => {
            const numA = a.arvo;
            const numB = b.arvo;
            if (numA < numB)
                return -1;
            if (numA > numB)
                return 1;
            return 0;
        });
    });
        return kielet;
}
// Objecthandler for Koodistopalvelu maat ja valtiot
function ObjectHandlerValtiot(obj: any, lang: any): object[] {
    const valtiot: object[] = [
    ];
    obj.forEach((e: any) => {
        const metadata = e.metadata.find( (e: any) => e.kieli === lang);
        const namecheck = metadata;
        const keyvalues = {
            arvo: e.koodiArvo,
            selite: namechecker(namecheck),
        };
        valtiot.push(keyvalues);
        valtiot.sort((a: any, b: any) => {
            const numA = parseInt(a.arvo);
            const numB = parseInt(b.arvo);
            if (numA < numB)
                return -1;
            if (numA > numB)
                return 1;
            return 0;
        });
    });
        return valtiot;
}
// Objecthandler for Koodistopalvelu roolit
function ObjectHandlerRoolit(obj: any, lang: any): object[] {
    const roolit: object[] = [
    ];
    obj.forEach((e: any) => {
        const metadata = e.metadata.find( (e: any) => e.kieli === lang);
        const namecheck = metadata;
        const keyvalues = {
            arvo: e.koodiArvo,
            selite: namechecker(namecheck),
        };
        roolit.push(keyvalues);
    });
        return roolit;
}
// Objecthandler for Koodistopalvelu taiteenalat
function ObjectHandlerTaiteenalat(obj: any, lang: any): object[] {
    const taiteenalat: object[] = [
    ];
    obj.forEach((e: any) => {
        const metadata = e.metadata.find( (e: any) => e.kieli === lang);
        const namecheck = metadata;
        const keyvalues = {
            arvo: e.koodiArvo,
            selite: namechecker(namecheck),
        };
        taiteenalat.push(keyvalues);
        taiteenalat.sort((a: any, b: any) => {
            const numA = a.arvo;
            const numB = b.arvo;
            if (numA < numB)
                return -1;
            if (numA > numB)
                return 1;
            return 0;
        });
    });
        return taiteenalat;
}
// Objecthandler for Koodistopalvelu taidealantyyppikategoriat
function ObjectHandlerTaidealantyyppikategoria(obj: any, lang: any): object[] {
    const taidealantyyppikategoria: object[] = [
    ];
    obj.forEach((e: any) => {
        const metadata = e.metadata.find( (e: any) => e.kieli === lang);
        const namecheck = metadata;
        const keyvalues = {
            arvo: e.koodiArvo,
            selite: namechecker(namecheck),
        };
        taidealantyyppikategoria.push(keyvalues);
        taidealantyyppikategoria.sort((a: any, b: any) => {
            const numA = parseInt(a.arvo);
            const numB = parseInt(b.arvo);
            if (numA < numB)
                return -1;
            if (numA > numB)
                return 1;
            return 0;
        });
    });
        return taidealantyyppikategoria;
}
// Objecthandler for Koodistopalvelu julkaisuntilat
function ObjectHandlerJulkaisuntilat(obj: any, lang: any): object[] {
    const julkaisuntilat: object[] = [
    ];
    obj.forEach((e: any) => {
        if ( (e.koodiArvo === "1" || e.koodiArvo === "-1" || e.koodiArvo === "2" || e.koodiArvo === "0" || e.koodiArvo === "3")) {
            const metadata = e.metadata.find(( e: any ) => e.kieli === lang);
            const keyvalues = {
                arvo: e.koodiArvo,
                selite: namechecker(metadata),
                kuvaus: metadata.kuvaus,
            };
            julkaisuntilat.push(keyvalues);
        }
    });
        return julkaisuntilat;
}


function httpgetCombiner(URL: String, callback: Function) {
    let data = "";
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
        resp.on("data", (chunk: any) => {
            data += chunk;
        });
        resp.on("end", () => {
            const newdata = JSON.parse(data);
            callback(newdata);
        });
    })
    .on("error", (err: Error) => {
        console.log("Error: " + err.message);
    });
}

// Objecthandler for Koodistopalvelu alayksikot
function ObjectHandlerAlayksikot(obj: any): object[] {
    const alayksikot: object[] = [
    ];
    obj.forEach((e: any) => {
            const metadata = e.metadata.find(( e: any ) => e.kieli === "FI");
            const keyvalues = {
                arvo: e.koodiArvo,
                selite: metadata.nimi,
            };
            alayksikot.push(keyvalues);
    });
        return alayksikot;
}

// Objecthandler for Koodistopalvelu tieteenalat
function ObjectHandlerTieteenalat(obj: any, lang: any) {
    const tieteenalat: object[] = [
    ];
    obj.forEach((e: any) => {
        const determinator = e.koodiArvo;
        const url: string = "/tieteenala/koodi?onlyValidKoodis=false";

        httpgetCombiner(url, parse);
        function parse(alatieteenalatRAW: object[]) {
            const alatieteenalat: object[] = [
            ];
            alatieteenalatRAW.forEach((e: any) => {
                const determinatormatch = e.koodiArvo[0];
                if ( determinator === determinatormatch ) {
                const metadata = e.metadata.find((e: any) => e.kieli === lang);
                const al_keyvalues = {
                    arvo: e.koodiArvo,
                    selite: metadata.nimi,
                };
                alatieteenalat.push(al_keyvalues);
                alatieteenalat.sort((a: any, b: any) => {
                    const numA = a.arvo;
                    const numB = b.arvo;
                    if (numA < numB)
                        return -1;
                    if (numA > numB)
                        return 1;
                    return 0;
                });
            }});
            combine(alatieteenalat);
        }
        function combine(alatieteenalat: object[]) {
        const metadata2 = e.metadata.find( (e: any) => e.kieli === lang);
        const keyvalues = {
            arvo: e.koodiArvo,
            selite: metadata2.nimi,
            alatyypit: alatieteenalat,
        };
        tieteenalat.push(keyvalues);
        tieteenalat.sort((a: any, b: any) => {
            const numA = a.arvo;
            const numB = b.arvo;
            if (numA < numB)
                return -1;
            if (numA > numB)
                return 1;
            return 0;
        });
        const redisKey = "getTieteenalat" + lang;
        settoRedis(redisKey, tieteenalat);
    }
});
        return tieteenalat;
}


// Objecthandler for Koodistopalvelu taidealantyyppikategoriat
function ObjectHandlerJulkaisunluokat(obj: any, lang: any) {
    const julkaisunluokat: object[] = [
    ];

    obj.forEach((e: any) => {
        const spec = e.koodiArvo.toLowerCase();
        const url: string =  "/relaatio/sisaltyy-alakoodit/julkaisunpaaluokka_" + spec;
        httpgetCombiner(url, parse);
        function parse(alaluokatRAW: object[]) {
            const alaluokat: object[] = [
            ];
            alaluokatRAW.forEach((e: any) => {
                const metadata = e.metadata.find((e: any) => e.kieli === lang);
                const al_keyvalues = {
                    arvo: e.koodiArvo,
                    selite: metadata.nimi,
                    kuvaus: metadata.kuvaus,
                };
                alaluokat.push(al_keyvalues);
                alaluokat.sort((a: any, b: any) => {
                    const numA = a.arvo[1];
                    const numB = b.arvo[1];
                    if (numA < numB)
                        return -1;
                    if (numA > numB)
                        return 1;
                    return 0;
                });
            });
            combine(alaluokat);
        }
        function combine(alaluokat: object[]) {
        const metadata2 = e.metadata.find( (e: any) => e.kieli === lang);
        const keyvalues = {
            arvo: e.koodiArvo,
            selite: metadata2.nimi,
            alatyypit: alaluokat,
        };
        julkaisunluokat.push(keyvalues);
        julkaisunluokat.sort((a: any, b: any) => {
            const nameA = a.arvo;
            const nameB = b.arvo;
            if (nameA < nameB)
                return -1;
            if (nameA > nameB)
                return 1;
            return 0;
        });
        const redisKey = "getJulkaisunLuokat" + lang;
        settoRedis(redisKey, julkaisunluokat);
    }
});
        return julkaisunluokat;


}

function settoRedis(rediskey: string, obj: object[]) {
    client.set(rediskey, JSON.stringify(obj));
    if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "dev")  { 
        console.log("Set info for " + rediskey + " from ObjectHandlers to redis successfully!");
    }
}

// Objecthandler for Avainsanat from FINTO
function ObjectHandlerAvainsanat(obj: any): object[] {
    const avainsanat: object [] = [];
        if (obj instanceof Array) {
            obj.forEach((e: any) => {
                e[0].results.forEach((x: any ) => {
                    const vals = {
                        localname: x.localname,
                        prefLabel: x.prefLabel,
                        altLabel: x.altLabel,
                    };
                    avainsanat.push(vals);
                });
            });
            return Object.values( avainsanat.reduce( ( acc: any, cur: any ) => Object.assign( acc, { [ cur.prefLabel ]: cur }), {} ));
        }
        else {
            return obj.results.map((e: any) => {
                return {
                    localname: e.localname,
                    prefLabel: e.prefLabel,
                    altLabel: e.altLabel,
                };
             });
        }
    }

// Objecthandler for Julkaisusarjat from JUFO
function ObjectHandlerJulkaisusarjat(obj: any, query: any): object[] {

    const julkaisusarjat: object [] = [
    ];

    if (obj instanceof Array) {
        obj.forEach((e: any)  => {
            const values = {
                Jufo_ID: e.Jufo_ID,
                Name: e.Name,
                Type: e.Type,
            };
            julkaisusarjat.push(values);
        });

        const tempArray: any = [];
        julkaisusarjat.forEach((e: any) => {
            if (query.toLowerCase() === e.Name.toLowerCase()) {
                tempArray.push(e);
                julkaisusarjat.splice(julkaisusarjat.indexOf(e), 1);
            }
        });

        for (let i = 0; i < tempArray.length; i++) {
            julkaisusarjat.unshift(tempArray[i]);
        }
        return julkaisusarjat.slice(0, 20);
    }
    else {
        return obj;
    }
}

// Objecthandler for Konferenssinnimet from FINTO
function ObjectHandlerKustantajat(obj: any): object[] {
    const Konferenssinnimet: object [] = [
    ];
    if (obj instanceof Array) {
    obj.forEach((e: any)  => {
        const values = {
            Jufo_ID: e.Jufo_ID,
            Name: e.Name,
            Type: e.Type,
        };
        Konferenssinnimet.push(values);
    });
    return Konferenssinnimet;
    }
    else {
        return obj;
    }
}

// Objecthandler for Konferenssinnimet from FINTO
function ObjectHandlerKonferenssinnimet(obj: any): object[] {
    const Konferenssinnimet: object [] = [
    ];
    if (obj instanceof Array) {
    obj.forEach((e: any)  => {
        const values = {
            Jufo_ID: e.Jufo_ID,
            Name: e.Name,
            Type: e.Type,
        };
        Konferenssinnimet.push(values);
    });
    return Konferenssinnimet;
    }
    else {
        return obj;
    }
}

// Objecthandler for Konferenssinnimet from FINTO
function ObjectHandlerJufoID(obj: any): object[] {
    const jufotiedot: object [] = [
    ];
    if (obj instanceof Array) {
    obj.forEach((e: any)  => {
        const values = {
            Jufo_2015: e.Jufo_2015,
            Abbreviation: e.Abbreviation,
            SJR_SJR: e.SJR_SJR,
            Other_Title: e.Other_Title,
            ModifiedAt: e.ModifiedAt,
            Continues: e.Continues,
            ISBN: e.ISBN,
            Professional: e.Professional,
            Denmark_Level: e.Denmark_Level,
            Active_Binary: e.Active_Binary,
            Field: e.Field,
            SNIP: e.SNIP,
            Name: e.Name,
            Website: e.Website,
            ISSN1: e.ISSN1,
            ISSNL: e.ISSNL,
            Grounds_Removal: e.Grounds_Removal,
            Jufo_ID: e.Jufo_ID,
            Year_End: e.Year_End,
            Publisher: e.Publisher,
            Scientific: e.Scientific,
            Language: e.Language,
            Jufo_2012: e.Jufo_2012,
            Continued_by: e.Continued_by,
            Jufo_2014: e.Jufo_2014,
            Type: e.Type,
            Title_Details: e.Title_Details,
            Norway_Level: e.Norway_Level,
            Sherpa_Romeo_Code: e.Sherpa_Romeo_Code,
            Substitutive_Channel: e.Substitutive_Channel,
            Year_Start: e.Year_Start,
            DOAJ_Index: e.DOAJ_Index,
            Fields: e.Fields,
            Country: e.Country,
            Jufo_history: e.Jufo_history,
            CreatedAt: e.CreatedAt,
            Active: e.Active,
            IPP: e.IPP,
            Level: e.Level,
            Subfield: e.Subfield,
            ISSN2: e.ISSN2,
            Jufo_2013: e.Jufo_2013,

        };
        jufotiedot.push(values);
    });
    return jufotiedot;
    }
    else {
        return obj;
    }
}
// Objecthandler for Jufo ISSN
function ObjectHandlerJufoISSN(obj: any): object[] {
    const tiedotbyissn: object [] = [
    ];
    if (obj instanceof Array) {
    obj.forEach((e: any)  => {
        const values = {
            Jufo_ID: e.Jufo_ID,
            Name: e.Name,
            Type: e.Type,
        };
        tiedotbyissn.push(values);
    });
    return tiedotbyissn;
    }
    else {
        return obj;
    }
}

// Nullchecker for julkaisutvirtaCR, used to check if authors exists
function nullchecker(doesauthorexist: any) {
    if (doesauthorexist == undefined) {
        return "";
    }
    else {
        return doesauthorexist.map((s: any) => s.given + " " + s.family);
    }
}

function getrediscallback(key: string, callbacker: Function) {
    getRedis(key, function success(reply: string) {
        let newdata = undefined;
        try {
            newdata = JSON.parse(reply);
        } catch (err) {
            newdata = [];
        }
        callbacker(newdata);
    }, function error(err: Error) {
        console.log("Something went wrong" + err);
    });
}

function ObjectHandlerOrgNames(obj: any, orgid: any, lang: any) {

    const names: any  = [];
    const codesAndNames: any = [];

    if (lang === "FI") {
        obj.forEach((value: any) => {
            const checkIfFiExists = (o: any) => o.kieli === "FI";
            const fi = value.metadata.some(checkIfFiExists);
            if (fi) {
                for (let i = 0; i < value.metadata.length; i++) {
                    if (value.metadata[i].kieli === lang) {
                        names.push(value.metadata[i].nimi);
                        codesAndNames.push({"arvo": value.koodiArvo, "value": value.metadata[i].nimi });

                    }
                }
            } else {
                for (let i = 0; i < value.metadata.length; i++) {
                    if (value.metadata[i].kieli === "SV") {
                        names.push(value.metadata[i].nimi);
                        codesAndNames.push({"arvo": value.koodiArvo, "value": value.metadata[i].nimi });
                    }
                }
            }
        });
    }
    if (lang === "SV") {
        obj.forEach((value: any) => {
            const checkIfFiExists = (o: any) => o.kieli === "SV";
            const sv = value.metadata.some(checkIfFiExists);
            if (sv) {
                for (let i = 0; i < value.metadata.length; i++) {
                    if (value.metadata[i].kieli === lang) {
                        names.push(value.metadata[i].nimi);
                        codesAndNames.push({"arvo": value.koodiArvo, "value": value.metadata[i].nimi });
                    }
                }
            } else {
                for (let i = 0; i < value.metadata.length; i++) {
                    if (value.metadata[i].kieli === "FI") {
                        names.push(value.metadata[i].nimi);
                        codesAndNames.push({"arvo": value.koodiArvo, "value": value.metadata[i].nimi });
                    }
                }
            }

        });
    }
    if (lang === "EN") {
        obj.forEach((value: any) => {
            const checkIfEnExists = (o: any) => o.kieli === "EN";
            const en = value.metadata.some(checkIfEnExists);
            if (en) {
                for (let i = 0; i < value.metadata.length; i++) {
                    if (value.metadata[i].kieli === lang) {
                        names.push(value.metadata[i].nimi);
                        codesAndNames.push({"arvo": value.koodiArvo, "value": value.metadata[i].nimi });
                    }
                }
            } else {
                for (let i = 0; i < value.metadata.length; i++) {
                    if (value.metadata[i].kieli === "FI") {
                        names.push(value.metadata[i].nimi);
                        codesAndNames.push({"arvo": value.koodiArvo, "value": value.metadata[i].nimi });
                    }
                }
            }

        });
    }

    names.sort();

    // sort by organization code
    // codesAndNames.sort(function(x: any, y: any) {
    //     console.log(x.value);
    //     return x.value - y.value;
    // } );

    // sort by name
    codesAndNames.sort(function( a: any, b: any ) {
        const nameA = a.value.toUpperCase();
        const nameB = b.value.toUpperCase();
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }
        // names must be equal
        return 0;
    });

    settoRedis("organizationCodes" + lang, codesAndNames);
    settoRedis("getOrgNames" + lang, names);
}

function ObjectHandlerJulkaisudata(obj: any, allData: boolean) {
    return obj.map((x: any) => {

        const data: any = {};
        let julkaisu: any = {};

        if (!allData) {
            julkaisu = {
                id: x.id,
                organisaatiotunnus: x.organisaatiotunnus,
                julkaisuvuosi: x.julkaisuvuosi,
                julkaisunnimi: x.julkaisunnimi,
                tekijat: x.tekijat,
                julkaisuntila: x.julkaisuntila,
                username: x.username,
                modified: x.modified
            };
        } else {
            julkaisu = {
                id: x.id,
                organisaatiotunnus: x.organisaatiotunnus,
                julkaisutyyppi: x.julkaisutyyppi,
                julkaisuvuosi: x.julkaisuvuosi,
                julkaisunnimi: x.julkaisunnimi,
                tekijat: x.tekijat,
                julkaisuntekijoidenlukumaara: x.julkaisuntekijoidenlukumaara,
                konferenssinvakiintunutnimi: x.konferenssinvakiintunutnimi,
                emojulkaisunnimi: x.emojulkaisunnimi,
                emojulkaisuntoimittajat: x.emojulkaisuntoimittajat,
                lehdenjulkaisusarjannimi: x.lehdenjulkaisusarjannimi,
                volyymi: x.volyymi,
                numero: x.numero,
                sivut: x.sivut,
                artikkelinumero: x.artikkelinumero,
                kustantaja: x.kustantaja,
                julkaisunkustannuspaikka: x.julkaisunkustannuspaikka,
                julkaisunkieli: x.julkaisunkieli,
                julkaisunkansainvalisyys: x.julkaisunkansainvalisyys,
                julkaisumaa: x.julkaisumaa,
                kansainvalinenyhteisjulkaisu: x.kansainvalinenyhteisjulkaisu,
                yhteisjulkaisuyrityksenkanssa: x.yhteisjulkaisuyrityksenkanssa,
                doitunniste: x.doitunniste,
                pysyvaverkkoosoite: x.pysyvaverkkoosoite,
                avoinsaatavuus: x.avoinsaatavuus,
                julkaisurinnakkaistallennettu: x.julkaisurinnakkaistallennettu,
                rinnakkaistallennetunversionverkkoosoite: x.rinnakkaistallennetunversionverkkoosoite,
                jufotunnus: x.jufotunnus,
                jufoluokitus: x.jufoluokitus,
                julkaisuntila: x.julkaisuntila,
                username: x.username,
                modified: x.modified,
                lisatieto: x.lisatieto
            };
        }

        if (x.handle && x.aid) {
            const isJukuri = isJukuriPublication(x.organisaatiotunnus);
            data["julkaisu"] = julkaisu;
            if (isJukuri) {
                data["filedata"] = { "handle":  jukuriHandleLink +  x.handle };
            } else {
                data["filedata"] = { "handle":  theseusHandleLink +  x.handle };
            }
            return data;
        } else if (x.aid) {
            data["julkaisu"] = julkaisu;
            data["filedata"] = { "handle":  "" };
            return data;
        } else {
            data["julkaisu"] = julkaisu;
            return data;
        }

    });
}

    function  mapOrganisaatiotekijaAndAlayksikko(obj: any) {

        for (let i = 0; i < obj.length; i++) {
            if (typeof obj[i].alayksikko === "undefined") {
                obj[i].alayksikko = [];
            }
            for (let j = 0; j < obj[i].tempalayksikko.length; j++) {
                obj[i].alayksikko.push(obj[i].tempalayksikko[j].alayksikko);
            }

            if (obj[i].tempalayksikko.length < 1) {
                obj[i].alayksikko.push("");
            }

            delete obj[i].tempalayksikko;
        }
        return obj;
    }


    function mapTaideAlanTyyppikategoria(obj: any) {

        if (obj.length < 1) return;
        const tyyppikategoriat: any = [];

        for (let i = 0; i < obj.length; i++) {
            tyyppikategoriat.push(obj[i].tyyppikategoria);
        }
      return tyyppikategoriat;
    }

    function mapLisatietoData(obj: any) {

        const lisatietoObj: any = {};
        if (obj.length < 1) return;

        for (let i = 0; i < obj.length; i++) {
            lisatietoObj[obj[i].lisatietotyyppi] = obj[i].lisatietoteksti;
        }
        return lisatietoObj;
    }

    function mapAvainsanat(obj: any) {

        if (obj.length < 1) return;

        const avainsanaObj: any =  [];

        for (let i = 0; i < obj.length; i++) {
            avainsanaObj.push(obj[i].avainsana);
        }
        return avainsanaObj;
    }

    function checkIfEmpty(obj: any) {
        if (obj.length < 1) {
            return;
        } else {
            return obj;
        }
    }

    function mapIssnAndIsbn (identifier: any, obj: any) {
    const ret = [];
        if (obj.length < 2)  {
            ret.push(obj[0][identifier]);
        } else {
            for (let i = 0; i < obj.length; i ++) {
                ret.push(obj[i][identifier]);
            }
        }
        return ret;
    }

function ObjectHandlerUser(perustiedot: any, lang: any, callback: any) {
    const org = perustiedot.organisaatio;
    getrediscallback("organizationCodes" + lang, addorgname);
    function addorgname(reply: any) {
        reply.forEach((s: any) =>  {
            if (s.arvo === org) {
                const orgname = s.value;
                perustiedot.organisaationimi = orgname;
            }
        });
    getrediscallback("getAlayksikot", getdata);
        function getdata(reply: any) {
            const alayksikot: object [] = [
            ];
                alayksikot.push(reply);
                parsealayksikot(alayksikot, org, callback);

}
    function parsealayksikot(obj: any, orgid: any, callbacker: any) {
        const yarray: object [] = [];
        const y2017: object [] = [];
        const y2016: object [] = [];
        const y2018: object [] = [];
        const y2019: object [] = [];
        const y2020: object [] = [];

        const twotwenty = {
            vuosi: "2020",
            yksikot: y2020,
        };
        const twonine = {
            vuosi: "2019",
            yksikot: y2019,
        };
        const twoeight = {
            vuosi: "2018",
            yksikot: y2018,
        };
        const twoseven = {
            vuosi: "2017",
            yksikot: y2017
        };
        const twosix = {
            vuosi: "2016",
            yksikot: y2016
        };
         obj.map((s: any) => {
            s.map((x: any) => {
                const match = x.arvo.slice(0, x.arvo.indexOf("-"));
                const year = x.arvo.split("-")[1].split("-")[0];
                if (orgid === match && year === "2017") {
                    const y27 = {
                        arvo: x.arvo,
                        selite: x.selite,
                    };
                    y2017.push(y27);

                }
                else if (orgid === match && year === "2018") {
                    const y28 = {
                        arvo: x.arvo,
                        selite: x.selite,
                    };
                    y2018.push(y28);
                }
                else if (orgid === match && year === "2019") {
                    const y29 = {
                        arvo: x.arvo,
                        selite: x.selite,
                    };
                    y2019.push(y29);
                }
                else if (orgid === match && year === "2020") {
                    const y20 = {
                        arvo: x.arvo,
                        selite: x.selite,
                    };
                    y2020.push(y20);
                }
                else if (orgid === match && year != "2017" && year != "2018") {
                    const y26 = {
                        arvo: x.arvo,
                        selite: x.selite,
                    };
                    y2016.push(y26);
                }
            });
        });

        let visibleFields = JSON.parse(JSON.stringify(organisationConfig.commonVisibleFields));
        let requiredFields = JSON.parse(JSON.stringify(organisationConfig.commonRequiredFields));

        Object.keys(domainMapping).forEach(function (val, key) {
            if (domainMapping[key].code === org) {
                if (domainMapping[key].visibleFields) {
                    visibleFields = visibleFields.concat(domainMapping[key].visibleFields);
                }

                if (domainMapping[key].requiredFields) {
                    requiredFields = requiredFields.concat(domainMapping[key].requiredFields);
                }

                if (domainMapping[key].theseusData) {
                    perustiedot.showPublicationInput = true;
                } else if (domainMapping[key].jukuriData) {
                    perustiedot.showPublicationInput = true;
                    perustiedot.jukuriUser = true;
                } else {
                    perustiedot.showPublicationInput = false;
                }

            }
        });

        twosix.yksikot.sort(compare);
        twoseven.yksikot.sort(compare);
        twoeight.yksikot.sort(compare);
        twonine.yksikot.sort(compare);
        twotwenty.yksikot.sort(compare);

        yarray.push(twotwenty);
        yarray.push(twonine);
        yarray.push(twoeight);
        yarray.push(twoseven);
        yarray.push(twosix);

        if (y2016.length || y2017.length || y2018.length || y2019.length || y2020.length) {
                  visibleFields.push("alayksikko");
              const orgall: UserObject =  {
                perustiedot,
                alayksikot: yarray,
                visibleFields,
                requiredFields
              };
              callbacker(orgall);

            }
            else {
                const orgallx: UserObject = {
                    perustiedot,
                    alayksikot: yarray,
                    visibleFields,
                    requiredFields
                  };
                  callbacker(orgallx);
            }
        }
    }

}

function compare(a: any, b: any) {
    if ( a.selite < b.selite ) {
        return -1;
    }
    if ( a.selite > b.selite ) {
        return 1;
    }
    return 0;
}




function isJukuriPublication(orgTunnus: any) {
    let jukuriPublication: boolean = false;
    const orgnizationValues = domainMapping.find((x: any) => x.code === orgTunnus);

    if (orgnizationValues.jukuriData) {
        jukuriPublication = true;
    } else {
        jukuriPublication = false;
    }

    return jukuriPublication;
}




module.exports = {
    ObjectHandlerKielet: ObjectHandlerKielet,
    ObjectHandlerValtiot: ObjectHandlerValtiot,
    ObjectHandlerRoolit: ObjectHandlerRoolit,
    ObjectHandlerTaiteenalat: ObjectHandlerTaiteenalat,
    ObjectHandlerTieteenalat: ObjectHandlerTieteenalat,
    ObjectHandlerTaidealantyyppikategoria: ObjectHandlerTaidealantyyppikategoria,
    ObjectHandlerJulkaisuntilat: ObjectHandlerJulkaisuntilat,
    ObjectHandlerJulkaisunluokat: ObjectHandlerJulkaisunluokat,
    ObjectHandlerAlayksikot: ObjectHandlerAlayksikot,
    ObjectHandlerAvainsanat: ObjectHandlerAvainsanat,
    ObjectHandlerJulkaisusarjat: ObjectHandlerJulkaisusarjat,
    ObjectHandlerKonferenssinnimet: ObjectHandlerKonferenssinnimet,
    ObjectHandlerKustantajat: ObjectHandlerKustantajat,
    ObjectHandlerJufoID: ObjectHandlerJufoID,
    ObjectHandlerJufoISSN: ObjectHandlerJufoISSN,
    ObjectHandlerJulkaisudata: ObjectHandlerJulkaisudata,
    ObjectHandlerUser: ObjectHandlerUser,
    ObjectHandlerOrgNames: ObjectHandlerOrgNames,
    mapTaideAlanTyyppikategoria: mapTaideAlanTyyppikategoria,
    mapLisatietoData: mapLisatietoData,
    mapAvainsanat: mapAvainsanat,
    mapIssnAndIsbn: mapIssnAndIsbn,
    checkIfEmpty: checkIfEmpty,
    mapOrganisaatiotekijaAndAlayksikko: mapOrganisaatiotekijaAndAlayksikko,
    isJukuriPublication: isJukuriPublication
};