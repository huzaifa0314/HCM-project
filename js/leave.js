
/* =====================================================
   HCM LITE - STEP 7: LEAVE MANAGEMENT
   File: js/leave.js
   ===================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "leaves";

  const DEFAULT_SETTINGS = {
    annualLeaveQuota: 20,
    workingDays: [1, 2, 3, 4, 5]
  };

  function getRecords() {
    return window.HCMStorage.getCollection(STORAGE_KEY) || [];
  }

  function saveRecords(records) {
    window.HCMStorage.saveCollection(STORAGE_KEY, records);
  }

  function getSettings() {
    const saved = window.HCMStorage.get("settings", {}) || {};
    const company = window.HCMStorage.get("company", {}) || {};

    return {
      ...DEFAULT_SETTINGS,
      ...(company.settings || {}),
      ...company,
      ...saved
    };
  }

  function getCurrentUser() {
    return window.HCMAuth.getCurrentUser();
  }

  function makeId() {
    if (window.HCMUtils &&
        typeof window.HCMUtils.generateId === "function") {
      return window.HCMUtils.generateId();
    }

    return "leave_" + Date.now() + "_" +
      Math.random().toString(36).slice(2, 9);
  }

  function parseDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString || "")) {
      throw new Error("Date sahi format mein enter karein.");
    }

    const date = new Date(dateString + "T12:00:00");

    if (Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== dateString) {
      throw new Error("Valid date enter karein.");
    }

    return date;
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getWorkingDays() {
    const configured = getSettings().workingDays;

    if (Array.isArray(configured)) {
      return configured.map(Number);
    }

    return DEFAULT_SETTINGS.workingDays;
  }

  function isWorkingDay(date) {
    return getWorkingDays().includes(date.getDay());
  }

  function countWorkingDays(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (end < start) {
      throw new Error("End date, start date se pehle nahi ho sakti.");
    }

    let count = 0;
    const cursor = new Date(start);

    while (cursor <= end) {
      if (isWorkingDay(cursor)) count++;
      cursor.setDate(cursor.getDate() + 1);
    }

    return count;
  }

  function countDaysInYear(startDate, endDate, year) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const cursor = new Date(start);
    let count = 0;

    while (cursor <= end) {
      if (cursor.getFullYear() === year && isWorkingDay(cursor)) {
        count++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return count;
  }

  function getYearsBetween(startDate, endDate) {
    const startYear = parseDate(startDate).getFullYear();
    const endYear = parseDate(endDate).getFullYear();
    const years = [];

    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }

    return years;
  }

  function overlaps(startA, endA, startB, endB) {
    return startA <= endB && startB <= endA;
  }

  function getQuota() {
    const quota = Number(getSettings().annualLeaveQuota);
    return Number.isFinite(quota) && quota >= 0 ? quota : 20;
  }

  function getUsedDays(employeeId, year, includePending = true) {
    return getRecords()
      .filter(leave => {
        if (leave.employeeId !== employeeId) return false;

        const countsAgainstQuota =
          leave.status === "Approved" ||
          (includePending && leave.status === "Pending");

        return countsAgainstQuota &&
          countDaysInYear(leave.startDate, leave.endDate, year) > 0;
      })
      .reduce((total, leave) => {
        return total + countDaysInYear(
          leave.startDate, leave.endDate, year
        );
      }, 0);
  }

  function getRemainingDays(employeeId, year = new Date().getFullYear()) {
    return Math.max(0, getQuota() - getUsedDays(employeeId, year, true));
  }

  function validateRequest(employeeId, startDate, endDate, ignoreId = null) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (end < start) {
      throw new Error("End date, start date se pehle nahi ho sakti.");
    }

    if (startDate < formatDate(new Date())) {
      throw new Error("Past date ke liye leave request submit nahi ho sakti.");
    }

    const requestedDays = countWorkingDays(startDate, endDate);

    if (requestedDays < 1) {
      throw new Error("Selected dates mein koi working day nahi hai.");
    }

    const records = getRecords();

    const conflict = records.find(leave =>
      leave.id !== ignoreId &&
      leave.employeeId === employeeId &&
      leave.status !== "Rejected" &&
      overlaps(startDate, endDate, leave.startDate, leave.endDate)
    );

    if (conflict) {
      throw new Error(
        "In dates par aapki ek aur pending ya approved leave mojood hai."
      );
    }

    for (const year of getYearsBetween(startDate, endDate)) {
      const requestedInYear = countDaysInYear(startDate, endDate, year);
      const alreadyUsed = getUsedDays(employeeId, year, true);

      if (alreadyUsed + requestedInYear > getQuota()) {
        throw new Error(
          `${year} ka annual leave quota exceed ho jayega. ` +
          `Quota: ${getQuota()}, pehle se reserved/used: ${alreadyUsed}.`
        );
      }
    }

    return requestedDays;
  }

  function applyLeave(data) {
    const user = getCurrentUser();

    if (!user || user.role !== "employee") {
      throw new Error("Sirf employee leave request submit kar sakta hai.");
    }

    const startDate = String(data.startDate || "");
    const endDate = String(data.endDate || "");
    const reason = String(data.reason || "").trim();

    if (!reason) {
      throw new Error("Leave ki reason enter karna zaroori hai.");
    }

    if (reason.length > 500) {
      throw new Error("Reason 500 characters se chhoti honi chahiye.");
    }

    const days = validateRequest(user.id, startDate, endDate);

    const leave = {
      id: makeId(),
      employeeId: user.id,
      employeeName: user.name || user.email || "Employee",
      startDate,
      endDate,
      days,
      reason,
      status: "Pending",
      adminComment: "",
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null
    };

    const records = getRecords();
    records.push(leave);
    saveRecords(records);

    return leave;
  }

  function reviewLeave(leaveId, decision, comment = "") {
    const user = getCurrentUser();

    if (!user || user.role !== "admin") {
      throw new Error("Sirf Admin leave request review kar sakta hai.");
    }

    if (!["Approved", "Rejected"].includes(decision)) {
      throw new Error("Decision Approved ya Rejected hona chahiye.");
    }

    const records = getRecords();
    const index = records.findIndex(leave => leave.id === leaveId);

    if (index === -1) {
      throw new Error("Leave request nahi mili.");
    }

    if (records[index].status !== "Pending") {
      throw new Error("Yeh request pehle hi review ho chuki hai.");
    }

    if (decision === "Approved") {
      const leave = records[index];

      // Approval ke waqt bhi quota dobara check karein.
      for (const year of getYearsBetween(leave.startDate, leave.endDate)) {
        const approvedDays = getUsedDays(leave.employeeId, year, false);
        const requestedInYear = countDaysInYear(
          leave.startDate, leave.endDate, year
        );

        if (approvedDays + requestedInYear > getQuota()) {
          throw new Error(
            `${year} ka annual leave quota exceed ho raha hai.`
          );
        }
      }

      // Do approved leaves ka date overlap nahi hona chahiye.
      const conflict = records.find(item =>
        item.id !== leaveId &&
        item.employeeId === leave.employeeId &&
        item.status === "Approved" &&
        overlaps(
          leave.startDate, leave.endDate,
          item.startDate, item.endDate
        )
      );

      if (conflict) {
        throw new Error("Is employee ki approved leave in dates se overlap karti hai.");
      }
    }

    records[index] = {
      ...records[index],
      status: decision,
      adminComment: String(comment || "").trim().slice(0, 500),
      reviewedAt: new Date().toISOString(),
      reviewedBy: user.id
    };

    saveRecords(records);
    return records[index];
  }

  function getMyLeaves() {
    const user = getCurrentUser();

    if (!user || user.role !== "employee") {
      throw new Error("Employee login required.");
    }

    return getRecords()
      .filter(leave => leave.employeeId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function getAllLeaves() {
    const user = getCurrentUser();

    if (!user || user.role !== "admin") {
      throw new Error("Sirf Admin tamam leave requests dekh sakta hai.");
    }

    const employees = window.HCMStorage.getCollection("employees") || [];

    return getRecords()
      .map(leave => {
        const employee = employees.find(
          item => item.id === leave.employeeId
        );

        return {
          ...leave,
          employeeName: employee
            ? employee.name
            : (leave.employeeName || "Unknown Employee"),
          employeeEmail: employee ? employee.email : ""
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  window.HCMLeave = {
    applyLeave,
    reviewLeave,
    getMyLeaves,
    getAllLeaves,
    countWorkingDays,
    getRemainingDays,
    getUsedDays
  };
})();
