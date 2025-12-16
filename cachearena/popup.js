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

  // src/popup.ts
  var phoneCountEl = document.getElementById("phone-count");
  var lastSyncEl = document.getElementById("last-sync");
  var exportBtn = document.getElementById("export-btn");
  var clearBtn = document.getElementById("clear-btn");
  var messageEl = document.getElementById("message");
  loadStats();
  exportBtn.addEventListener("click", handleExport);
  clearBtn.addEventListener("click", handleClear);
  async function loadStats() {
    try {
      const cache = await sendMessage({ type: "gsmarena-cache-request" });
      if (cache && cache.entries) {
        phoneCountEl.textContent = String(cache.entries.length);
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
      if (!result || result.ok === false) {
        if (result?.reason === "empty") {
          showMessage("No data to export", "error");
        } else {
          showMessage("Export failed", "error");
        }
        exportBtn.disabled = false;
        return;
      }
      if (result.mode === "inline") {
        if (!result.csv) {
          showMessage("No data to export", "error");
          exportBtn.disabled = false;
          return;
        }
        const blob = new Blob([result.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename || `cachearena-export-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (result.mode !== "downloads") {
        showMessage("Export failed", "error");
        exportBtn.disabled = false;
        return;
      }
      showMessage(`Exported ${result.count || 0} phones`, "success");
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
  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = "block";
    setTimeout(() => {
      messageEl.style.display = "none";
    }, 3e3);
  }
  function formatDate(date) {
    const now = /* @__PURE__ */ new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 6e4);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }
})();
