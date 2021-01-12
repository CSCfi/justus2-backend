-- Table: julkaisu

-- DROP TABLE julkaisu;

CREATE TABLE julkaisu
(
  id bigserial NOT NULL,
  organisaatiotunnus text,
  julkaisutyyppi text,
  julkaisuvuosi integer,
  julkaisunnimi text,
  tekijat text,
  julkaisuntekijoidenlukumaara integer,
  konferenssinvakiintunutnimi text,
  emojulkaisunnimi text,
  isbn text,
  emojulkaisuntoimittajat text,
  lehdenjulkaisusarjannimi text,
  issn text,
  volyymi text,
  numero text,
  sivut text,
  artikkelinumero text,
  kustantaja text,
  julkaisunkustannuspaikka text,
  julkaisunkieli text,
  julkaisunkansainvalisyys text,
  julkaisumaa text,
  kansainvalinenyhteisjulkaisu text,
  yhteisjulkaisuyrityksenkanssa text,
  doitunniste text,
  pysyvaverkkoosoite text,
  avoinsaatavuus text,
  julkaisurinnakkaistallennettu text,
  rinnakkaistallennetunversionverkkoosoite text,
  jufotunnus text,
  jufoluokitus text,
  julkaisumaksu numeric,
  julkaisumaksuvuosi integer,
  ensimmainenkirjoittaja text,
  julkaisuntila character varying(5),
  username character varying(100),
  modified timestamp with time zone NOT NULL DEFAULT now(),
  --julkaisuid character varying(20),
  lisatieto text,
  CONSTRAINT julkaisu_pkey PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);
ALTER TABLE julkaisu
  OWNER TO appaccount;


-- Table: avainsana

-- DROP TABLE avainsana;

