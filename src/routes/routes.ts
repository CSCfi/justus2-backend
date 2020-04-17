import { Router } from "express";
// Defining our router
const router: Router = Router();

// Importing db const from apiQueries.ts
const db = require("../queries/apiQueries");
// Koodistopalvelu file
const koodistopalvelu = require("./../queries/koodispalveluQueries");
// External services (jufo, virta, crossref etc)
const ext = require("./../queries/externalServices");
// File upload
const fu = require("./../queries/fileUpload");
const ts = require("../services/TheseusSender");

// Define the routes here, all will have the prexix /api/ as per the proxypass in the apache settings
// GET requests here
router.get("/julkaisut/lista/all", db.getJulkaisut);
router.get("/julkaisut/lista/:organisaatiotunnus?", db.getJulkaisutmin);
router.get("/julkaisut/haku/:organisaatiotunnus?", db.getJulkaisutHaku);
router.get("/julkaisut/tiedot/:id", db.getAllPublicationDataById);
router.get("/user", db.getUser);
router.get("/julkaisu/download/:id", fu.downloadJulkaisu);

// POST requests
router.post("/julkaisu", db.postJulkaisu);
router.post("/language", db.postLanguage);
router.post("/logout", db.logout);
router.post("/julkaisu/upload", fu.uploadJulkaisu);

// For owners
router.post("/impersonate", db.impersonateUser);

// PUT requests
router.put("/julkaisu/:id", db.updateJulkaisu);
router.put("/julkaisuntila/:id", db.putJulkaisuntila);

// DELETE requests
router.delete("/julkaisu/poista/:id", fu.deleteJulkaisu);
router.delete("/persons/poista", fu.deleteCsvFile);


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
router.get("/persons/get", db.getPersonListaus);
router.put("/persons/update/:id", db.updatePerson);
router.get("/persons/download", db.downloadPersons);
router.post("/persons/upload", fu.countRowsToBeDeleted);
router.post("/persons/save", fu.savePersons);
router.get("/persons/publications/:orcid", db.getPublicationListForOnePerson);
router.delete("/persons/remove/:id", db.removePerson);
router.post("/person/save/", db.postPerson);

export = router;

