import { Justus } from "../types/Justus";
import { JulkaisuObject } from "../types/Julkaisu";
import { Tieteenala } from "../types/Tieteenala";
import { Taiteenala, Lisatieto } from "../types/Taiteenala";
import { Organisaatiotekija } from "../types/Organisaatiotekija";
import { FileData } from "../types/FileData";

class ValidatorService {

    julkaisu = async (julkaisu: JulkaisuObject) => {

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

    organisaatiotekija = async (organisaatiotekija: Justus["organisaatiotekija"]) => {

        if (!organisaatiotekija || organisaatiotekija.length < 1) {
            throw Error("Organisation authors missing!");
        }

        organisaatiotekija.forEach((val: Organisaatiotekija) => {
            if (!val.etunimet || !val.sukunimi) {
                throw Error("Invalid value in orgtekija");
            }
        });
    }

    tieteenala = async (tieteenala: Justus["tieteenala"]) => {

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

    taiteenala = async (taiteenala: Justus["taiteenala"]) => {
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

    avainsanat = async (avainsanat: Justus["avainsanat"]) => {
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

    tyyppikategoria = async (kategoriat: Justus["taidealantyyppikategoria"]) => {
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

    lisatieto = async (lisatieto: Lisatieto) => {

        for (const k in lisatieto) {
            if (k !== "julkaisuvuodenlisatieto" && k !== "tapahtuma" && k !== "julkistamispaikkakunta" && k !== "muutunniste") {
                throw Error("Invalid data!");
            }

        }
    //  TODO check for empty value
    }

    fileData = async (fileData: FileData, file: any) => {

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

    validateJulkaisumaksu = async (julkaisumaksu: any) => {
        // first replace , with .
        const replaced = julkaisumaksu.replace(",", ".");
        return parseFloat(replaced);
    }

    hasDuplicates = async (values: any, field: any) => {
        const seen = new Set();
        return values.some(function (object: any) {
            return seen.size === seen.add(object[field]).size;
        });

    }
}

export const validate = new ValidatorService();