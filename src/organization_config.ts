const commonVisibleFields = [
    "etunimet",
    "sukunimi",
    "julkaisutyyppi",
    "julkaisuvuosi",
    "julkaisuvuodenlisatieto",
    "julkaisunnimi",
    "tekijat",
    "julkaisuntekijoidenlukumaara",
    "organisaatiotekija",
    "konferenssinvakiintunutnimi",
    "isbn",
    "issn",
    "volyymi",
    "numero",
    "lehdenjulkaisusarjannimi",
    "kustantaja",
    "julkaisunkansainvalisyys",
    "tieteenala",
    "taiteenala",
    "taidealantyyppikategoria",
    "kansainvalinenyhteisjulkaisu",
    "yhteisjulkaisuyrityksenkanssa",
    "avoinsaatavuus",
    "emojulkaisunnimi",
    "emojulkaisuntoimittajat",
    "sivut",
    "artikkelinumero",
    "julkaisunkustannuspaikka",
    "avainsanat",
    "julkaisumaa",
    "julkistamispaikkakunta",
    "tapahtumanlisatieto",
    "julkaisunkieli",
    "doitunniste",
    "muutunniste",
    "pysyvaverkkoosoite",
    "tekijanrooli",
    "lisatieto"
];
const commonRequiredFields = [
    "etunimet",
    "sukunimi",
    "julkaisutyyppi",
    "julkaisuvuosi",
    "julkaisunnimi",
    "tekijat",
    "julkaisuntekijoidenlukumaara",
    "organisaatiotekija",
    "konferenssinvakiintunutnimi",
    "isbn",
    "issn",
    "lehdenjulkaisusarjannimi",
    "kustantaja",
    "julkaisunkansainvalisyys",
    "tieteenala",
    "tieteenalakoodi",
    "taiteenala",
    "taiteenalakoodi",
    "kansainvalinenyhteisjulkaisu",
    "yhteisjulkaisuyrityksenkanssa",
    "avoinsaatavuus",
    "rinnakkaistallennetunversionverkkoosoite"
];

