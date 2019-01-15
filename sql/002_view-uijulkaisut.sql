-- View: uijulkaisut

-- DROP VIEW uijulkaisut;

CREATE OR REPLACE VIEW uijulkaisut AS 
 SELECT tab.id, row_to_json(tab.*) AS row_to_json
   FROM ( SELECT j.id, j.organisaatiotunnus, j.julkaisutyyppi, j.julkaisuvuosi, 
            j.julkaisunnimi, j.tekijat, j.julkaisuntekijoidenlukumaara, 
            j.konferenssinvakiintunutnimi, j.emojulkaisunnimi, j.isbn, 
            j.emojulkaisuntoimittajat, j.lehdenjulkaisusarjannimi, j.issn, 
            j.volyymi, j.numero, j.sivut, j.artikkelinumero, j.kustantaja, 
            j.julkaisunkustannuspaikka, j.julkaisunkieli, 
            j.julkaisunkansainvalisyys, j.julkaisumaa, 
            j.kansainvalinenyhteisjulkaisu, j.yhteisjulkaisuyrityksenkanssa, 
            j.doitunniste, j.pysyvaverkkoosoite, j.avoinsaatavuus, 
            j.julkaisurinnakkaistallennettu, 
            j.rinnakkaistallennetunversionverkkoosoite, j.jufotunnus, 
            j.jufoluokitus, j.julkaisuntila, j.username, j.modified, 
            ( SELECT array_to_json(array_agg(avainsana.avainsana)) AS array_to_json
                   FROM avainsana
                  WHERE avainsana.julkaisuid = j.id) AS avainsanat, 
            ( SELECT array_to_json(array_agg(tieteenala.tieteenalakoodi)) AS array_to_json
                   FROM tieteenala
                  WHERE tieteenala.julkaisuid = j.id) AS julkaisuntieteenalat, 
            ( SELECT array_to_json(array_agg(( SELECT t.*::record AS t
                           FROM ( SELECT organisaatiotekija.etunimet, 
                                    organisaatiotekija.sukunimi, 
                                    organisaatiotekija.orcid,
                                    organisaatiotekija.rooli, 
                                    ( SELECT array_to_json(array_agg(alayksikko.alayksikko)) AS array_to_json
                                           FROM alayksikko
                                          WHERE alayksikko.organisaatiotekijaid = organisaatiotekija.id) AS alayksikot) t))) AS array_to_json
                   FROM organisaatiotekija
                  WHERE organisaatiotekija.julkaisuid = j.id) AS organisaationtekijat
           FROM julkaisu j) tab;

ALTER TABLE uijulkaisut
  OWNER TO appaccount;
  
  
-- View: v_sa_julkaisut

-- DROP VIEW v_sa_julkaisut;
  
CREATE VIEW v_sa_julkaisut AS
 SELECT julkaisu.id AS rivi, julkaisu.id AS julkaisu_id,
    julkaisu.organisaatiotunnus, NULL::unknown AS ilmoitusvuosi,
    NULL::unknown AS julkaisuntunnus,
    julkaisu.julkaisuntila AS julkaisuntilakoodi,
    julkaisu.id AS julkaisunorgtunnus, julkaisu.julkaisuvuosi,
    julkaisu.julkaisunnimi, julkaisu.tekijat AS tekijatiedotteksti,
    julkaisu.julkaisuntekijoidenlukumaara AS tekijoidenlkm,
    julkaisu.sivut AS sivunumeroteksti, julkaisu.artikkelinumero,
    julkaisu.jufotunnus, julkaisu.jufoluokitus AS jufoluokkakoodi,
    julkaisu.julkaisumaa AS julkaisumaakoodi,
    julkaisu.lehdenjulkaisusarjannimi AS lehdennimi,
    julkaisu.volyymi AS volyymiteksti, julkaisu.numero AS lehdennumeroteksti,
    julkaisu.konferenssinvakiintunutnimi AS konferenssinnimi,
    julkaisu.kustantaja AS kustantajannimi,
    julkaisu.julkaisunkustannuspaikka AS kustannuspaikkateksti,
    julkaisu.emojulkaisunnimi,
    julkaisu.emojulkaisuntoimittajat AS emojulkaisuntoimittajatteksti,
    julkaisu.julkaisutyyppi AS julkaisutyyppikoodi,
    julkaisu.kansainvalinenyhteisjulkaisu AS yhteisjulkaisukvkytkin,
    NULL::unknown AS yhteisjulkaisushpkytkin,
    NULL::unknown AS yhteisjulkaisututkimuslaitoskytkin,
    NULL::unknown AS yhteisjulkaisumuukytkin,
    julkaisu.yhteisjulkaisuyrityksenkanssa AS yhteisjulkaisuyrityskytkin,
    julkaisu.julkaisurinnakkaistallennettu AS rinnakkaistallennettukytkin,
    julkaisu.julkaisunkansainvalisyys AS julkaisunkansainvalisyyskytkin,
    julkaisu.julkaisunkieli AS julkaisunkielikoodi,
    julkaisu.avoinsaatavuus AS avoinsaatavuuskoodi,
    NULL::unknown AS evojulkaisukytkin, julkaisu.doitunniste AS doi,
    julkaisu.pysyvaverkkoosoite AS pysyvaosoiteteksti,
    NULL::unknown AS juuliosoiteteksti, NULL::unknown AS lahdetietokannantunnus,
    NULL::unknown AS lataus_id, julkaisu.modified AS muutos_pvm
   FROM julkaisu;
   
   ALTER TABLE v_sa_julkaisut
  OWNER TO sql_sync;
  
