import { Router } from "express";
// Defining our router
const router: Router = Router();

import { queries as api } from "./../queries/apiQueries";

// Koodistopalvelu file
const koodistopalvelu = require("./../queries/koodispalveluQueries");
// External services (jufo, virta, crossref etc)
const ext = require("./../queries/externalServices");
// File upload
const fu = require("./../queries/fileUpload");
const ts = require("../services/TheseusSender");

// Define the routes here, all will have the prexix /api/ as per the proxypass in the apache settings
// GET requests here
router.get("/julkaisut/lista/all", api.getJulkaisut.bind(api));
router.get("/julkaisut/lista/:organisaatiotunnus?", api.getJulkaisutmin);
router.get("/julkaisut/haku/:organisaatiotunnus?", api.getJulkaisutHaku);
router.get("/julkaisut/tiedot/:id", api.getAllPublicationDataById);
router.get("/user", api.getUser);
router.get("/julkaisu/download/:id", fu.downloadJulkaisu);

// POST requests
router.post("/julkaisu", api.postJulkaisu.bind(api));
router.post("/language", api.postLanguage);
router.post("/logout", api.logout);
router.post("/julkaisu/upload", fu.uploadJulkaisu);

// For owners
router.post("/impersonate", api.impersonateUser);

// PUT requests
router.put("/julkaisu/:id", api.updateJulkaisu.bind(api));
router.put("/julkaisuntila/:id", api.putJulkaisuntila);

// DELETE requests
router.delete("/julkaisu/poista/:id", fu.deleteJulkaisu);


// Queries for external services
router.get("/haku/avainsanat", ext.getAvainSanat);
router.get("/haku/julkaisusarjat", ext.getJulkaisuSarjat);
router.get("/haku/konferenssinnimet", ext.getKonferenssinimet);
router.get("/haku/kustantajat", ext.getKustantajat);
router.get("/haku/jufo/:id", ext.getJufo);
router.get("/haku/jufot", ext.getJufotISSN);
router.get("/haku/julkaisut", ext.getJulkaisutVirtaCrossrefLista);
router.get("/haku/julkaisu", ext.getJulkaisuVirtaCrossrefEsitaytto);
router.get("/haku/urntunnus", ext.getUrn);

// KoodistoPalvelu queries
router.get("/organisaatiolistaus", koodistopalvelu.getOrganisaatioListaus);
router.get("/organisaationimet", koodistopalvelu.getOrganisaatioNames);
router.get("/haku/julkaisunluokat", koodistopalvelu.getJulkaisunLuokat);
router.get("/haku/julkaisuntilat", koodistopalvelu.getJulkaisunTilat);
router.get("/haku/tekijanrooli", koodistopalvelu.getTekijanRooli);
router.get("/haku/kielet", koodistopalvelu.getKielet);
router.get("/haku/valtiot", koodistopalvelu.getValtiot);
router.get("/haku/taidealantyyppikategoria", koodistopalvelu.getTaideAlanTyyppiKategoria);
router.get("/haku/taiteenalat", koodistopalvelu.getTaiteenalat);
router.get("/haku/tieteenalat", koodistopalvelu.getTieteenalat);
router.get("/haku/alayksikot", koodistopalvelu.getAlaYksikot);

// Person table queries
router.get("/persons/get", api.getPersonListaus.bind(api));
router.put("/person/update/:id", api.updatePerson);
router.get("/persons/download", api.downloadPersons.bind(api));
router.post("/persons/upload", fu.countRowsToBeDeleted);
router.post("/persons/save", fu.savePersons);
router.get("/persons/publications/:orcid", api.getPublicationListForOnePerson);
router.delete("/persons/remove/:id", api.removePerson);
router.delete("/persons/csv-remove", fu.deleteCsvFile);
router.post("/person/save/", api.postPerson);

// Database connection test
router.get("/public/db-health", api.dbHealthCheck);

export = router;