const domainMappings = [

    {
        "domain": "@csc.fi",
        "code": "00000",
        "email": "notvalid@csc.fi"
    },
    {
        "domain": "@digia.com",
        "code": "00000",
        "email": "notvalid@digia.com"
    },
    {
        // Arcada - Nylands svenska yrkeshögskola  #arcada-admins
        "domain": "@arcada.fi",
        "code": "02535",
        "email": "biblioteket@arcada.fi"
    },
    {
        // Centria-ammattikorkeakoulu  #centria-admins
        "domain": "@centria.fi",
        "code": "02536",
        "email": "marjo.pekola@centria"
    },
    {
        // Diakonia-ammattikorkeakoulu  #diak-admins
        "domain": "@diak.fi",
        "code": "02623",
        "email": "julkaisutiedot@diak.fi"
    },
    {
        // Haaga-Helia ammattikorkeakoulu  #haaga-helia-admins
        "domain": "@haaga-helia.fi",
        "code": "10056",
        "email": "kirjasto.pasila@haaga-helia.fi"
    },
    {
        // Humanistinen ammattikorkeakoulu  #humak-admins
        "domain": "@humak.fi",
        "code": "02631",
        "email": "kirjasto@humak.fi"
    },
    {
        // Hämeen ammattikorkeakoulu
        "domain": "@hamk.fi",
        "code": "02467",
        "email": "julkaisurekisteri@hamk.fi"
    },
    {
        // Jyväskylän ammattikorkeakoulu  #jamk-admins
        "domain": "@jamk.fi",
        "code": "02504",
        "email": "helpdesk@jamk.fi"
    },
    {
        // Kajaanin ammattikorkeakoulu  #kamk-admins
        "domain": "@kamk.fi",
        "code": "02473",
        "email": "amkkirjasto@kamk.fi"
    },
    {
        // Karelia-ammattikorkeakoulu  #karelia-admins
        "domain": "@karelia.fi",
        "code": "02469",
        "email": "julkaisut@karelia.fi"
    },
    {
        // nb! xamk may have 3 domains (mahd. kyamk.fi ja mamk.fi)
        // Kaakkois-Suomen ammattikorkeakoulu  #xamk-admins
        "domain": "@xamk.fi",
        "code": "10118",
        "email": "julkaisut@xamk.fi"
    },
    {
        // Kaakkois-Suomen ammattikorkeakoulu  #xamk-admins
        "domain": "@kyamk.fi",
        "code": "10118",
        "email": "julkaisut@xamk.fi"
    },
    {
        // Kaakkois-Suomen ammattikorkeakoulu  #xamk-admins
        "domain": "@mamk.fi",
        "code": "10118",
        "email": "julkaisut@xamk.fi"
    },
    {
        // Lahden ammattikorkeakoulu  #lamk-admins
        "domain": "@lamk.fi",
        "code": "02470",
        "email": "julkaisut@lamk.fi"
    },
    {
        // Laurea-ammattikorkeakoulu  #laurea-admins
        "domain": "@laurea.fi",
        "code": "02629",
        "email": "julkaisut@laurea.fi"
    },
    {
        // Metropolia ammattikorkeakoulu  #metropolia-admins
        "domain": "@metropolia.fi",
        "code": "10065",
        "email": "annika.hayrynen@metropolia.fi"
    },
    {
        // Satakunnan ammattikorkeakoulu  #samk-admins
        "domain": "@samk.fi",
        "code": "02507",
        "email": "julkaisurekisteri@samk.fi"
    },
    {
        // Seinäjoen ammattikorkeakoulu  #seamk-admins
        "domain": "@seamk.fi",
        "code": "02472",
        "email": "julkaisutuki@seamk.fi"
    },
    {
        // Tampereen ammattikorkeakoulu  #tamk-admins
        "domain": "@tamk.fi",
        "code": "02630",
        "email": "tiina.kenttala-koivumaki@tamk.fi"
    },
    // {
    //     // Tampereen ammattikorkeakoulu  #tamk-admins
    //     "domain": "@tuni.fi",
    //     "code": "02630",
    //     "email": "tiina.kenttala-koivumaki@tamk.fi"
    // },
    {
        // Yrkeshögskolan Novia  #novia-admins
        "domain": "@novia.fi",
        "code": "10066",
        "email": "johanna.glader@novia.fi"
    },
    {
        // Poliisiammattikorkeakoulu  #polamk-admins
        "domain": "@polamk.fi",
        "code": "02557",
        "email": "kirjasto@polamk.fi"
    },
    {
        // Poliisiammattikorkeakoulu
        "domain": "@poliisi.fi",
        "code": "02557",
        "email": "kirjasto@polamk.fi"
    },
    {
        // tutkimusorganisaatio
        // Ilmatieteen laitos  #fmi-admins
        "domain": "@fmi.fi",
        "code": "4940015",
        "email": "achim.drebs@fmi.fi"
    },
    {
        // nb! mml has 2 domains
        // Maanmittauslaitos  #mml-admins
        "domain": "@nls.fi",
        "code": "4020217",
        "email": "MML.VIRTA@maanmittauslaitos.fi"
    },
    {
        // Maanmittauslaitos  #mml-admins
        "domain": "@maanmittauslaitos.fi",
        "code": "4020217",
        "email": "MML.VIRTA@maanmittauslaitos.fi"
    },
    {
        // Maanpuolustuskorkeakoulu
        "domain": "@mil.fi",
        "code": "02358",
        "email": "joonas.parviainen@mil.fi"
    },
    {
        // Savonia-ammattikorkeakoulu
        "domain": "@savonia.fi",
        "code": "02537",
        "email": "justus@savonia.fi"
    },
    {
        // Turun ammattikorkeakoulu
        "domain": "@turkuamk.fi",
        "code": "02509",
        "email": "julkaisutiedonkeruu@turkuamk.fi"
    },
    {
        // Taideyliopisto
        "domain": "@uniarts.fi",
        "code": "10103",
        "email": "katariina.kivisto-rahnasto@uniarts.fi"
    },
    {
        // Luonnonvarakeskus
        "domain": "@luke.fi",
        "code": "4100010",
        "email": "leena.byholm@luke.fi"
    },
    {
        // Oulun ammattikorkeakoulu
        "domain": "@oamk.fi",
        "code": "02471",
        "email": ""
    },


];

 function getOrganisationCodes() {

    const organisationCodes: any = [];

    for (let i = 0; i < domainMappings.length; i++ ) {
        organisationCodes.push(domainMappings[i].code);
    }

    // remove duplicates
    function filter(list: any) {
        return Array.from(new Set(list));
    }
    return  filter(organisationCodes);

}


module.exports = {
    domainMappings: domainMappings,
    commonVisibleFields: commonVisibleFields,
    commonRequiredFields: commonRequiredFields,
    getOrganisationCodes: getOrganisationCodes
};