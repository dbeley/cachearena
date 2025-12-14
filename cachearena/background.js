(function () {
  // Cross-browser compatibility: Firefox uses 'browser', Chrome uses 'chrome'
  const browser = globalThis.browser || globalThis.chrome;

  if (typeof importScripts === "function") {
    try {
      importScripts("shared/normalize.js", "shared/config.js");
    } catch (err) {
      console.warn("[gsmarena-cache][bg] unable to import shared scripts", err);
    }
  }

  const api = typeof self !== "undefined" ? self.__GSMARENA_EXT__ || {} : {};
  const normalize = api.normalize || ((text) => (text || "").toLowerCase().trim());
  const keyFor = api.keyFor || ((brand, model) => `${normalize(brand)}|${normalize(model)}`);
  const DEFAULT_SETTINGS = api.DEFAULT_SETTINGS || {
    sources: { phone: true },
  };

  const CACHE_KEY = "gsmarena-cache-v1";
  const SETTINGS_KEY = "gsmarena-settings";
  let cache = null;
  let settingsCache = null;

  browser.runtime.onInstalled.addListener(seedDefaults);

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) {
      sendResponse(undefined);
      return;
    }

    if (message.type === "gsmarena-cache-update") {
      const source = message.source || "unknown";
      const mediaType = message.mediaType || "phone";
      console.debug("[gsmarena-cache][bg] received cache update", {
        source,
        mediaType,
        entries: Array.isArray(message.records)
          ? message.records.length
          : message.records
            ? Object.keys(message.records).length
            : 0,
      });
      handleCacheUpdate(message.records, { source, mediaType })
        .then(sendResponse)
        .catch((err) => {
          console.error("[gsmarena-cache][bg] cache update failed", err);
          sendResponse({ ok: false, error: err.message });
        });
      return true; // Indicates async response
    }

    if (message.type === "gsmarena-cache-request") {
      loadCache()
        .then(sendResponse)
        .catch((err) => {
          console.error("[gsmarena-cache][bg] cache request failed", err);
          sendResponse(null);
        });
      return true;
    }

    if (message.type === "gsmarena-settings-get") {
      loadSettings()
        .then(sendResponse)
        .catch((err) => {
          console.error("[gsmarena-cache][bg] settings get failed", err);
          sendResponse(DEFAULT_SETTINGS);
        });
      return true;
    }

    if (message.type === "gsmarena-settings-set") {
      saveSettings(message.settings || {})
        .then(sendResponse)
        .catch((err) => {
          console.error("[gsmarena-cache][bg] settings set failed", err);
          sendResponse(null);
        });
      return true;
    }

    if (message.type === "gsmarena-cache-export") {
      handleExport()
        .then(sendResponse)
        .catch((err) => {
          console.error("[gsmarena-cache][bg] export failed", err);
          sendResponse({ csv: "", count: 0, lastSync: null });
        });
      return true;
    }

    if (message.type === "gsmarena-cache-clear") {
      handleCacheClear()
        .then(sendResponse)
        .catch((err) => {
          console.error("[gsmarena-cache][bg] cache clear failed", err);
          sendResponse({ ok: false, error: err.message });
        });
      return true;
    }

    sendResponse(undefined);
  });

  async function seedDefaults() {
    const stored = await new Promise((resolve) => {
      browser.storage.local.get(SETTINGS_KEY, resolve);
    });
    if (!stored[SETTINGS_KEY]) {
      await new Promise((resolve) => {
        browser.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS }, resolve);
      });
    }
  }

  async function handleCacheUpdate(records, meta) {
    const settings = await loadSettings();
    if (settings.sources[meta.mediaType] === false) {
      console.debug("[gsmarena-cache][bg] skip update because source disabled", {
        mediaType: meta.mediaType,
        setting: settings.sources[meta.mediaType],
      });
      return { ok: false, skipped: true };
    }

    const normalizedRecords = normalizeRecords(records || {}, meta);
    const merged = mergeRecords(cache?.entries || [], normalizedRecords);
    const index = indexRecords(merged);
    const next = {
      entries: merged,
      index,
      lastSync: Date.now(),
      source: meta.source,
    };
    cache = next;
    await new Promise((resolve) => {
      browser.storage.local.set({ [CACHE_KEY]: next }, resolve);
    });
    console.debug("[gsmarena-cache][bg] cache updated successfully", {
      mediaType: meta.mediaType,
      count: normalizedRecords.length,
      totalEntries: merged.length,
    });
    return { ok: true, count: normalizedRecords.length };
  }

  async function handleExport() {
    const current = await loadCache();
    const entries = current?.entries || [];
    return {
      csv: buildCsv(entries),
      count: entries.length,
      lastSync: current?.lastSync || null,
    };
  }

  async function handleCacheClear() {
    await new Promise((resolve) => {
      browser.storage.local.remove(CACHE_KEY, resolve);
    });
    cache = null;
    console.debug("[gsmarena-cache][bg] cache cleared successfully");
    return { ok: true };
  }

  async function loadSettings() {
    if (settingsCache) return settingsCache;
    const stored = await new Promise((resolve) => {
      browser.storage.local.get(SETTINGS_KEY, resolve);
    });
    settingsCache = { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
    return settingsCache;
  }

  async function saveSettings(next) {
    const current = await loadSettings();
    const merged = {
      sources: { ...current.sources, ...(next.sources || {}) },
    };
    settingsCache = merged;
    await new Promise((resolve) => {
      browser.storage.local.set({ [SETTINGS_KEY]: merged }, resolve);
    });
    return merged;
  }

  async function loadCache() {
    if (cache) return cache;
    const stored = await new Promise((resolve) => {
      browser.storage.local.get(CACHE_KEY, resolve);
    });
    cache = stored[CACHE_KEY] || null;
    return cache;
  }

  function normalizeRecords(input, meta) {
    const entries = Array.isArray(input)
      ? input.filter(Boolean)
      : Object.values(input || {}).filter(Boolean);
    return entries.map((entry) => normalizeEntry(entry, meta));
  }

  function normalizeEntry(entry, meta) {
    const mediaType = meta.mediaType || "phone";
    const sourceId = meta.source || "unknown";
    const slug = entry.slug || entry.id || `${mediaType}-${entry.model || "unknown"}`;
    return {
      mediaType,
      sourceId,
      slug,
      brand: entry.brand || "",
      model: entry.model || "",
      announced: entry.announced || "",
      status: entry.status || "",
      dimensions: entry.dimensions || "",
      weight: entry.weight || "",
      build: entry.build || "",
      sim: entry.sim || "",
      displayType: entry.displayType || "",
      displaySize: entry.displaySize || "",
      displayResolution: entry.displayResolution || "",
      os: entry.os || "",
      chipset: entry.chipset || "",
      memory: entry.memory || "",
      mainCamera: entry.mainCamera || "",
      selfieCamera: entry.selfieCamera || "",
      battery: entry.battery || "",
      charging: entry.charging || "",
      colors: entry.colors || "",
      price: entry.price || "",
      image: entry.image || "",
      url: entry.url || "",
      updatedAt: entry.updatedAt || new Date().toISOString(),
      firstSeen: entry.firstSeen || entry.updatedAt || new Date().toISOString(),
    };
  }

  function mergeRecords(existingEntries, incomingEntries) {
    const byKey = new Map();

    for (const entry of existingEntries) {
      const key = `${entry.mediaType}::${entry.slug}`;
      byKey.set(key, entry);
    }

    for (const entry of incomingEntries) {
      const key = `${entry.mediaType}::${entry.slug}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, entry);
        continue;
      }

      const merged = {
        ...existing,
        ...entry,
      };
      byKey.set(key, merged);
    }

    return Array.from(byKey.values());
  }

  function indexRecords(entries) {
    const index = {};
    for (const entry of entries) {
      const brand = entry.brand || "";
      const model = entry.model || "";
      const key = keyFor(brand, model);
      if (!key.trim()) continue;
      index[key] = entry;
    }
    return index;
  }

  function escapeCsv(value) {
    const str = value == null ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function buildCsv(entries) {
    if (!entries || entries.length === 0) return "";
    const header = [
      "mediaType",
      "sourceId",
      "slug",
      "brand",
      "model",
      "announced",
      "status",
      "dimensions",
      "weight",
      "build",
      "sim",
      "displayType",
      "displaySize",
      "displayResolution",
      "os",
      "chipset",
      "memory",
      "mainCamera",
      "selfieCamera",
      "battery",
      "charging",
      "colors",
      "price",
      "image",
      "url",
      "updatedAt",
      "firstSeen",
    ];

    const lines = [header.join(",")];
    for (const entry of entries) {
      const row = header.map((field) => escapeCsv(entry[field] === undefined ? "" : entry[field]));
      lines.push(row.join(","));
    }
    return lines.join("\n");
  }
})();
