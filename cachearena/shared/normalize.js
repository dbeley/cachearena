(function (global) {
  const api = (global.__GSMARENA_EXT__ = global.__GSMARENA_EXT__ || {});

  function normalize(text) {
    if (!text) return "";
    const stripped = text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return stripped.replace(/[^a-z0-9]+/g, " ").trim();
  }

  function keyFor(brand, model) {
    return `${normalize(brand)}|${normalize(model)}`;
  }

  function slugFromUrl(url) {
    if (!url) return "";
    const match = url.match(/\/([^\/]+)-(\d+)\.php/);
    if (match) return match[1];
    return "";
  }

  api.normalize = normalize;
  api.keyFor = keyFor;
  api.slugFromUrl = slugFromUrl;
})(typeof window !== "undefined" ? window : this);
