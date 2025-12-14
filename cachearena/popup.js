(function () {
  const browser = globalThis.browser || globalThis.chrome;
  const api = globalThis.__GSMARENA_EXT__ || {};
  const sendMessage = api.sendMessage || fallbackSendMessage;

  const phoneCountEl = document.getElementById("phone-count");
  const lastSyncEl = document.getElementById("last-sync");
  const exportBtn = document.getElementById("export-btn");
  const clearBtn = document.getElementById("clear-btn");
  const messageEl = document.getElementById("message");

  loadStats();

  exportBtn.addEventListener("click", handleExport);
  clearBtn.addEventListener("click", handleClear);

  async function loadStats() {
    try {
      const cache = await sendMessage({ type: "gsmarena-cache-request" });

      if (cache && cache.entries) {
        phoneCountEl.textContent = cache.entries.length;

        if (cache.lastSync) {
          const date = new Date(cache.lastSync);
          lastSyncEl.textContent = formatDate(date);
        }
      }
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  }

  async function handleExport() {
    exportBtn.disabled = true;
    showMessage("Exporting...", "success");

    try {
      const result = await sendMessage({ type: "gsmarena-cache-export" });

      if (!result || !result.csv) {
        showMessage("No data to export", "error");
        exportBtn.disabled = false;
        return;
      }

      // Create and download CSV file
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cachearena-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showMessage(`Exported ${result.count} phones`, "success");
    } catch (err) {
      console.error("Export failed", err);
      showMessage("Export failed: " + err.message, "error");
    } finally {
      exportBtn.disabled = false;
    }
  }

  async function handleClear() {
    if (!confirm("Are you sure you want to clear all cached phone data?")) {
      return;
    }

    clearBtn.disabled = true;
    showMessage("Clearing cache...", "success");

    try {
      await sendMessage({ type: "gsmarena-cache-clear" });
      phoneCountEl.textContent = "0";
      lastSyncEl.textContent = "Never";
      showMessage("Cache cleared", "success");
    } catch (err) {
      console.error("Clear failed", err);
      showMessage("Clear failed: " + err.message, "error");
    } finally {
      clearBtn.disabled = false;
    }
  }

  function fallbackSendMessage(message) {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage(message, (response) => {
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = "block";

    setTimeout(() => {
      messageEl.style.display = "none";
    }, 3000);
  }

  function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  }
})();
