import { Justus } from "../models/Justus";
import { JulkaisuObject } from "../models/Julkaisu";
import { Tieteenala } from "../models/Tieteenala";
import { Taiteenala, Lisatieto } from "../models/Taiteenala";
import { Organisaatiotekija } from "../models/Organisaatiotekija";
import { FileData } from "../models/FileData";

class ValidatorService {

    async julkaisu(julkaisu: JulkaisuObject) {

        if (!julkaisu) {
            throw Error("Publication data missing");
        }
        if (!julkaisu.organisaatiotunnus ||
            !julkaisu.julkaisutyyppi ||
            !julkaisu.julkaisuvuosi ||
            !julkaisu.julkaisunnimi ||
            !julkaisu.tekijat ||
            !julkaisu.julkaisuntekijoidenlukumaara) {
            throw Error("Invalid publication data!");
        }
        // add date if missing
        if (!julkaisu.modified) {
            julkaisu.modified = new Date();
        }
        // this is organization specific field
        if (!julkaisu.ensimmainenkirjoittaja) {
            julkaisu.ensimmainenkirjoittaja = undefined;
        }
        if (julkaisu.julkaisumaksu) {
            julkaisu["julkaisumaksu"] = await this.validateJulkaisumaksu(julkaisu.julkaisumaksu);
        }
        else {
            julkaisu["julkaisumaksu"] = undefined;
            julkaisu["julkaisumaksuvuosi"] = undefined;
        }
        return julkaisu;
    }

    async organisaatiotekija(organisaatiotekija: Justus["organisaatiotekija"]) {

        if (!organisaatiotekija || organisaatiotekija.length < 1) {
            throw Error("Organisation authors missing!");
        }

        organisaatiotekija.forEach((val: Organisaatiotekija) => {
            if (!val.etunimet || !val.sukunimi) {
                throw Error("Invalid value in orgtekija");
            }
        });
    }

    async tieteenala(tieteenala: Justus["tieteenala"]) {

        if (!tieteenala || tieteenala.length < 1) {
            throw Error("Field of science missing!");
        }
        if (await this.hasDuplicates(tieteenala, "tieteenalakoodi")) {
            throw Error("Duplicate field of science");
        }
        tieteenala.forEach((val: Tieteenala, key) => {
            if (!val.tieteenalakoodi || !val.jnro) {
                throw Error("Invalid value in field of Science");
            }
            if (val.jnro !== key + 1) {
                throw Error("Invalid order number in field of science");
            }
        });

    }

    async taiteenala(taiteenala: Justus["taiteenala"]) {
        // can be missing
        if (taiteenala && taiteenala.length > 0) {
            if (await this.hasDuplicates(taiteenala, "taiteenalakoodi")) {
                throw Error("Duplicate field of art");
            }
            taiteenala.forEach((val: Taiteenala, key) => {
                if (!val.taiteenalakoodi || !val.jnro) {
                    throw Error("Invalid value in field of art");
                }
                if (val.jnro !== key + 1) {
                    throw Error("Invalid order number in field of art");
                }
            });
        }
    }

    async avainsanat(avainsanat: Justus["avainsanat"]) {
        // can be missing
        if (avainsanat && avainsanat.length > 0) {
            if (Array.isArray(avainsanat)) {
                avainsanat.forEach((val) => {
                    if (typeof val !== "string") {
                        throw Error("Invalid key word");
                    }
                });
            } else {
                throw Error("Invalid key word");
            }
        }
    }

    async tyyppikategoria(kategoriat: Justus["taidealantyyppikategoria"]) {
        if (kategoriat && kategoriat.length > 0) {
            if (Array.isArray(kategoriat)) {
                kategoriat.forEach((val) => {
                    console.log(typeof (val));
                    if (isNaN(val)) {
                        throw Error("Invalid field of art type category");
                    }
                });
            } else {
                throw Error("Invalid field of art type category");
            }

        }
    }

    async lisatieto(lisatieto: Lisatieto) {

        for (const k in lisatieto) {
            if (k !== "julkaisuvuodenlisatieto" && k !== "tapahtuma" && k !== "julkistamispaikkakunta" && k !== "muutunniste") {
                console.log("ei validi kenttä");
                throw Error("Invalid data!");
            }

        }
    //  TODO check for empty value
    }

    async fileData(fileData: FileData, file: any) {

        if (!file) {
            throw Error ("File is missing");
        }
        if (!fileData) {
            throw Error ("File data is missing");
        }
        if (!fileData.julkaisuid ||  !fileData.filename) {
            throw Error ("Id or filename is missing");
        }
    }

    async validateJulkaisumaksu(julkaisumaksu: any) {
        // first replace , with .
        const replaced = julkaisumaksu.replace(",", ".");
        return parseFloat(replaced);
    }

    async hasDuplicates(values: any, field: any) {
        const seen = new Set();
        return values.some(function (object: any) {
            return seen.size === seen.add(object[field]).size;
        });

    }
}

export const validate = new ValidatorService();