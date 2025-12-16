"use strict";
(() => {
  // src/shared/browser-compat.ts
  var browserAPI = globalThis.browser || globalThis.chrome;
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      browserAPI.runtime.sendMessage(message, (response) => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  // src/shared/config.ts
  var SOURCES = {
    phones: {
      id: "phones",
      label: "GSMArena phones",
      storageKey: "gsmarena-phones::records",
      mediaType: "phone",
      hosts: ["gsmarena.com", "www.gsmarena.com"]
    }
  };
  var DEFAULT_SETTINGS = {
    sources: Object.fromEntries(Object.values(SOURCES).map((src) => [src.mediaType, true]))
  };

  // src/shared/dom-utils.ts
  function text(node) {
    if (!node) return "";
    return (node.textContent || "").replace(/\s+/g, " ").trim();
  }
  function pickSrc(img) {
    if (!img) return "";
    return img.getAttribute("src") || (img.dataset?.src ?? "") || (img.dataset?.srcset ?? "");
  }

  // src/shared/normalize.ts
  function slugFromUrl(url) {
    if (!url) return "";
    const match = url.match(/\/([^/]+)-(\d+)\.php/);
    if (match) return match[1];
    return "";
  }

  // src/content/data-extract.ts
  main().catch((err) => console.warn("[gsmarena-cache] extract failed", err));
  async function main() {
    const settings = await fetchSettings();
    await runExtraction(settings);
  }
  async function fetchSettings() {
    try {
      const settings = await sendMessage({ type: "gsmarena-settings-get" });
      return { ...DEFAULT_SETTINGS, ...settings };
    } catch (err) {
      console.warn("[gsmarena-cache] failed to load settings, assuming defaults", err);
      return DEFAULT_SETTINGS;
    }
  }
  async function runExtraction(settings) {
    if (!isPhonePage()) {
      console.debug("[gsmarena-cache] not a phone page, skipping extraction");
      return;
    }
    if (settings.sources.phone === false) {
      console.debug("[gsmarena-cache] phone extraction disabled in settings");
      return;
    }
    const record = extractPhonePage();
    if (!record) {
      console.debug("[gsmarena-cache] no phone data extracted");
      return;
    }
    console.debug("[gsmarena-cache] extracted phone data", record);
    await sendMessage({
      type: "gsmarena-cache-update",
      records: [record],
      source: "extract:phone-page",
      mediaType: "phone"
    });
  }
  function isPhonePage() {
    return !!document.querySelector(".specs-phone-name-title");
  }
  function extractPhonePage() {
    const fullModel = text(document.querySelector(".specs-phone-name-title"));
    if (!fullModel) return null;
    const brand = fullModel.split(" ")[0] || "";
    const model = fullModel;
    const record = {
      brand,
      model,
      slug: slugFromUrl(location.href),
      url: location.href,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      firstSeen: (/* @__PURE__ */ new Date()).toISOString()
    };
    record.announced = getSpec("released-hl") || getSpec("year");
    record.status = getSpec("status");
    record.dimensions = getSpec("dimensions");
    record.weight = getSpec("weight");
    record.build = getSpec("build");
    record.sim = getMultiSpec("sim");
    record.displayType = getSpec("displaytype");
    record.displaySize = getSpec("displaysize");
    record.displayResolution = getSpec("displayresolution");
    record.os = getSpec("os") || getSpec("os-hl");
    record.chipset = getSpec("chipset") || getSpec("chipset-hl");
    record.memory = getSpec("internalmemory");
    const mainCamera = getSpec("cam1modules");
    const selfieCamera = getSpec("cam2modules");
    record.mainCamera = mainCamera;
    record.selfieCamera = selfieCamera;
    record.battery = getSpec("batdescription1") || getSpec("batsize-hl");
    record.charging = extractCharging();
    record.colors = getSpec("colors");
    record.price = getSpec("price");
    const imageEl = document.querySelector(".specs-photo-main img");
    record.image = pickSrc(imageEl);
    return record;
  }
  function getSpec(specName) {
    const el = document.querySelector(`[data-spec="${specName}"]`);
    if (!el) return "";
    return text(el);
  }
  function getMultiSpec(specName) {
    const el = document.querySelector(`[data-spec="${specName}"]`);
    if (!el) return "";
    const parts = collectSpecParts(el);
    if (parts.length === 0) return text(el);
    return parts.join("; ");
  }
  function collectSpecParts(root) {
    const parts = [];
    let buffer = [];
    function flush() {
      if (buffer.length === 0) return;
      const value = buffer.join(" ").replace(/^\u00b7\s*/, "").trim();
      if (value) parts.push(value);
      buffer = [];
    }
    function walk(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName;
        if (tag === "HR" || tag === "BR") {
          flush();
          return;
        }
        for (const child of Array.from(node.childNodes)) {
          walk(child);
        }
        return;
      }
      const value = text(node);
      if (value) buffer.push(value);
    }
    walk(root);
    flush();
    return parts;
  }
  function extractCharging() {
    const el = document.querySelector('[data-spec="battype-hl"]');
    if (!el) return "";
    const parts = [];
    let currentLabel = "";
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "I") {
        currentLabel = chargingLabelFrom(node.className || "");
        continue;
      }
      const value = text(node);
      if (!value) continue;
      if (currentLabel) {
        parts.push(`${value} ${currentLabel}`);
        currentLabel = "";
      } else {
        parts.push(value);
      }
    }
    const formatted = parts.join("; ").trim();
    if (formatted) return formatted;
    return text(el);
  }
  function chargingLabelFrom(className) {
    if (/reverse/i.test(className)) return "reverse wireless";
    if (/wireless/i.test(className)) return "wireless";
    return "wired";
  }
})();
