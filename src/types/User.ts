export type UserObject = {
    perustiedot: {
        domain: string;
        email: string;
        seloste: string,
        kieli: string;
        nimi: string;
        organisaatio: string;
        organisaationimi?: string;
        rooli: string;
        uid: string,
        showHrData: boolean;
        showPublicationInput: boolean;
        jukuriUser: boolean;
        owner: boolean;
    };
    alayksikot: Alayksikot[];
    requiredFields: [];
    visibleFields: [];
};

export type Alayksikot = {
    vuosi: string;
    yksikot: Yksikot[]
};

export type Yksikot = {
    arvo: string;
    selite: string;
};