CREATE TABLE avainsana
(
  id bigserial NOT NULL,
  julkaisuid bigint NOT NULL,
  avainsana text NOT NULL,
  CONSTRAINT avainsana_pkey PRIMARY KEY (id),
  CONSTRAINT fk_julkaisu FOREIGN KEY (julkaisuid)
      REFERENCES julkaisu (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE avainsana
  OWNER TO appaccount;


-- Table: tieteenala

-- DROP TABLE tieteenala;

CREATE TABLE tieteenala
(
  id bigserial NOT NULL,
  julkaisuid bigint NOT NULL,
  tieteenalakoodi text NOT NULL,
  jnro integer,
  CONSTRAINT tieteenala_pkey PRIMARY KEY (id),
  CONSTRAINT fk_julkaisu FOREIGN KEY (julkaisuid)
      REFERENCES julkaisu (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE tieteenala
  OWNER TO appaccount;

  
-- Table: taiteenala

-- DROP TABLE taiteenala;  
  
CREATE TABLE taiteenala
(
  id bigserial NOT NULL,
  julkaisuid bigint NOT NULL,
  taiteenalakoodi text NOT NULL,
  jnro integer,
  CONSTRAINT taiteenala_pkey PRIMARY KEY (id),
  CONSTRAINT fk_julkaisu FOREIGN KEY (julkaisuid)
      REFERENCES julkaisu (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE taiteenala
OWNER TO appaccount;
  

-- Table: organisaatiotekija

-- DROP TABLE organisaatiotekija;

CREATE TABLE organisaatiotekija
(
  id bigserial NOT NULL,
  julkaisuid bigint NOT NULL,
  etunimet text,
  sukunimi text,
  orcid text,
  hrnumero character varying,
  rooli integer,
  CONSTRAINT organisaatiotekija_pkey PRIMARY KEY (id),
  CONSTRAINT fk_julkaisu FOREIGN KEY (julkaisuid)
      REFERENCES julkaisu (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE organisaatiotekija
  OWNER TO appaccount;


-- Table: alayksikko

-- DROP TABLE alayksikko;

CREATE TABLE alayksikko
(
  id bigserial NOT NULL,
  organisaatiotekijaid bigint NOT NULL,
  alayksikko text,
  CONSTRAINT alayksikko_pkey PRIMARY KEY (id),
  CONSTRAINT fk_organisaatiotekija FOREIGN KEY (organisaatiotekijaid)
      REFERENCES organisaatiotekija (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE alayksikko
  OWNER TO appaccount;
  
 
-- Table: lisatieto

-- DROP TABLE lisatieto; 
  
CREATE TABLE lisatieto
(
  id bigserial NOT NULL,
  julkaisuid bigint NOT NULL,
  lisatietotyyppi text,
  lisatietoteksti text NOT NULL,
  CONSTRAINT lisatieto_pkey PRIMARY KEY (id),
  CONSTRAINT fk_julkaisu FOREIGN KEY (julkaisuid)
      REFERENCES julkaisu (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE lisatieto
OWNER TO appaccount;


-- Table: taidealantyyppikategoria

-- DROP TABLE taidealantyyppikategoria; 

CREATE TABLE taidealantyyppikategoria
(
  id bigserial NOT NULL,
  julkaisuid bigint NOT NULL,
  tyyppikategoria integer,
  CONSTRAINT taidealantyyppikategoria_pkey PRIMARY KEY (id),
  CONSTRAINT fk_julkaisu FOREIGN KEY (julkaisuid)
      REFERENCES julkaisu (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE taidealantyyppikategoria
OWNER TO appaccount;

-- Table: julkaisujono

-- DROP TABLE julkaisujono;

CREATE TABLE julkaisujono
(
  id bigserial NOT NULL,
  julkaisuid bigint NOT NULL UNIQUE,
  CONSTRAINT julkaisujono_pkey PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);
ALTER TABLE julkaisujono
OWNER TO appaccount;

-- Table: julkaisuarkisto

-- DROP TABLE julkaisuarkisto;

CREATE TABLE julkaisuarkisto
(
  id bigserial NOT NULL,
  julkaisuid bigint NOT NULL UNIQUE,
  itemid integer,
  bitstreamid integer,
  filename character varying,
  mimetype character varying,
  handle character varying,
  urn character varying,
  abstract text,
  embargo timestamp with time zone,
  oikeudet character varying,
  versio character varying(1),
  julkaisusarja character varying,
  destination character varying,
  CONSTRAINT julkaisuarkisto_pkey PRIMARY KEY (id),
  CONSTRAINT fk_julkaisujono FOREIGN KEY (julkaisuid)
      REFERENCES julkaisu (id) MATCH SIMPLE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE julkaisuarkisto
OWNER TO appaccount;

-- Table: julkaisu_issn

-- DROP TABLE julkaisu_issn;

CREATE TABLE julkaisu_issn
(
  id bigserial NOT NULL,
  julkaisuid bigint NOT NULL,
  issn character varying(12),
  CONSTRAINT julkaisu_issn_pkey PRIMARY KEY (id),
  CONSTRAINT fk_julkaisu FOREIGN KEY (julkaisuid)
      REFERENCES julkaisu (id) MATCH SIMPLE
	  ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE julkaisu_issn
OWNER TO appaccount;

-- Table: julkaisu_isbn

-- DROP TABLE julkaisu_isbn;


CREATE TABLE julkaisu_isbn
(
  id bigserial NOT NULL,
  julkaisuid bigint NOT NULL,
  isbn character varying(20),
  CONSTRAINT julkaisu_isbn_pkey PRIMARY KEY (id),
  CONSTRAINT fk_julkaisu FOREIGN KEY (julkaisuid)
      REFERENCES julkaisu (id) MATCH SIMPLE
	  ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE julkaisu_isbn
OWNER TO appaccount;

-- Table: julkaisu_projektinumero

-- DROP TABLE julkaisu_projektinumero;

CREATE TABLE julkaisu_projektinumero
(
  id bigserial NOT NULL,
  julkaisuid bigint NOT NULL,
  projektinumero character varying,
  CONSTRAINT julkaisu_projektinumero_pkey PRIMARY KEY (id),
  CONSTRAINT fk_julkaisu FOREIGN KEY (julkaisuid)
      REFERENCES julkaisu (id) MATCH SIMPLE
	  ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE julkaisu_projektinumero
OWNER TO appaccount;

-- Table: person

-- DROP TABLE person;

CREATE TABLE person
(
  id bigserial NOT NULL,
  tunniste character varying NOT NULL,
  etunimi character varying NOT NULL,
  sukunimi character varying NOT NULL,
  email character varying,
  created timestamp with time zone NOT NULL DEFAULT now(),
  modified timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT person_pkey PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);

ALTER TABLE person
  OWNER TO appaccount;
  
-- Table: person_organization

-- DROP TABLE person_organization;
  
CREATE TABLE person_organization
(
  id bigserial NOT NULL,
  personid bigint NOT NULL,
  organisaatiotunniste character varying NOT NULL,
  alayksikko character varying,
  created timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT person_organization_pkey PRIMARY KEY (id),
  CONSTRAINT fk_person FOREIGN KEY (personid)
      REFERENCES person (id) MATCH SIMPLE
	  ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE person_organization
	OWNER TO appaccount;
	
-- Table: person_identifier

-- DROP TABLE person_identifier;
	
CREATE TABLE person_identifier
(
  id bigserial NOT NULL,
  personid bigint NOT NULL,
  tunnistetyyppi character varying NOT NULL,
  tunniste character varying NOT NULL,
  created timestamp with time zone NOT NULL DEFAULT now(),
  modified timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT person_identifier_pkey PRIMARY KEY (id),
  CONSTRAINT fk_person FOREIGN KEY (personid)
      REFERENCES person (id) MATCH SIMPLE
	  ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE person_identifier
	OWNER TO appaccount;

