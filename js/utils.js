/* =========================================
   HCM LITE — COMMON UTILITIES
   File: js/utils.js
========================================= */

(function () {
  "use strict";

  /**
   * Generate a unique ID.
   */
  function generateId(prefix = "HCM") {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return (
      prefix +
      "-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  /**
   * Get today's local date as YYYY-MM-DD.
   * Uses local time, not UTC.
   */
  function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /**
   * Convert a date string into a Date object
   * without shifting its calendar day.
   */
  function parseDate(dateString) {
    if (!dateString) {
      return null;
    }

    const parts = String(dateString).split("-").map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return null;
    }

    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  /**
   * Format date for display.
   */
  function formatDate(dateString, options = {}) {
    const date = parseDate(dateString);

    if (!date) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...options,
    }).format(date);
  }

  /**
   * Format time, for example 09:30 -> 9:30 AM.
   */
  function formatTime(timeString) {
    if (!timeString || !/^\d{2}:\d{2}$/.test(timeString)) {
      return "—";
    }

    const [hours, minutes] = timeString.split(":").map(Number);

    if (hours > 23 || minutes > 59) {
      return "—";
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return new Intl.DateTimeFormat("en-PK", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }

  /**
   * Format salary or other money values.
   */
  function formatCurrency(amount, currency = "PKR") {
    const number = Number(amount);

    if (!Number.isFinite(number)) {
      return "—";
    }

    try {
      return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(number);
    } catch (error) {
      return `${currency} ${number.toFixed(2)}`;
    }
  }

  /**
   * Get the number of minutes since midnight.
   */
  function timeToMinutes(timeString) {
    if (!timeString || !/^\d{2}:\d{2}$/.test(timeString)) {
      return null;
    }

    const [hours, minutes] = timeString.split(":").map(Number);

    if (hours > 23 || minutes > 59) {
      return null;
    }

    return hours * 60 + minutes;
  }

  /**
   * Calculate the difference between two times in minutes.
   */
  function getMinutesDifference(startTime, endTime) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (start === null || end === null || end < start) {
      return null;
    }

    return end - start;
  }

  /**
   * Get working days configured in company settings.
   * JavaScript weekdays: Sunday = 0, Monday = 1 ... Saturday = 6.
   */
  function getWorkingDays() {
    if (!window.HCMStorage) {
      return [1, 2, 3, 4, 5];
    }

    const settings = window.HCMStorage.getSettings();
    const days = settings.workingDays;

    if (!Array.isArray(days)) {
      return [1, 2, 3, 4, 5];
    }

    return days.filter(
      (day) => Number.isInteger(day) && day >= 0 && day <= 6
    );
  }

  /**
   * Check whether a date is a configured working day.
   */
  function isWorkingDay(dateString) {
    const date = parseDate(dateString);

    if (!date) {
      return false;
    }

    return getWorkingDays().includes(date.getDay());
  }

  /**
   * Count working days between two dates, inclusive.
   */
  function countWorkingDays(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end || start > end) {
      return 0;
    }

    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      if (isWorkingDay(dateString)) {
        count++;
      }

      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Escape user-entered text before placing it inside HTML.
   */
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return replacements[character];
    });
  }

  /**
   * Safely read a number from an input-like value.
   */
  function toNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
  }

  /**
   * Show a message in the browser console while developing.
   */
  function log(message, data = "") {
    console.log(`[HCM Lite] ${message}`, data);
  }

  // Make utilities available to other JS files.
  window.HCMUtils = {
    generateId,
    getToday,
    parseDate,
    formatDate,
    formatTime,
    formatCurrency,
    timeToMinutes,
    getMinutesDifference,
    getWorkingDays,
    isWorkingDay,
    countWorkingDays,
    escapeHTML,
    toNumber,
    log,
  };
})();