-- View: v_sa_tieteenalat

-- DROP VIEW v_sa_tieteenalat;
  
CREATE VIEW v_sa_tieteenalat  AS 
  SELECT NULL::unknown AS julkaisuntunnus, tieteenala.julkaisuid AS rivi,
    tieteenala.tieteenalakoodi AS tieteenala, tieteenala.jnro,
    NULL::unknown AS lataus_id
   FROM tieteenala;
   
   ALTER TABLE v_sa_tieteenalat
  OWNER TO sql_sync;
  
-- View: v_sa_tieteenalat

-- DROP VIEW v_sa_tieteenalat;
  
CREATE VIEW v_sa_tieteenalat AS
	SELECT
	NULL::unknown AS julkaisuntunnus,
	taiteenala.julkaisuid AS rivi,
	taiteenala.tieteenalakoodi AS tieteenala,
	taiteenala.jnro,
	NULL::unknown AS lataus_id
	FROM taiteenala;
	
ALTER TABLE v_sa_taiteenalat
  OWNER TO sql_sync;
  
-- View: v_sa_tieteenalat

-- DROP VIEW v_sa_tieteenalat;
  
CREATE VIEW v_sa_tieteenalat AS
	SELECT avainsana.julkaisuid AS rivi,
	NULL::unknown AS julkaisuntunnus,
	avainsana.avainsana,
	NULL::unknown AS lataus_id
FROM avainsana;

  ALTER TABLE v_sa_avainsanat
  OWNER TO sql_sync;
  
-- View: v_sa_rinnakkaistallennettu

-- DROP VIEW v_sa_rinnakkaistallennettu;

CREATE VIEW v_sa_rinnakkaistallennettu AS
	SELECT
	julkaisu.id AS rivi,
	NULL::unknown AS julkaisuntunnus,
	julkaisu.rinnakkaistallennetunversionverkkoosoite AS rinnakkaistallennettu,
	NULL::unknown AS lataus_id
	FROM julkaisu;
	
	 ALTER TABLE v_sa_rinnakkaistallennettu
  OWNER TO sql_sync;
  
-- View: v_sa_tekijat

-- DROP VIEW v_sa_tekijat;

CREATE VIEW v_sa_tekijat AS
	SELECT
	o.julkaisuid AS rivi,
	NULL::unknown AS julkaisuntunnus,
	o.etunimet,
	o.sukunimi,
	o.orcid,
	a.alayksikko AS yksikko,
	NULL::unknown AS lataus_id
	FROM (organisaatiotekija o
	LEFT JOIN alayksikko a
	ON (a.organisaatiotekijaid = o.id));
	
ALTER TABLE v_sa_tekijat
  OWNER TO sql_sync;
  
-- View: v_sa_lisatiedot

-- DROP VIEW v_sa_lisatiedot;
  
CREATE VIEW v_sa_lisatiedot AS  
	SELECT NULL::unknown AS julkaisuntunnus, lisatieto.julkaisuid AS rivi,
	lisatieto.lisatietotyyppi, lisatieto.lisatietoteksti,
	NULL::unknown AS lataus_id
	FROM lisatieto;

ALTER TABLE v_sa_lisatiedot
  OWNER TO sql_sync;
  
-- View: v_sa_taidealantyyppikategoria

-- DROP VIEW v_sa_taidealantyyppikategoria;
  
CREATE VIEW v_sa_taidealantyyppikategoria AS  
  SELECT NULL::unknown AS julkaisuntunnus,
    taidealantyyppikategoria.julkaisuid AS rivi,
    taidealantyyppikategoria.tyyppikategoria AS taidealantyyppikategoria,
    NULL::unknown AS lataus_id
   FROM taidealantyyppikategoria;
   
ALTER TABLE v_sa_taidealantyyppikategoria
  OWNER TO sql_sync;
  
-- View: v_sa_julkaisut_isbn

-- DROP VIEW v_sa_julkaisut_isbn;

CREATE VIEW v_sa_julkaisut_isbn AS
	SELECT
	julkaisuid AS rivi,
	NULL::unknown AS julkaisuntunnus,
	isbn,
	NULL::unknown AS lataus_id
	FROM julkaisu_isbn;
	
ALTER TABLE v_sa_julkaisut_isbn
  OWNER TO sql_sync;
  
-- View: v_sa_julkaisut_issn

-- DROP VIEW v_sa_julkaisut_issn;
  
CREATE VIEW v_sa_julkaisut_issn AS
	SELECT
	julkaisuid AS rivi,
	NULL::unknown AS julkaisuntunnus,
	issn,
	NULL::unknown AS lataus_id
	FROM julkaisu_issn;
	
	ALTER TABLE v_sa_julkaisut_issn
  OWNER TO sql_sync;
