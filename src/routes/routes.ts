import { Router, Request, Response } from "express";
// Defining our router
const router: Router = Router();
// Importing db const from queries.ts
const db = require("../queries");
// Define the routes here, all will have the prexix /api/ as per the proxypass in the apache settings
// GET requests here
router.get("/julkaisut/lista/all", db.getJulkaisut);
router.get("/julkaisut/lista", db.getJulkaisutmin);

// router.get("/julkaisut/tiedot/:id", db.getAjulkaisu);
router.get("/julkaisut/tiedot/:id", db.getAllPublicationDataById);
router.get("/org/:id", db.getOrgTekija);
// KoodistoPalvelu routes
router.get("/haku/julkaisunluokat", db.getJulkaisunLuokat);
router.get("/haku/julkaisuntilat", db.getJulkaisunTilat);
router.get("/haku/tekijanrooli", db.getTekijanRooli);
router.get("/haku/kielet", db.getKielet);
router.get("/haku/valtiot", db.getValtiot);
router.get("/haku/taidealantyyppikategoria", db.getTaideAlanTyyppiKategoria);
router.get("/haku/taiteenalat", db.getTaiteenalat);
router.get("/haku/tieteenalat", db.getTieteenalat);
router.get("/haku/alayksikot", db.getAlaYksikot);
router.get("/haku/avainsanat/", db.getAvainSanat);
router.get("/haku/julkaisusarjat/", db.getJulkaisuSarjat);
router.get("/haku/konferenssinnimet/", db.getKonferenssinimet);
router.get("/haku/kustantajat/", db.getKustantajat);
router.get("/haku/jufo/:id", db.getJufo);
router.get("/haku/jufot/", db.getJufotISSN);
router.get("/haku/julkaisut/", db.getJulkaisutVIRTACR);
router.get("/haku/julkaisu/", db.getJulkaisuVirtaCrossrefEsitäyttö);
router.get("/user", db.getUser);
router.get("/organisaatiolistaus", db.getOrganisaatioListaus);
router.get("/testvirta", db.testvirta);
// POST requests here
router.post("/julkaisu", db.postJulkaisu);
router.post("/org", db.postOrg);
router.post("/admin/action", db.postAdminAction);

// Put requests here
router.put("/julkaisu/:id", db.updateJulkaisu);
router.put("/julkaisuntila", db.putJulkaisuntila);

export = router;

