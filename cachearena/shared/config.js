/**
 * Configuration constants for the extension
 */
export const SOURCES = {
    phones: {
        id: "phones",
        label: "GSMArena phones",
        storageKey: "gsmarena-phones::records",
        mediaType: "phone",
        hosts: ["gsmarena.com", "www.gsmarena.com"],
    },
};
export const DEFAULT_SETTINGS = {
    sources: Object.fromEntries(Object.values(SOURCES).map((src) => [src.mediaType, true])),
};
