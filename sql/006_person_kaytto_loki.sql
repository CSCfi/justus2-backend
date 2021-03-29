
--
-- Sequence
--

create sequence person_kaytto_seq;
grant all on sequence public.person_kaytto_seq to appaccount;


CREATE TABLE person_kaytto_loki (
    id bigint DEFAULT nextval('person_kaytto_seq'::regclass),
    name character varying(100) NOT NULL,
    uid character varying(50) NOT NULL,
    organization character varying(100) NOT NULL,
	person bigint NOT NULL,
    itable character varying(100) NOT NULL,
    action character varying(10) NOT NULL,
    data json,
    luonti_pvm timestamptz,
	CONSTRAINT person_kaytto_loki_pkey PRIMARY KEY (id)
);

ALTER TABLE public.person_kaytto_loki OWNER TO postgres;

--
-- Name: person_kaytto_loki_insert_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER 

person_kaytto_loki_insert_trg AFTER INSERT ON person_kaytto_loki FOR EACH ROW EXECUTE PROCEDURE person_kaytto_loki_insert();

--
-- Name: person_kaytto_loki; Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON TABLE person_kaytto_loki FROM PUBLIC;
REVOKE ALL ON TABLE person_kaytto_loki FROM postgres;
GRANT ALL ON TABLE person_kaytto_loki TO postgres;
GRANT SELECT, INSERT, TRIGGER ON person_kaytto_loki TO appaccount;

--
-- PostgreSQL database dump complete
--