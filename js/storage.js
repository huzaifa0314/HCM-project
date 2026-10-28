/* =========================================
   HCM LITE — STORAGE SYSTEM
   File: js/storage.js
========================================= */

(function () {
  "use strict";

  const STORAGE_PREFIX = "hcm_lite_";

  const DEFAULT_SETTINGS = {
    companyName: "",
    officeStartTime: "09:00",
    graceMinutes: 15,
    annualLeaveQuota: 20,
    workingDays: [1, 2, 3, 4, 5],
    currency: "PKR",
    theme: "light",
  };

  const DEFAULT_DATA = {
    setupComplete: false,
    currentUser: null,
    company: null,
    users: [],
    employees: [],
    attendance: [],
    leaves: [],
    announcements: [],
    settings: DEFAULT_SETTINGS,
  };

  /**
   * Read data from localStorage.
   */
  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);

      if (raw === null) {
        return fallback;
      }

      return JSON.parse(raw);
    } catch (error) {
      console.error(`HCM Lite: Could not read "${key}".`, error);
      return fallback;
    }
  }

  /**
   * Save data to localStorage.
   */
  function set(key, value) {
    try {
      localStorage.setItem(
        STORAGE_PREFIX + key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.error(`HCM Lite: Could not save "${key}".`, error);
      return false;
    }
  }

  /**
   * Remove one saved item.
   */
  function remove(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  }

  /**
   * Get the default data structure.
   */
  function getDefaultData() {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  /**
   * Initialize missing application data.
   * Existing saved data will not be overwritten.
   */
  function initialize() {
    const defaults = getDefaultData();

    Object.keys(defaults).forEach(function (key) {
      if (get(key, undefined) === undefined) {
        set(key, defaults[key]);
      }
    });
  }

  /**
   * Read or update company settings.
   */
  function getSettings() {
    return {
      ...DEFAULT_SETTINGS,
      ...get("settings", {}),
    };
  }

  function saveSettings(newSettings) {
    const currentSettings = getSettings();

    return set("settings", {
      ...currentSettings,
      ...newSettings,
    });
  }

  /**
   * Get the currently logged-in user.
   */
  function getCurrentUser() {
    return get("currentUser", null);
  }

  function setCurrentUser(user) {
    return set("currentUser", user);
  }

  function clearCurrentUser() {
    remove("currentUser");
  }

  /**
   * Return all records for a collection.
   */
  function getCollection(name) {
    const allowedCollections = [
      "users",
      "employees",
      "attendance",
      "leaves",
      "announcements",
    ];

    if (!allowedCollections.includes(name)) {
      console.error("HCM Lite: Unknown collection:", name);
      return [];
    }

    const result = get(name, []);
    return Array.isArray(result) ? result : [];
  }

  /**
   * Save a collection.
   */
  function saveCollection(name, records) {
    const allowedCollections = [
      "users",
      "employees",
      "attendance",
      "leaves",
      "announcements",
    ];

    if (!allowedCollections.includes(name)) {
      console.error("HCM Lite: Unknown collection:", name);
      return false;
    }

    if (!Array.isArray(records)) {
      console.error("HCM Lite: Collection data must be an array.");
      return false;
    }

    return set(name, records);
  }

  /**
   * Add a record to a collection.
   */
  function addRecord(name, record) {
    const records = getCollection(name);
    records.push(record);

    const saved = saveCollection(name, records);

    return saved ? record : null;
  }

  /**
   * Update a record by its ID.
   */
  function updateRecord(name, id, updates) {
    const records = getCollection(name);
    const index = records.findIndex(
      (record) => String(record.id) === String(id)
    );

    if (index === -1) {
      return false;
    }

    records[index] = {
      ...records[index],
      ...updates,
    };

    return saveCollection(name, records);
  }

  /**
   * Delete a record by its ID.
   */
  function deleteRecord(name, id) {
    const records = getCollection(name);

    const updatedRecords = records.filter(
      (record) => String(record.id) !== String(id)
    );

    if (updatedRecords.length === records.length) {
      return false;
    }

    return saveCollection(name, updatedRecords);
  }

  /**
   * Clear HCM Lite application data.
   * Use carefully: this deletes saved application data.
   */
  function clearAll() {
    Object.keys(localStorage).forEach(function (key) {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Make storage functions available to other JS files.
  window.HCMStorage = {
    initialize,
    get,
    set,
    remove,
    getDefaultData,
    getSettings,
    saveSettings,
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    getCollection,
    saveCollection,
    addRecord,
    updateRecord,
    deleteRecord,
    clearAll,
  };

  // Initialize storage when this script loads.
  initialize();
})();