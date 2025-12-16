"use strict";
(() => {
  // src/shared/browser-compat.ts
  var browserAPI = globalThis.browser || globalThis.chrome;
  var storage = {
    get: (key) => new Promise((resolve) => browserAPI.storage.local.get(key, resolve)),
    set: (values) => new Promise((resolve) => browserAPI.storage.local.set(values, resolve)),
    remove: (key) => new Promise((resolve) => browserAPI.storage.local.remove(key, resolve))
  };
  function hasDownloadsApi() {
    return !!(browserAPI && browserAPI.downloads && typeof browserAPI.downloads.download === "function");
  }
  function shouldPromptForDownload() {
    return !!(browserAPI && browserAPI.runtime && typeof browserAPI.runtime.getBrowserInfo === "function");
  }
  function triggerDownload(url, filename) {
    return new Promise((resolve, reject) => {
      try {
        const maybePromise = browserAPI.downloads.download(
          {
            url,
            filename,
            // Firefox honors the user's "always ask" preference only when saveAs is true
            saveAs: shouldPromptForDownload()
          },
          (downloadId) => {
            if (browserAPI.runtime.lastError) {
              reject(browserAPI.runtime.lastError);
              return;
            }
            resolve(downloadId);
          }
        );
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(resolve, reject);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  // src/shared/normalize.ts
  function normalize(text) {
    if (!text) return "";
    const stripped = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return stripped.replace(/[^a-z0-9]+/g, " ").trim();
  }
  function keyFor(brand, model) {
    return `${normalize(brand)}|${normalize(model)}`;
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

  // src/background.ts
  var CACHE_KEY = "gsmarena-cache-v1";
  var SETTINGS_KEY = "gsmarena-settings";
  var CSV_FIELDS = [
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
    "firstSeen"
  ];
  var DATA_FIELDS = CSV_FIELDS.filter(
    (field) => !["mediaType", "sourceId", "slug", "updatedAt", "firstSeen"].includes(field)
  );
  var cache = null;
  var settingsCache = null;
  browserAPI.runtime.onInstalled.addListener(seedDefaults);
  browserAPI.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      if (!message || !message.type) {
        sendResponse(void 0);
        return;
      }
      if (message.type === "gsmarena-cache-update") {
        const source = message.source || "unknown";
        const mediaType = message.mediaType || "phone";
        console.debug("[gsmarena-cache][bg] received cache update", {
          source,
          mediaType,
          entries: Array.isArray(message.records) ? message.records.length : 0
        });
        handleCacheUpdate(message.records, { source, mediaType }).then(sendResponse).catch((err) => {
          console.error("[gsmarena-cache][bg] cache update failed", err);
          sendResponse({ ok: false, error: err.message });
        });
        return true;
      }
      if (message.type === "gsmarena-cache-request") {
        loadCache().then(sendResponse).catch((err) => {
          console.error("[gsmarena-cache][bg] cache request failed", err);
          sendResponse(null);
        });
        return true;
      }
      if (message.type === "gsmarena-settings-get") {
        loadSettings().then(sendResponse).catch((err) => {
          console.error("[gsmarena-cache][bg] settings get failed", err);
          sendResponse(DEFAULT_SETTINGS);
        });
        return true;
      }
      if (message.type === "gsmarena-settings-set") {
        saveSettings(message.settings || {}).then(sendResponse).catch((err) => {
          console.error("[gsmarena-cache][bg] settings set failed", err);
          sendResponse(null);
        });
        return true;
      }
      if (message.type === "gsmarena-cache-export") {
        handleExport().then(sendResponse).catch((err) => {
          console.error("[gsmarena-cache][bg] export failed", err);
          sendResponse({ ok: false, error: err.message, count: 0, lastSync: null });
        });
        return true;
      }
      if (message.type === "gsmarena-cache-clear") {
        handleCacheClear().then(sendResponse).catch((err) => {
          console.error("[gsmarena-cache][bg] cache clear failed", err);
          sendResponse({ ok: false, error: err.message });
        });
        return true;
      }
      sendResponse(void 0);
      return false;
    }
  );
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
        setting: settings.sources[meta.mediaType]
      });
      return { ok: false, skipped: true };
    }
    const normalizedRecords = normalizeRecords(records || [], meta);
    const merged = mergeRecords(cache?.entries || [], normalizedRecords);
    const index = indexRecords(merged);
    const next = {
      entries: merged,
      index,
      lastSync: Date.now(),
      source: meta.source
    };
    cache = next;
    await storage.set({ [CACHE_KEY]: next });
    console.debug("[gsmarena-cache][bg] cache updated successfully", {
      mediaType: meta.mediaType,
      count: normalizedRecords.length,
      totalEntries: merged.length
    });
    return { ok: true, count: normalizedRecords.length };
  }
  async function handleExport() {
    const current = await loadCache();
    const entries = current?.entries || [];
    const lastSync = current?.lastSync || null;
    if (entries.length === 0) {
      return { ok: false, reason: "empty", count: 0, lastSync };
    }
    const csv = buildCsv(entries);
    const filename = `cachearena-export-${Date.now()}.csv`;
    if (hasDownloadsApi()) {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      try {
        const downloadId = await triggerDownload(url, filename);
        setTimeout(() => URL.revokeObjectURL(url), 6e4);
        return {
          ok: true,
          mode: "downloads",
          downloadId,
          filename,
          count: entries.length,
          lastSync
        };
      } catch (err) {
        URL.revokeObjectURL(url);
        throw err;
      }
    }
    return {
      ok: true,
      mode: "inline",
      csv,
      filename,
      count: entries.length,
      lastSync
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
    settingsCache = { ...DEFAULT_SETTINGS, ...stored[SETTINGS_KEY] || {} };
    return settingsCache;
  }
  async function saveSettings(next) {
    const current = await loadSettings();
    const merged = {
      sources: { ...current.sources, ...next.sources || {} }
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
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const normalized = {
      mediaType,
      sourceId,
      slug,
      updatedAt: entry.updatedAt || timestamp,
      firstSeen: entry.firstSeen || entry.updatedAt || timestamp,
      brand: "",
      model: "",
      announced: "",
      status: "",
      dimensions: "",
      weight: "",
      build: "",
      sim: "",
      displayType: "",
      displaySize: "",
      displayResolution: "",
      os: "",
      chipset: "",
      memory: "",
      mainCamera: "",
      selfieCamera: "",
      battery: "",
      charging: "",
      colors: "",
      price: "",
      image: "",
      url: ""
    };
    for (const field of DATA_FIELDS) {
      normalized[field] = entry[field] || "";
    }
    return normalized;
  }
  function mergeRecords(existingEntries, incomingEntries) {
    const byKey = /* @__PURE__ */ new Map();
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
        ...entry
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
      const row = CSV_FIELDS.map(
        (field) => escapeCsv(entry[field] === void 0 ? "" : entry[field])
      );
      lines.push(row.join(","));
    }
    return lines.join("\n");
  }
})();
