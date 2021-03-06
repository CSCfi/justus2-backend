// Visible and required fields listed here are additional to the common fields listed in organization config file.
// Fields listed here are organization specific.

const contactList = [
    {
        "domain": ["@csc.fi", "@digia.com"],
        "code": "00000",
        "email": "notvalid@csc.fi",
		"theseusData": {
			"theseusCode": "00000"
			
		}
    },
    {
        // Arcada - Nylands svenska yrkeshögskola
        "domain": ["@arcada.fi"],
        "code": "02535",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Yrkehögskolan Arcada|sv=Yrkehögskolan Arcada|en=Arcada University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Centria-ammattikorkeakoulu
        "domain": ["@centria.fi"],
        "code": "02536",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Centria-ammattikorkeakoulu|sv=Centria-ammattikorkeakoulu|en=Centria University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Diakonia-ammattikorkeakoulu
        "domain": ["@diak.fi"],
        "code": "02623",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Diakonia-ammattikorkeakoulu|sv=Diakonia-ammattikorkeakoulu|en=Diaconia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Haaga-Helia ammattikorkeakoulu
        "domain": ["@haaga-helia.fi"],
        "code": "10056",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Haaga-Helia ammattikorkeakoulu|sv=Haaga-Helia ammattikorkeakoulu|en=Haaga-Helia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Humanistinen ammattikorkeakoulu
        "domain": ["@humak.fi"],
        "code": "02631",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Humanistinen ammattikorkeakoulu|sv=Humanistinen ammattikorkakoulu|en=Humak University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Hämeen ammattikorkeakoulu
        "domain": ["@hamk.fi"],
        "code": "02467",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Hämeen ammattikorkeakoulu|sv=Hämeen ammattikorkeakoulu|en=Häme University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Jyväskylän ammattikorkeakoulu
        "domain": ["@jamk.fi"],
        "code": "02504",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Jyväskylän ammattikorkeakoulu|sv=Jyväskylän ammattikorkeakoulu|en=JAMK University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Kajaanin ammattikorkeakoulu
        "domain": ["@kamk.fi"],
        "code": "02473",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Kajaanin ammattikorkeakoulu|sv=Kajaanin ammattikorkeakoulu|en=Kajaani University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Karelia-ammattikorkeakoulu 
        "domain": ["@karelia.fi"],
        "code": "02469",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Karelia-ammattikorkeakoulu|sv=Karelia-ammattikorkeakoulu|en=Karelia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Kaakkois-Suomen ammattikorkeakoulu 
        "domain": ["@xamk.fi", "@kyamk.fi", "@mamk.fi"],
        "code": "10118",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Kaakkois-Suomen ammattikorkeakoulu|sv=Kaakkois-Suomen ammattikorkeakoulu|en=South-Eastern Finland University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Laurea-ammattikorkeakoulu
        "domain": ["@laurea.fi"],
        "code": "02629",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Laurea-ammattikorkeakoulu|sv=Laurea-ammattikorkeakoulu|en=Laurea University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Metropolia ammattikorkeakoulu
        "domain": ["@metropolia.fi"],
        "code": "10065",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Metropolia Ammattikorkeakoulu|sv=Metropolia Ammattikorkeakoulu|en=Metropolia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Satakunnan ammattikorkeakoulu
        "domain": ["@samk.fi"],
        "code": "02507",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Satakunnan ammattikorkeakoulu|sv=Satakunnan ammattikorkeakoulu|en=Satakunta University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Seinäjoen ammattikorkeakoulu
        "domain": ["@seamk.fi"],
        "code": "02472",
        "email": "",
        "theseusData": {
			"theseusCode": "fi=Seinäjoen ammattikorkeakoulu|sv=Seinäjoen ammattikorkeakoulu|en=Seinäjoki University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Tampereen ammattikorkeakoulu
        "domain": ["@tamk.fi", "@tuni.fi"],
        "code": "02630",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Tampereen ammattikorkeakoulu|sv=Tampereen ammattikorkeakoulu|en=Tampere University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    
    {
        // Yrkeshögskolan Novia
        "domain": ["@novia.fi"],
        "code": "10066",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Yrkehögskolan Novia|sv=Yrkehögskolan Novia|en=Novia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]

    },
	{
        // Savonia-ammattikorkeakoulu
        "domain": ["@savonia.fi"],
        "code": "02537",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Savonia-ammattikorkeakoulu|sv=Savonia-ammattikorkeakoulu|en=Savonia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Turun ammattikorkeakoulu
        "domain": ["@turkuamk.fi"],
        "code": "02509",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Turun ammattikorkeakoulu|sv=Turun ammattikorkeakoulu|en=Turku University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Oulun ammattikorkeakoulu
        "domain": ["@oamk.fi", "@oulu.fi"],
        "code": "02471",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Oulun ammattikorkeakoulu|sv=Oulun ammattikorkeakoulu|en=Oulu University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Poliisiammattikorkeakoulu
        "domain": ["@polamk.fi", "@poliisi.fi"],
        "code": "02557",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Poliisiammattikorkeakoulu|sv=Polisyrkeshögskolan|en=Police University College|"	
		}
    },
	{
        // LAB ammattikorkeakoulu
        "domain": ["@lab.fi", "@lut.fi"],
        "code": "10126",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=LAB-ammattikorkeakoulu|sv=LAB-ammattikorkeakoulu|en=LAB University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // tutkimusorganisaatio
        // Ilmatieteen laitos
        "domain": ["@fmi.fi"],
        "code": "4940015",
        "email": ""
    },
    {
        // Maanmittauslaitos
        "domain": ["@nls.fi", "@maanmittauslaitos.fi"],
        "code": "4020217",
        "email": ""
    },
    {
        // Maanpuolustuskorkeakoulu
        "domain": ["@mil.fi"],
        "code": "02358",
        "email": ""
    },
    {
        // Luonnonvarakeskus
        "domain": ["@luke.fi"],
        "code": "4100010",
        "email": "",
		// For Luke publications are transferred to Jukurit instead of Theseus
		"jukuriData": {
			"jukuriCode": "Luonnonvarakeskus"	
		},
		"visibleFields": ["hrnumero", "projektinumero"],
    },
	{
        // 	Suomen ympäristökeskus
        "domain": ["@syke.fi", "@ymparisto.fi"],
        "code": "7020017",
        "email": "",
		"visibleFields": ["ensimmainenkirjoittaja"]
    },
	{
        // 	Ruokavirasto
        "domain": ["@ruokavirasto.fi"],
        "code": "430001",
        "email": ""
    },
	{
        // 	Työterveyslaitos
        "domain": ["@ttl.fi"],
        "code": "02202669",
        "email": ""
    },
	{
        // 	Geologian tutkimuskeskus
        "domain": ["@gtk.fi"],
        "code": "5040011",
        "email": ""
    },
	{
        // 	Lapin ammattikorkeakoulu
        "domain": ["@ulapland.fi", "@lapinamk.fi"],
        "code": "10108",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Lapin ammattikorkeakoulu|sv=Lapin ammattikorkeakoulu|en=Lapland University of Applied Sciences|"
		},
		"requiredFields": ["alayksikko"]
    },
	{
        // 	Vaasan ammattikorkeakoulu
        "domain": ["@vamk.fi", "@tritonia.fi"],
        "code": "02627",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Vaasan ammattikorkeakoulu|sv=Vaasan ammattikorkeakoulu|en=Vaasa University of Applied Sciences|"
		},
		"requiredFields": ["alayksikko"]
    },

	// Testikäytössä
	{
        // Taideyliopisto
        "domain": ["@uniarts.fi"],
        "code": "10103",
        "email": "",
		"requiredFields": ["alayksikko"]
    },
    {
        // 	Terveyden ja hyvinvoinnin laitos
        "domain": ["@thl.fi"],
        "code": "5610017",
        "email": ""
    },

	
];

module.exports = {
    domainMappings: contactList

};