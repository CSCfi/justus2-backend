export interface Keyword {
    uri: string;
    type: [];
    localname: string;
    prefLabel: string;
    altLabel: string;
    lang: string;
    hiddenLabel?: string;
    vocab: string;
}

export interface KeywordList {
    localname: string;
    prefLabel: string;
    altLabel: string;
}