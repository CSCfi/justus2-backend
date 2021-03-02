export interface UserObject {
    perustiedot: {
        domain: string;
        email: string;
        seloste: string[],
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
    alayksikot: [{ vuosi: string, yksikot: [{ arvo: string, selite: string }] }];
    requiredFields: [];
    visibleFields: [];
}