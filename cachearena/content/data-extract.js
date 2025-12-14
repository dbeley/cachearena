(function () {
  const api = window.__GSMARENA_EXT__ || {};
  const DEFAULT_SETTINGS = api.DEFAULT_SETTINGS || { sources: {} };
  const sendMessage = api.sendMessage;
  const text = api.text;
  const attr = api.attr;
  const slugFromUrl = api.slugFromUrl;
  const pickSrc = api.pickSrc;

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
    // Only extract from phone specification pages
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
      mediaType: "phone",
    });
  }

  function isPhonePage() {
    // Phone pages have the specs-phone-name-title element
    return !!document.querySelector(".specs-phone-name-title");
  }

  function extractPhonePage() {
    const fullModel = text(document.querySelector(".specs-phone-name-title"));
    if (!fullModel) return null;

    // Extract brand from full model name (e.g., "Samsung Galaxy S25+" -> "Samsung")
    const brand = fullModel.split(" ")[0] || "";
    const model = fullModel;

    const record = {
      brand,
      model,
      slug: slugFromUrl(location.href),
      url: location.href,
      updatedAt: new Date().toISOString(),
      firstSeen: new Date().toISOString(),
    };

    // Extract brief specifications
    record.announced = getSpec("released-hl") || getSpec("year");
    record.status = getSpec("status");
    record.dimensions = getSpec("dimensions");
    record.weight = getSpec("weight");
    record.build = getSpec("build");
    record.sim = getSpec("sim");

    // Display
    record.displayType = getSpec("displaytype");
    record.displaySize = getSpec("displaysize");
    record.displayResolution = getSpec("displayresolution");

    // Platform
    record.os = getSpec("os") || getSpec("os-hl");
    record.chipset = getSpec("chipset") || getSpec("chipset-hl");

    // Memory
    record.memory = getSpec("internalmemory");

    // Camera
    const mainCamera = getSpec("cam1modules");
    const selfieCamera = getSpec("cam2modules");
    record.mainCamera = mainCamera;
    record.selfieCamera = selfieCamera;

    // Battery
    record.battery = getSpec("batdescription1") || getSpec("batsize-hl");
    record.charging = getSpec("battype-hl");

    // Misc
    record.colors = getSpec("colors");
    record.price = getSpec("price");

    // Image
    const imageEl = document.querySelector(".specs-photo-main img");
    record.image = pickSrc(imageEl);

    return record;
  }

  function getSpec(specName) {
    const el = document.querySelector(`[data-spec="${specName}"]`);
    if (!el) return "";
    return text(el);
  }
})();
