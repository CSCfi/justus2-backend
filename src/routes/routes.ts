import { Router } from "express";
const router: Router = Router();

import * as userController from "../controllers/user";
import * as julkaisuController from "../controllers/julkaisu";
import * as personController from "../controllers/person";
import * as externalController from "../controllers/externalServices";
import *  as julkaisuFile from "../controllers/julkaisuFile";
import * as personFile from "../controllers/personFile";
import * as koodistoController from "../controllers/koodistoService";

// Define the routes here, all will have the prexix /api/ as per the proxypass in the apache settings

// User related requests
router.get("/user", userController.getUser);
router.post("/language", userController.postLanguage);
router.post("/logout", userController.logout);
router.post("/impersonate", userController.impersonateUser);

// Julkaisu GET requests
router.get("/julkaisut/lista/all", julkaisuController.getJulkaisut);
router.get("/julkaisut/lista/:organisaatiotunnus?", julkaisuController.getJulkaisutmin);
router.get("/julkaisut/haku/:organisaatiotunnus?", julkaisuController.getJulkaisutHaku);
router.get("/julkaisut/tiedot/:id", julkaisuController.getAllPublicationDataById);
router.get("/julkaisu/download/:id", julkaisuFile.downloadJulkaisu);

// Julkaisu POST requests
router.post("/julkaisu", julkaisuController.postJulkaisu);
router.post("/julkaisu/upload", julkaisuFile.uploadJulkaisu);

// Julkaisu PUT requests
router.put("/julkaisu/:id", julkaisuController.updateJulkaisu);
router.put("/julkaisuntila/:id", julkaisuController.putJulkaisuntila);

// Julkaisu DELETE requests
router.delete("/julkaisu/poista/:id", julkaisuFile.deleteJulkaisu);

// GET requests to external services (Finto, Jufo, Virta, Crossref)
router.get("/haku/avainsanat", externalController.getAvainSanat);
router.get("/haku/julkaisusarjat", externalController.getJulkaisuSarjat);
router.get("/haku/konferenssinnimet", externalController.getKonferenssinimet);
router.get("/haku/kustantajat", externalController.getKustantajat);
router.get("/haku/jufo/:id", externalController.getJufo);
router.get("/haku/jufot", externalController.getJufotISSN);
router.get("/haku/julkaisut", externalController.getJulkaisutVirtaCrossrefLista);
router.get("/haku/julkaisu", externalController.getJulkaisuVirtaCrossrefEsitaytto);
router.get("/haku/urntunnus", externalController.getUrn);

// GET requests to koodistopalvelu data
router.get("/organisaatiolistaus", koodistoController.getOrganisaatioListaus);
router.get("/public/organisaationimet", koodistoController.getOrganisaatioNames);
router.get("/haku/julkaisunluokat", koodistoController.getJulkaisunLuokat);
router.get("/haku/julkaisuntilat", koodistoController.getJulkaisunTilat);
router.get("/haku/tekijanrooli", koodistoController.getTekijanRooli);
router.get("/haku/kielet", koodistoController.getKielet);
router.get("/haku/valtiot", koodistoController.getValtiot);
router.get("/haku/taidealantyyppikategoria", koodistoController.getTaideAlanTyyppiKategoria);
router.get("/haku/taiteenalat", koodistoController.getTaiteenalat);
router.get("/haku/tieteenalat", koodistoController.getTieteenalat);
router.get("/haku/alayksikot", koodistoController.getAlaYksikot);

// Person GET requests
router.get("/persons/get", personController.getPersonListaus);
router.get("/persons/publications/:orcid", personController.getPublicationListForOnePerson);
router.get("/persons/download", personController.downloadPersons);

// Person POST requests
router.post("/person/save/", personController.postPerson);
router.post("/persons/upload", personFile.countRowsToBeDeleted);
router.post("/persons/save", personFile.savePersons);

// Person PUT requests
router.put("/person/update/:id", personController.updatePerson);

// Person DELETE requests
router.delete("/persons/remove/:id", personController.removePerson);
router.delete("/persons/csv-remove", personFile.deleteCsvFile);

// Database connection test
router.get("/public/db-health", userController.dbHealthCheck);

export = router;

