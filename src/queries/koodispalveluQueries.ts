import { Request, Response, NextFunction } from "express";

// Redis client
const redis = require("redis");
const client = redis.createClient();


// Scheduler for updating Koodistopalvelu data inside redis
// Each star represents a different value, beginning from second and ending in day
// So if we want to update it once a day at midnight we would use ("* 0 0 * * *")
const getRedis = (rediskey: string, success: any, error: any) => {
    client.get(rediskey, function (err: Error, reply: any) {
        if (!err) {
            success(reply);
        }
        else {
            error(err);
        }
    });
};

// GET ORGANISAATIOLISTAUS
function getOrganisaatioListaus(req: Request, res: Response, next: NextFunction) {
    getRedis("getOrgListaus", function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
}



// KOODISTOPALVELU GETS
function getJulkaisunTilat(req: Request, res: Response, next: NextFunction) {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getJulkaisunTilatFI";
    }
    else {
        redisKey = "getJulkaisunTilat" + req.session.language;
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
}
function getTekijanRooli(req: Request, res: Response, next: NextFunction) {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getTekijanRooliFI";
    }
    else {
        redisKey = "getTekijanRooli" + req.session.language;
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
}

function getKielet(req: Request, res: Response, next: NextFunction) {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getKieletFI";
    }
    else {
        redisKey = "getKielet" + req.session.language;
    }
    console.log(redisKey);
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
}
function getValtiot(req: Request, res: Response, next: NextFunction) {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getValtiotFI";
    }
    else {
        redisKey = "getValtio" + req.session.language;
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
}
function getTaideAlanTyyppiKategoria(req: Request, res: Response, next: NextFunction) {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getTaideAlanTyyppiKategoriaFI";
    }
    else {
        redisKey = "getTaideAlanTyyppiKategoria" + req.session.language;
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
}
function getTaiteenalat(req: Request, res: Response, next: NextFunction) {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getTaiteenalatFI";
    }
    else {
        redisKey = "getTaiteenalat" + req.session.language;
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
}
function getTieteenalat(req: Request, res: Response, next: NextFunction) {
    let redisKey;
    console.log(req.session.language);
    if (!req.session.language) {
        redisKey = "getTieteenalatFI";
    }
    else {
        redisKey = "getTieteenalat" + req.session.language;
        console.log(redisKey);
    }
    // console.log(redisKey);
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
}
function getJulkaisunLuokat(req: Request, res: Response, next: NextFunction) {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getJulkaisunLuokatFI";
    }
    else {
        redisKey = "getJulkaisunLuokat" + req.session.language;
        console.log(redisKey);
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
}

// NOT SURE IF NEEDED

function getAlaYksikot(req: Request, res: Response, next: NextFunction) {
    getRedis("getAlayksikot", function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
}

module.exports = {
    getJulkaisunLuokat: getJulkaisunLuokat,
    getJulkaisunTilat: getJulkaisunTilat,
    getTekijanRooli: getTekijanRooli,
    getKielet: getKielet,
    getValtiot: getValtiot,
    getTaideAlanTyyppiKategoria: getTaideAlanTyyppiKategoria,
    getTaiteenalat: getTaiteenalat,
    getTieteenalat: getTieteenalat,
    getAlaYksikot: getAlaYksikot,
    getOrganisaatioListaus: getOrganisaatioListaus,
};