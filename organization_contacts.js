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
		}
		
    },
    {
        // Centria-ammattikorkeakoulu  #centria-admins
        "domain": "@centria.fi",
        "code": "02536",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Centria-ammattikorkeakoulu|sv=Centria-ammattikorkeakoulu|en=Centria University of Applied Sciences|"	
		}
    },
    {
        // Diakonia-ammattikorkeakoulu  #diak-admins
        "domain": "@diak.fi",
        "code": "02623",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Diakonia-ammattikorkeakoulu|sv=Diakonia-ammattikorkeakoulu|en=Diaconia University of Applied Sciences|"	
		}
    },
    {
        // Haaga-Helia ammattikorkeakoulu  #haaga-helia-admins
        "domain": "@haaga-helia.fi",
        "code": "10056",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Haaga-Helia ammattikorkeakoulu|sv=Haaga-Helia ammattikorkeakoulu|en=Haaga-Helia University of Applied Sciences|"	
		}
    },
    {
        // Humanistinen ammattikorkeakoulu  #humak-admins
        "domain": "@humak.fi",
        "code": "02631",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Humanistinen ammattikorkeakoulu|sv=Humanistinen ammattikorkakoulu|en=Humak University of Applied Sciences|"	
		}
    },
    {
        // Hämeen ammattikorkeakoulu
        "domain": "@hamk.fi",
        "code": "02467",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Hämeen ammattikorkeakoulu|sv=Hämeen ammattikorkeakoulu|en=Häme University of Applied Sciences|"	
		}
    },
    {
        // Jyväskylän ammattikorkeakoulu  #jamk-admins
        "domain": "@jamk.fi",
        "code": "02504",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Jyväskylän ammattikorkeakoulu|sv=Jyväskylän ammattikorkeakoulu|en=JAMK University of Applied Sciences|"	
		}
    },
    {
        // Kajaanin ammattikorkeakoulu  #kamk-admins
        "domain": "@kamk.fi",
        "code": "02473",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Kajaanin ammattikorkeakoulu|sv=Kajaanin ammattikorkeakoulu|en=Kajaani University of Applied Sciences|"	
		}
    },
    {
        // Karelia-ammattikorkeakoulu  #karelia-admins
        "domain": "@karelia.fi",
        "code": "02469",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Karelia-ammattikorkeakoulu|sv=Karelia-ammattikorkeakoulu|en=Karelia University of Applied Sciences|"	
		}
    },
    {
        // nb! xamk may have 3 domains (mahd. kyamk.fi ja mamk.fi)
        // Kaakkois-Suomen ammattikorkeakoulu  #xamk-admins
        "domain": "@xamk.fi",
        "code": "10118",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Kaakkois-Suomen ammattikorkeakoulu|sv=Kaakkois-Suomen ammattikorkeakoulu|en=South-Eastern Finland University of Applied Sciences|"	
		}
    },
    {
        // Kaakkois-Suomen ammattikorkeakoulu  #xamk-admins
        "domain": "@kyamk.fi",
        "code": "10118",
        "email": "",
       	"theseusData": {
			"theseusCode": "fi=Kaakkois-Suomen ammattikorkeakoulu|sv=Kaakkois-Suomen ammattikorkeakoulu|en=South-Eastern Finland University of Applied Sciences|"	
		}
    },
    {
        // Kaakkois-Suomen ammattikorkeakoulu  #xamk-admins
        "domain": "@mamk.fi",
        "code": "10118",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Kaakkois-Suomen ammattikorkeakoulu|sv=Kaakkois-Suomen ammattikorkeakoulu|en=South-Eastern Finland University of Applied Sciences|"	
		}
    },
    {
        // Lahden ammattikorkeakoulu  #lamk-admins
        "domain": "@lamk.fi",
        "code": "02470",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Lahden ammattikorkeakoulu|sv=Lahden ammattikorkeakoulu|en=Lahti University of Applied Sciences|"	
		}
    },
    {
        // Laurea-ammattikorkeakoulu  #laurea-admins
        "domain": "@laurea.fi",
        "code": "02629",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Laurea-ammattikorkeakoulu|sv=Laurea-ammattikorkeakoulu|en=Laurea University of Applied Sciences|"	
		}
    },
    {
        // Metropolia ammattikorkeakoulu  #metropolia-admins
        "domain": "@metropolia.fi",
        "code": "10065",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Metropolia Ammattikorkeakoulu|sv=Metropolia Ammattikorkeakoulu|en=Metropolia University of Applied Sciences|"	
		}
    },
    {
        // Satakunnan ammattikorkeakoulu  #samk-admins
        "domain": "@samk.fi",
        "code": "02507",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Satakunnan ammattikorkeakoulu|sv=Satakunnan ammattikorkeakoulu|en=Satakunta University of Applied Sciences|"	
		}
    },
    {
        // Seinäjoen ammattikorkeakoulu  #seamk-admins
        "domain": "@seamk.fi",
        "code": "02472",
        "email": "",
        "theseusData": {
			"theseusCode": "fi=Seinäjoen ammattikorkeakoulu|sv=Seinäjoen ammattikorkeakoulu|en=Seinäjoki University of Applied Sciences|"	
		}
    },
    {
        // Tampereen ammattikorkeakoulu  #tamk-admins
        "domain": "@tamk.fi",
        "code": "02630",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Tampereen ammattikorkeakoulu|sv=Tampereen ammattikorkeakoulu|en=Tampere University of Applied Sciences|"	
		}
    },
    {
        // Tampereen ammattikorkeakoulu  #tamk-admins
        "domain": "@tuni.fi",
        "code": "02630",
        "email": "",
	    "theseusData": {
			"theseusCode": "fi=Tampereen ammattikorkeakoulu|sv=Tampereen ammattikorkeakoulu|en=Tampere University of Applied Sciences|"	
		}
    },
    {
        // Yrkeshögskolan Novia  #novia-admins
        "domain": "@novia.fi",
        "code": "10066",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Yrkehögskolan Novia|sv=Yrkehögskolan Novia|en=Novia University of Applied Sciences|"	
		}

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
    {
        // Savonia-ammattikorkeakoulu
        "domain": "@savonia.fi",
        "code": "02537",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Savonia-ammattikorkeakoulu|sv=Savonia-ammattikorkeakoulu|en=Savonia University of Applied Sciences|"	
		}
    },
    {
        // Turun ammattikorkeakoulu
        "domain": "@turkuamk.fi",
        "code": "02509",
        "email": "",
       	"theseusData": {
			"theseusCode": "fi=Turun ammattikorkeakoulu|sv=Turun ammattikorkeakoulu|en=Turku University of Applied Sciences|"	
		}
    },
    {
        // Oulun ammattikorkeakoulu #oamk-admins
        "domain": "@oamk.fi",
        "code": "02471",
        "email": "",
		"theseusData": {
			"theseusCode": "fi=Oulun ammattikorkeakoulu|sv=Oulun ammattikorkeakoulu|en=Oulu University of Applied Sciences|"	
		}
    },
	// Testikäytössä
	{
        // Taideyliopisto
        "domain": "@uniarts.fi",
        "code": "10103",
        "email": ""
    },
    {
        // Luonnonvarakeskus
        "domain": "@luke.fi",
        "code": "4100010",
        "email": "",
		// For Luke publications are transferred to Jukurit instead of Theseus
		"jukuritData": {
			"theseusCode": "Luonnonvarakeskus"	
		},
		"visibleFields": ["hrnumero"]
    },
    {
        // 	Geologian tutkimuskeskus #gtk-admins
        "domain": "@gtk.fi",
        "code": "5040011",
        "email": ""
    },
    {
        // 	Terveyden ja hyvinvoinnin laitos #thl-admins
        "domain": "@thl.fi",
        "code": "5610017",
        "email": ""
    }
];

module.exports = {
    domainMappings: contactList

};