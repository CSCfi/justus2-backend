import { JulkaisuObject } from "./Julkaisu";
import { FileData } from "./FileData";
import { Organisaatiotekija } from "./Organisaatiotekija";
import { Tieteenala } from "./Tieteenala";
import { Lisatieto, Taiteenala } from "./Taiteenala";

export type Justus = {
    julkaisu: JulkaisuObject;
    organisaatiotekija: [Organisaatiotekija];
    tieteenala: [Tieteenala];
    taiteenala?: [Taiteenala];
    taidealantyyppikategoria?: number[];
    avainsanat?: string[];
    lisatieto?: Lisatieto;
    filedata?: FileData;
};