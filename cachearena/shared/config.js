(function (global) {
  const api = (global.__GSMARENA_EXT__ = global.__GSMARENA_EXT__ || {});

  const SOURCES = {
    phones: {
      id: "phones",
      label: "GSMArena phones",
      storageKey: "gsmarena-phones::records",
      mediaType: "phone",
      hosts: ["gsmarena.com", "www.gsmarena.com"],
    },
  };

  const DEFAULT_SETTINGS = {
    sources: Object.fromEntries(Object.values(SOURCES).map((src) => [src.mediaType, true])),
  };

  api.SOURCES = SOURCES;
  api.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
})(typeof window !== "undefined" ? window : this);
