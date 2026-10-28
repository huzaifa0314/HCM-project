
/* =====================================================
   HCM LITE - STEP 6: ATTENDANCE MANAGEMENT
   File: js/attendance.js
   ===================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "attendance";
  const DEFAULT_SETTINGS = {
    officeStartTime: "09:00",
    graceMinutes: 15,
    workingDays: [1, 2, 3, 4, 5]
  };

  function getRecords() {
    return window.HCMStorage.getCollection(STORAGE_KEY) || [];
  }

  function saveRecords(records) {
    window.HCMStorage.saveCollection(STORAGE_KEY, records);
  }

  function getSettings() {
    const stored = window.HCMStorage.get("settings", {});
    const company = window.HCMStorage.get("company", {});

    return {
      ...DEFAULT_SETTINGS,
      ...(company.settings || {}),
      ...(company || {}),
      ...(stored || {})
    };
  }

  function getCurrentUser() {
    return window.HCMAuth.getCurrentUser();
  }

  function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function timeString(date = new Date()) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  }

  function timeToMinutes(value) {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return 9 * 60;
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function isWorkingDay(dateString, settings = getSettings()) {
    const date = new Date(`${dateString}T12:00:00`);
    const day = date.getDay();
    const configuredDays = settings.workingDays;

    if (Array.isArray(configuredDays)) {
      return configuredDays.includes(day);
    }

    // Default: Monday to Friday
    return day >= 1 && day <= 5;
  }

  function getStatus(checkIn, checkOut, settings = getSettings()) {
    if (!checkIn) return "Absent";
    if (!checkOut) return "Checked In";

    const workedMinutes =
      timeToMinutes(checkOut) - timeToMinutes(checkIn);

    if (workedMinutes < 0) return "Invalid Time";
    if (workedMinutes < 300) return "Half Day";

    return "Present";
  }

  function getLateStatus(checkIn, settings = getSettings()) {
    if (!checkIn) return false;

    const officeStart = timeToMinutes(settings.officeStartTime);
    const grace = Math.max(0, Number(settings.graceMinutes) || 0);

    return timeToMinutes(checkIn) > officeStart + grace;
  }

  function getEmployeeId(user = getCurrentUser()) {
    return user ? user.id : null;
  }

  function getTodayRecord(employeeId) {
    const today = localDate();

    return getRecords().find(
      record => record.employeeId === employeeId && record.date === today
    ) || null;
  }

  function checkIn() {
    const user = getCurrentUser();

    if (!user || user.role !== "employee") {
      throw new Error("Sirf employee check-in kar sakta hai.");
    }

    const employeeId = getEmployeeId(user);
    const today = localDate();

    if (!isWorkingDay(today)) {
      throw new Error("Aaj configured working day nahi hai.");
    }

    if (getTodayRecord(employeeId)) {
      throw new Error("Aaj ka check-in pehle se mojood hai.");
    }

    const now = new Date();
    const settings = getSettings();
    const checkInTime = timeString(now);

    const record = {
      id: `att_${employeeId}_${today}`,
      employeeId,
      date: today,
      checkIn: checkInTime,
      checkOut: null,
      late: getLateStatus(checkInTime, settings),
      status: "Checked In",
      workedMinutes: 0,
      createdAt: now.toISOString()
    };

    const records = getRecords();
    records.push(record);
    saveRecords(records);

    return record;
  }

  function checkOut() {
    const user = getCurrentUser();

    if (!user || user.role !== "employee") {
      throw new Error("Sirf employee check-out kar sakta hai.");
    }

    const employeeId = getEmployeeId(user);
    const records = getRecords();
    const today = localDate();

    const index = records.findIndex(
      record => record.employeeId === employeeId && record.date === today
    );

    if (index === -1) {
      throw new Error("Pehle check-in karna zaroori hai.");
    }

    if (records[index].checkOut) {
      throw new Error("Aaj ka check-out pehle se ho chuka hai.");
    }

    const checkOutTime = timeString();
    const workedMinutes =
      timeToMinutes(checkOutTime) - timeToMinutes(records[index].checkIn);

    if (workedMinutes <= 0) {
      throw new Error("Check-out time check-in ke baad hona chahiye.");
    }

    records[index] = {
      ...records[index],
      checkOut: checkOutTime,
      workedMinutes,
      status: getStatus(
        records[index].checkIn,
        checkOutTime,
        getSettings()
      )
    };

    saveRecords(records);
    return records[index];
  }

  function getEmployeeHistory(employeeId) {
    return getRecords()
      .filter(record => record.employeeId === employeeId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function getAllHistory() {
    const employees = window.HCMStorage.getCollection("employees") || [];
    const records = getRecords();

    return records
      .map(record => {
        const employee = employees.find(
          item => item.id === record.employeeId
        );

        return {
          ...record,
          employeeName: employee ? employee.name : "Unknown Employee",
          employeeEmail: employee ? employee.email : ""
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function getTodayStatus(employeeId) {
    const record = getTodayRecord(employeeId);

    if (!record) {
      return {
        record: null,
        status: "Not Checked In",
        late: false
      };
    }

    return {
      record,
      status: record.status || getStatus(record.checkIn, record.checkOut),
      late: Boolean(record.late)
    };
  }

  window.HCMAttendance = {
    checkIn,
    checkOut,
    getRecords,
    getTodayRecord,
    getTodayStatus,
    getEmployeeHistory,
    getAllHistory,
    getStatus,
    getLateStatus,
    isWorkingDay,
    localDate
  };
})();
