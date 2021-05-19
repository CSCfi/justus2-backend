export type JulkaisuObject = {
  id?: number;
  organisaatiotunnus: string;
  julkaisutyyppi: string;
  julkaisuvuosi: number;
  julkaisunnimi: string;
  tekijat: string;
  julkaisuntekijoidenlukumaara: number;
  konferenssinvakiintunutnimi?: string;
  emojulkaisunnimi?: string;
  emojulkaisuntoimittajat?: string;
  lehdenjulkaisusarjannimi?: string;
  volyymi?: string;
  numero?: string;
  sivut?: string;
  artikkelinumero?: string;
  kustantaja?: string;
  julkaisunkustannuspaikka?: string;
  julkaisunkieli?: string;
  julkaisunkansainvalisyys: string;
  julkaisumaa?: string;
  kansainvalinenyhteisjulkaisu: string;
  yhteisjulkaisuyrityksenkanssa: string;
  doitunniste?: string;
  pysyvaverkkoosoite?: string;
  avoinsaatavuus: string;
  julkaisurinnakkaistallennettu?: string;
  rinnakkaistallennetunversionverkkoosoite?: string;
  jufotunnus?: string;
  jufoluokitus?: string;
  julkaisuntila?: string;
  username: string;
  modified?: Date;
  lisatieto?: string;
  julkaisumaksu?: number;
  julkaisumaksuvuosi?: number;
  ensimmainenkirjoittaja?: string;
  projektinumero?: string;
  issn?: [string];
  isbn?: [string];
};

export type JulkaisuObjectMin = {
  id?: number;
  organisaatiotunnus: string;
  julkaisuvuosi: number;
  julkaisunnimi: string;
  tekijat: string;
  julkaisuntila: string;
  username: string;
  modified?: string;
};

export type ExternalPublicationPrefillObject = {
  source: string;
  title: string;
  author?: string;
  doi?: string;
  identifier?: string;
  organisation?: string;
};

export type SortObject = {
  relevance: number;
  entry: ExternalPublicationPrefillObject;
};
