CREATE OR REPLACE FUNCTION person_kaytto_loki_insert() RETURNS trigger AS $$
BEGIN
  UPDATE person_kaytto_loki set luonti_pvm = current_timestamp
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION person_kaytto_loki_insert() TO appaccount;
