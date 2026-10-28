
(function () {
  "use strict";

  const DEFAULTS = {
    officeStartTime: "09:00",
    graceMinutes: 15,
    annualLeaveQuota: 20,
    workingDays: [1, 2, 3, 4, 5]
  };

  function storage() {
    return window.HCMStorage;
  }

  function getSettings() {
    const saved = storage().get("settings", {});
    return { ...DEFAULTS, ...(saved || {}) };
  }

  function saveSettings(settings) {
    const store = storage();

    if (typeof store.set === "function") {
      store.set("settings", settings);
    } else {
      // Fallback tab istemal hoga jab storage.js mein set() na ho.
      localStorage.setItem("hcm_settings", JSON.stringify(settings));
      throw new Error(
        "storage.js mein HCMStorage.set(key, value) method add karna zaroori hai."
      );
    }

    return getSettings();
  }

  function initSettingsPage() {
    const auth = window.HCMAuth;
    if (!auth) {
      alert("auth.js load nahi hui. Script paths check karein.");
      return;
    }

    const user = auth.getCurrentUser();
    if (!user || user.role !== "admin") {
      alert("Settings sirf Admin access kar sakta hai.");
      window.location.href = "index.html";
      return;
    }

    const form = document.getElementById("settingsForm");
    if (!form) return;

    const settings = getSettings();

    document.getElementById("officeStartTime").value =
      settings.officeStartTime;
    document.getElementById("graceMinutes").value =
      settings.graceMinutes;
    document.getElementById("annualLeaveQuota").value =
      settings.annualLeaveQuota;

    document.querySelectorAll("[name='workingDays']").forEach((checkbox) => {
      checkbox.checked = settings.workingDays.includes(
        Number(checkbox.value)
      );
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const workingDays = Array.from(
        document.querySelectorAll("[name='workingDays']:checked")
      ).map((checkbox) => Number(checkbox.value));

      const officeStartTime =
        document.getElementById("officeStartTime").value;
      const graceMinutes = Number(
        document.getElementById("graceMinutes").value
      );
      const annualLeaveQuota = Number(
        document.getElementById("annualLeaveQuota").value
      );

      if (!officeStartTime) {
        alert("Office start time select karein.");
        return;
      }

      if (
        !Number.isInteger(graceMinutes) ||
        graceMinutes < 0 ||
        graceMinutes > 180
      ) {
        alert("Grace minutes 0 se 180 ke darmiyan hon.");
        return;
      }

      if (
        !Number.isInteger(annualLeaveQuota) ||
        annualLeaveQuota < 0 ||
        annualLeaveQuota > 365
      ) {
        alert("Annual leave quota 0 se 365 ke darmiyan hon.");
        return;
      }

      if (workingDays.length === 0) {
        alert("Kam az kam ek working day select karein.");
        return;
      }

      try {
        saveSettings({
          officeStartTime,
          graceMinutes,
          annualLeaveQuota,
          workingDays
        });

        const message = document.getElementById("settingsMessage");
        message.textContent = "Settings successfully save ho gayi hain.";
        message.style.color = "#15803d";
      } catch (error) {
        alert(error.message || "Settings save nahi ho sakin.");
      }
    });
  }

  window.HCMSettings = {
    getSettings,
    saveSettings,
    initSettingsPage
  };

  document.addEventListener("DOMContentLoaded", initSettingsPage);
})();
