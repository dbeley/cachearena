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
  const CSV_FIELDS = [
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
  const DATA_FIELDS = CSV_FIELDS.filter(
    (field) => !["mediaType", "sourceId", "slug", "updatedAt", "firstSeen"].includes(field),
  );
  const storage = {
    get: (key) => new Promise((resolve) => browser.storage.local.get(key, resolve)),
    set: (values) => new Promise((resolve) => browser.storage.local.set(values, resolve)),
    remove: (key) => new Promise((resolve) => browser.storage.local.remove(key, resolve)),
  };
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
    const stored = await storage.get(SETTINGS_KEY);
    if (!stored[SETTINGS_KEY]) {
      await storage.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
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
    await storage.set({ [CACHE_KEY]: next });
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
    await storage.remove(CACHE_KEY);
    cache = null;
    console.debug("[gsmarena-cache][bg] cache cleared successfully");
    return { ok: true };
  }

  async function loadSettings() {
    if (settingsCache) return settingsCache;
    const stored = await storage.get(SETTINGS_KEY);
    settingsCache = { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
    return settingsCache;
  }

  async function saveSettings(next) {
    const current = await loadSettings();
    const merged = {
      sources: { ...current.sources, ...(next.sources || {}) },
    };
    settingsCache = merged;
    await storage.set({ [SETTINGS_KEY]: merged });
    return merged;
  }

  async function loadCache() {
    if (cache) return cache;
    const stored = await storage.get(CACHE_KEY);
    cache = stored[CACHE_KEY] || null;
    return cache;
  }

  function normalizeRecords(input, meta) {
    const entries = toEntryList(input);
    return entries.map((entry) => normalizeEntry(entry, meta));
  }

  function normalizeEntry(entry, meta) {
    const mediaType = meta.mediaType || "phone";
    const sourceId = meta.source || "unknown";
    const slug = entry.slug || entry.id || `${mediaType}-${entry.model || "unknown"}`;
    const timestamp = new Date().toISOString();
    const normalized = {
      mediaType,
      sourceId,
      slug,
      updatedAt: entry.updatedAt || timestamp,
      firstSeen: entry.firstSeen || entry.updatedAt || timestamp,
    };

    for (const field of DATA_FIELDS) {
      normalized[field] = entry[field] || "";
    }
    return normalized;
  }

  function mergeRecords(existingEntries, incomingEntries) {
    const byKey = new Map();

    for (const entry of existingEntries) {
      const key = recordKey(entry);
      byKey.set(key, entry);
    }

    for (const entry of incomingEntries) {
      const key = recordKey(entry);
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

  function toEntryList(input) {
    if (!input) return [];
    return (Array.isArray(input) ? input : Object.values(input)).filter(Boolean);
  }

  function recordKey(entry) {
    return `${entry.mediaType}::${entry.slug}`;
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
    const lines = [CSV_FIELDS.join(",")];
    for (const entry of entries) {
      const row = CSV_FIELDS.map((field) => escapeCsv(entry[field] === undefined ? "" : entry[field]));
      lines.push(row.join(","));
    }
    return lines.join("\n");
  }
})();
