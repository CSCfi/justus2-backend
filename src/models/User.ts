export interface UserObject {
    perustiedot: {
        domain: string;
        email: string;
        kieli: string;
        nimi: string;
        organisaatio: string;
        rooli: string;
        uid: string,
        showHrData: boolean;
        showPublicationInput: boolean;
        jukuriUser: boolean;
        owner: boolean;
    };
    alayksikot: {};
    requiredFields: [];
    visibleFields: [];
}