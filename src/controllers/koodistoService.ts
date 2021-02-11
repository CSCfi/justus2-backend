import { Request, Response, NextFunction } from "express";

// Redis client
const redis = require("redis");
const client = redis.createClient();

const getRedis = (rediskey: string, success: any, error: any) => {
    client.get(rediskey, function (err: Error, reply: any) {
        if (!err) {
            success(reply);
        } else {
            error(err);
        }
    });
};

export const getOrganisaatioListaus = (req: Request, res: Response, next: NextFunction) => {

    let redisKey;
    if (!req.session.language) {
        redisKey = "organizationCodesFI";
    } else {
        redisKey = "organizationCodes" + req.session.language;
    }

    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });

};

export const getOrganisaatioNames = (req: Request, res: Response, next: NextFunction) => {

    let redisKey;
    if (req.session.language) {
        redisKey = "getOrgNames" + req.session.language;
    } else if (req.query.lang) {
        redisKey = "getOrgNames" + req.query.lang;
    } else {
        redisKey = "getOrgNamesFI";
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
};


export const getJulkaisunTilat = (req: Request, res: Response, next: NextFunction) => {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getJulkaisunTilatFI";
    } else {
        redisKey = "getJulkaisunTilat" + req.session.language;
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
};

export const getTekijanRooli = (req: Request, res: Response, next: NextFunction) => {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getTekijanRooliFI";
    } else {
        redisKey = "getTekijanRooli" + req.session.language;
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
};

export const getKielet = (req: Request, res: Response, next: NextFunction) => {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getKieletFI";
    } else {
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
};

export const getValtiot = (req: Request, res: Response, next: NextFunction) => {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getValtiotFI";
    } else {
        redisKey = "getValtiot" + req.session.language;
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
};

export const getTaideAlanTyyppiKategoria = (req: Request, res: Response, next: NextFunction) => {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getTaideAlanTyyppiKategoriaFI";
    } else {
        redisKey = "getTaideAlanTyyppiKategoria" + req.session.language;
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
};

export const getTaiteenalat = (req: Request, res: Response, next: NextFunction) => {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getTaiteenalatFI";
    } else {
        redisKey = "getTaiteenalat" + req.session.language;
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
};

export const getTieteenalat = (req: Request, res: Response, next: NextFunction) => {
    let redisKey;
    console.log(req.session.language);
    if (!req.session.language) {
        redisKey = "getTieteenalatFI";
    } else {
        redisKey = "getTieteenalat" + req.session.language;
        console.log(redisKey);
    }
    getRedis(redisKey, function success(reply: any) {
        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
};

export const getJulkaisunLuokat = (req: Request, res: Response, next: NextFunction) => {
    let redisKey;
    if (!req.session.language) {
        redisKey = "getJulkaisunLuokatFI";
    } else {
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
};

export const getAlaYksikot = (req: Request, res: Response, next: NextFunction) => {
    getRedis("getAlayksikot", function success(reply: any) {

        res.status(200).json(
            JSON.parse(reply)
        );
    }, function error(err: Error) {
        console.log("Something went wrong");
    });
};

