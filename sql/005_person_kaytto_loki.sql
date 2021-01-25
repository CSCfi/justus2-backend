CREATE TABLE person_kaytto_loki (
    id bigint DEFAULT nextval('person_kaytto_seq'::regclass),
    name character varying(100),
    uid character varying(50),
    person bigint,
    organization character varying(100),
    itable character varying(100),
    action character varying(10),
    data json,
    luonti_pvm timestamptz
);

ALTER TABLE public.person_kaytto_loki OWNER TO postgres;