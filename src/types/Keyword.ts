export type Keyword = {
    uri: string;
    type: [];
    localname: string;
    prefLabel: string;
    altLabel: string;
    lang: string;
    hiddenLabel?: string;
    vocab: string;
};

export type KeywordList = {
    localname: string;
    prefLabel: string;
    altLabel: string;
};