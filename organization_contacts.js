// Visible and required fields listed here are additional to the common fields listed in organization config file.
// Fields listed here are organization specific.

const contactList = [
    {
        "domain": "@csc.fi",
        "code": "00000",
        "email": "notvalid@csc.fi",
		"theseusData": {
			"theseusCode": "00000"
			
		}
    },
    {
        "domain": "@digia.com",
        "code": "00000",
        "email": "notvalid@digia.com",
		"theseusData": {
			"theseusCode": "00000"	
		}
    },
    {
        // Arcada - Nylands svenska yrkeshögskola  #arcada-admins
        "domain": "@arcada.fi",
        "code": "02535",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Yrkehögskolan Arcada|sv=Yrkehögskolan Arcada|en=Arcada University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Centria-ammattikorkeakoulu  #centria-admins
        "domain": "@centria.fi",
        "code": "02536",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Centria-ammattikorkeakoulu|sv=Centria-ammattikorkeakoulu|en=Centria University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Diakonia-ammattikorkeakoulu  #diak-admins
        "domain": "@diak.fi",
        "code": "02623",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Diakonia-ammattikorkeakoulu|sv=Diakonia-ammattikorkeakoulu|en=Diaconia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Haaga-Helia ammattikorkeakoulu  #haaga-helia-admins
        "domain": "@haaga-helia.fi",
        "code": "10056",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Haaga-Helia ammattikorkeakoulu|sv=Haaga-Helia ammattikorkeakoulu|en=Haaga-Helia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Humanistinen ammattikorkeakoulu  #humak-admins
        "domain": "@humak.fi",
        "code": "02631",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Humanistinen ammattikorkeakoulu|sv=Humanistinen ammattikorkakoulu|en=Humak University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Hämeen ammattikorkeakoulu
        "domain": "@hamk.fi",
        "code": "02467",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Hämeen ammattikorkeakoulu|sv=Hämeen ammattikorkeakoulu|en=Häme University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Jyväskylän ammattikorkeakoulu  #jamk-admins
        "domain": "@jamk.fi",
        "code": "02504",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Jyväskylän ammattikorkeakoulu|sv=Jyväskylän ammattikorkeakoulu|en=JAMK University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Kajaanin ammattikorkeakoulu  #kamk-admins
        "domain": "@kamk.fi",
        "code": "02473",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Kajaanin ammattikorkeakoulu|sv=Kajaanin ammattikorkeakoulu|en=Kajaani University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Karelia-ammattikorkeakoulu  #karelia-admins
        "domain": "@karelia.fi",
        "code": "02469",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Karelia-ammattikorkeakoulu|sv=Karelia-ammattikorkeakoulu|en=Karelia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // nb! xamk may have 3 domains (mahd. kyamk.fi ja mamk.fi)
        // Kaakkois-Suomen ammattikorkeakoulu  #xamk-admins
        "domain": "@xamk.fi",
        "code": "10118",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Kaakkois-Suomen ammattikorkeakoulu|sv=Kaakkois-Suomen ammattikorkeakoulu|en=South-Eastern Finland University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Kaakkois-Suomen ammattikorkeakoulu  #xamk-admins
        "domain": "@kyamk.fi",
        "code": "10118",
        "email": "",
       	"theseusData": {
			"theseusCode": "fi=Kaakkois-Suomen ammattikorkeakoulu|sv=Kaakkois-Suomen ammattikorkeakoulu|en=South-Eastern Finland University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Kaakkois-Suomen ammattikorkeakoulu  #xamk-admins
        "domain": "@mamk.fi",
        "code": "10118",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Kaakkois-Suomen ammattikorkeakoulu|sv=Kaakkois-Suomen ammattikorkeakoulu|en=South-Eastern Finland University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Lahden ammattikorkeakoulu  #lamk-admins
        "domain": "@lamk.fi",
        "code": "02470",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Lahden ammattikorkeakoulu|sv=Lahden ammattikorkeakoulu|en=Lahti University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Laurea-ammattikorkeakoulu  #laurea-admins
        "domain": "@laurea.fi",
        "code": "02629",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Laurea-ammattikorkeakoulu|sv=Laurea-ammattikorkeakoulu|en=Laurea University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Metropolia ammattikorkeakoulu  #metropolia-admins
        "domain": "@metropolia.fi",
        "code": "10065",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Metropolia Ammattikorkeakoulu|sv=Metropolia Ammattikorkeakoulu|en=Metropolia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Satakunnan ammattikorkeakoulu  #samk-admins
        "domain": "@samk.fi",
        "code": "02507",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Satakunnan ammattikorkeakoulu|sv=Satakunnan ammattikorkeakoulu|en=Satakunta University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Seinäjoen ammattikorkeakoulu  #seamk-admins
        "domain": "@seamk.fi",
        "code": "02472",
        "email": "",
        "theseusData": {
			"theseusCode": "fi=Seinäjoen ammattikorkeakoulu|sv=Seinäjoen ammattikorkeakoulu|en=Seinäjoki University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Tampereen ammattikorkeakoulu  #tamk-admins
        "domain": "@tamk.fi",
        "code": "02630",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Tampereen ammattikorkeakoulu|sv=Tampereen ammattikorkeakoulu|en=Tampere University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Tampereen ammattikorkeakoulu  #tamk-admins
        "domain": "@tuni.fi",
        "code": "02630",
        "email": "",
	    "theseusData": {
			"theseusCode": "fi=Tampereen ammattikorkeakoulu|sv=Tampereen ammattikorkeakoulu|en=Tampere University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Yrkeshögskolan Novia  #novia-admins
        "domain": "@novia.fi",
        "code": "10066",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Yrkehögskolan Novia|sv=Yrkehögskolan Novia|en=Novia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]

    },
	{
        // Savonia-ammattikorkeakoulu
        "domain": "@savonia.fi",
        "code": "02537",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Savonia-ammattikorkeakoulu|sv=Savonia-ammattikorkeakoulu|en=Savonia University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Turun ammattikorkeakoulu
        "domain": "@turkuamk.fi",
        "code": "02509",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Turun ammattikorkeakoulu|sv=Turun ammattikorkeakoulu|en=Turku University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Oulun ammattikorkeakoulu #oamk-admins
        "domain": "@oamk.fi",
        "code": "02471",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Oulun ammattikorkeakoulu|sv=Oulun ammattikorkeakoulu|en=Oulu University of Applied Sciences|"	
		},
		"requiredFields": ["alayksikko"]
    },
    {
        // Poliisiammattikorkeakoulu  #polamk-admins
        "domain": "@polamk.fi",
        "code": "02557",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Poliisiammattikorkeakoulu|sv=Polisyrkeshögskolan|en=Police University College|"	
		}
    },
    {
        // Poliisiammattikorkeakoulu
        "domain": "@poliisi.fi",
        "code": "02557",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Poliisiammattikorkeakoulu|sv=Polisyrkeshögskolan|en=Police University College|"	
		}
    },
	{
        // LAB ammattikorkeakoulu #lab-admins
		// nb! lab has two domains
        "domain": "@lab.fi",
        "code": "10126",
        "email": "",
		"theseusData": {
			"theseusCollectionId": 1475,
			"theseusCode": "fi=LAB-ammattikorkeakoulu|sv=LAB-ammattikorkeakoulu|en=LAB University of Applied Sciences|"	
		}
    },
	{
        // LAB ammattikorkeakoulu
        "domain": "@lut.fi",
        "code": "10126",
        "email": "",
		"theseusData": {
			"theseusCollectionId": 1475,
			"theseusCode": "fi=LAB-ammattikorkeakoulu|sv=LAB-ammattikorkeakoulu|en=LAB University of Applied Sciences|"	
		}
    },
    {
        // tutkimusorganisaatio
        // Ilmatieteen laitos  #fmi-admins
        "domain": "@fmi.fi",
        "code": "4940015",
        "email": ""
    },
    {
        // nb! mml has 2 domains
        // Maanmittauslaitos  #mml-admins
        "domain": "@nls.fi",
        "code": "4020217",
        "email": ""
    },
    {
        // Maanmittauslaitos  #mml-admins
        "domain": "@maanmittauslaitos.fi",
        "code": "4020217",
        "email": ""
    },
    {
        // Maanpuolustuskorkeakoulu
        "domain": "@mil.fi",
        "code": "02358",
        "email": ""
    },


	// Testikäytössä
	{
        // Taideyliopisto
        "domain": "@uniarts.fi",
        "code": "10103",
        "email": "",
		"requiredFields": ["alayksikko"]
    },
    {
        // Luonnonvarakeskus
        "domain": "@luke.fi",
        "code": "4100010",
        "email": "",
		// For Luke publications are transferred to Jukurit instead of Theseus
		"jukuriData": {
			"jukuriCode": "Luonnonvarakeskus"	
		},
		"visibleFields": ["hrnumero", "projektinumero"],
    },
    {
        // 	Geologian tutkimuskeskus #gtk-admins
        "domain": "@gtk.fi",
        "code": "5040011",
        "email": "",
		"requiredFields": ["alayksikko"]
    },
    {
        // 	Terveyden ja hyvinvoinnin laitos #thl-admins
        "domain": "@thl.fi",
        "code": "5610017",
        "email": ""
    },
	{
        // 	Ruokavirasto #ruoka-admins
        "domain": "@ruokavirasto.fi",
        "code": "4080015",
        "email": ""
    }
];

module.exports = {
    domainMappings: contactList

};