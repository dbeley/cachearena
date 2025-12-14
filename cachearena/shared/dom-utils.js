(function (global) {
  const api = (global.__GSMARENA_EXT__ = global.__GSMARENA_EXT__ || {});

  function text(node) {
    if (!node) return "";
    return (node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function texts(nodes) {
    return Array.from(nodes || [])
      .map((n) => text(n))
      .filter(Boolean);
  }

  function toNumber(raw) {
    if (!raw) return "";
    const str = String(raw).trim().toLowerCase();
    const match = str.match(/([\d,.]+)\s*([km])?/);
    if (!match) return "";
    const num = parseFloat(match[1].replace(/,/g, ""));
    if (!isFinite(num)) return "";
    if (match[2] === "k") return Math.round(num * 1000);
    if (match[2] === "m") return Math.round(num * 1_000_000);
    return Math.round(num);
  }

  function pickSrc(img) {
    if (!img) return "";
    return img.getAttribute("src") || img.dataset?.src || img.dataset?.srcset || "";
  }

  function attr(el, name) {
    if (!el) return "";
    return el.getAttribute(name) || "";
  }

  api.text = text;
  api.texts = texts;
  api.toNumber = toNumber;
  api.pickSrc = pickSrc;
  api.attr = attr;
})(typeof window !== "undefined" ? window : this);
