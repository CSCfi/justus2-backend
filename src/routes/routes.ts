import { Router, Request, Response } from "express";
// Defining our router
const router: Router = Router();

// Importing db const from queries.ts
const db = require("./../queries/queries");
// Koodistopalvelu file
const koodistopalvelu = require("./../queries/koodispalveluQueries");
// Define the routes here, all will have the prexix /api/ as per the proxypass in the apache settings
// GET requests here
router.get("/julkaisut/lista/all", db.getJulkaisut);
router.get("/julkaisut/lista/:organisaatiotunnus?", db.getJulkaisutmin);

router.get("/julkaisut/tiedot/:id", db.getAllPublicationDataById);

router.get("/haku/avainsanat", db.getAvainSanat);
router.get("/haku/julkaisusarjat", db.getJulkaisuSarjat);
router.get("/haku/konferenssinnimet", db.getKonferenssinimet);
router.get("/haku/kustantajat", db.getKustantajat);
router.get("/haku/jufo/:id", db.getJufo);
router.get("/haku/jufot", db.getJufotISSN);
router.get("/haku/julkaisut", db.getJulkaisutVIRTACR);
router.get("/haku/julkaisu", db.getJulkaisuVirtaCrossrefEsitaytto);
router.get("/user", db.getUser);
router.get("/usersession", db.getUserSessionData);

// KoodistoPalvelu routes
router.get("/organisaatiolistaus", koodistopalvelu.getOrganisaatioListaus);
router.get("/haku/julkaisunluokat", koodistopalvelu.getJulkaisunLuokat);
router.get("/haku/julkaisuntilat", koodistopalvelu.getJulkaisunTilat);
router.get("/haku/tekijanrooli", koodistopalvelu.getTekijanRooli);
router.get("/haku/kielet", koodistopalvelu.getKielet);
router.get("/haku/valtiot", koodistopalvelu.getValtiot);
router.get("/haku/taidealantyyppikategoria", koodistopalvelu.getTaideAlanTyyppiKategoria);
router.get("/haku/taiteenalat", koodistopalvelu.getTaiteenalat);
router.get("/haku/tieteenalat", koodistopalvelu.getTieteenalat);
router.get("/haku/alayksikot", koodistopalvelu.getAlaYksikot);

// POST requests
router.post("/julkaisu", db.postJulkaisu);
router.post("/language", db.postLanguage);
// router.post("/upload", db.uploadJulkaisu);

// PUT requests
router.put("/julkaisu/:id", db.updateJulkaisu);
router.put("/julkaisuntila/:id", db.putJulkaisuntila);

// For develeopping purposes
router.get("/testvirta", db.testvirta);

export = router;

