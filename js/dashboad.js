
(function () {
  "use strict";

  function collection(name) {
    try {
      return window.HCMStorage.getCollection(name) || [];
    } catch (error) {
      return [];
    }
  }

  function currentUser() {
    return window.HCMAuth.getCurrentUser();
  }

  function escape(value) {
    if (window.HCMUtils &&
        typeof window.HCMUtils.escapeHTML === "function") {
      return window.HCMUtils.escapeHTML(String(value ?? ""));
    }

    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function todayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function show(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function employeeName(employees, id) {
    const employee = employees.find(function (item) {
      return String(item.id) === String(id);
    });

    return employee
      ? (employee.name || employee.fullName || employee.email || "Employee")
      : "Employee";
  }

  function renderAdminDashboard() {
    const employees = collection("employees");
    const attendance = collection("attendance");
    const leaves = collection("leaves");
    const today = todayString();

    const todayAttendance = attendance.filter(function (record) {
      return record.date === today;
    });

    const pendingLeaves = leaves.filter(function (leave) {
      return String(leave.status || "Pending").toLowerCase() === "pending";
    });

    const presentToday = todayAttendance.filter(function (record) {
      return record.checkIn || record.checkin || record.checkInTime;
    }).length;

    show("totalEmployees", String(employees.length));
    show("presentToday", String(presentToday));
    show("pendingLeaves", String(pendingLeaves.length));
    show("attendanceRecords", String(todayAttendance.length));

    const recentBody = document.getElementById("recentAttendanceBody");
    if (recentBody) {
      const recent = todayAttendance.slice().reverse().slice(0, 8);

      if (recent.length === 0) {
        recentBody.innerHTML =
          '<tr><td colspan="4">Aaj abhi koi attendance record nahi hai.</td></tr>';
      } else {
        recentBody.innerHTML = recent.map(function (record) {
          const id = record.employeeId ?? record.userId ?? record.id;
          const checkIn = record.checkIn || record.checkin ||
            record.checkInTime || "—";
          const checkOut = record.checkOut || record.checkout ||
            record.checkOutTime || "—";

          return `<tr>
            <td>${escape(employeeName(employees, id))}</td>
            <td>${escape(checkIn)}</td>
            <td>${escape(checkOut)}</td>
            <td>${escape(record.status || "Present")}</td>
          </tr>`;
        }).join("");
      }
    }

    const leaveBody = document.getElementById("pendingLeaveBody");
    if (leaveBody) {
      const recentLeaves = pendingLeaves.slice().reverse().slice(0, 6);

      if (recentLeaves.length === 0) {
        leaveBody.innerHTML =
          '<tr><td colspan="3">Koi pending leave request nahi hai.</td></tr>';
      } else {
        leaveBody.innerHTML = recentLeaves.map(function (leave) {
          const id = leave.employeeId ?? leave.userId;
          const from = leave.startDate || leave.fromDate || leave.start || "—";
          const to = leave.endDate || leave.toDate || leave.end || "—";

          return `<tr>
            <td>${escape(employeeName(employees, id))}</td>
            <td>${escape(from)} – ${escape(to)}</td>
            <td>${escape(leave.reason || leave.leaveType || "Leave")}</td>
          </tr>`;
        }).join("");
      }
    }
  }

  function renderEmployeeDashboard() {
    const user = currentUser();
    if (!user) return;

    const attendance = collection("attendance").filter(function (record) {
      return String(record.employeeId ?? record.userId) === String(user.id);
    });

    const leaves = collection("leaves").filter(function (leave) {
      return String(leave.employeeId ?? leave.userId) === String(user.id);
    });

    const today = todayString();
    const todayRecord = attendance.find(function (record) {
      return record.date === today;
    });

    const approved = leaves.filter(function (leave) {
      return String(leave.status || "").toLowerCase() === "approved";
    });

    const pending = leaves.filter(function (leave) {
      return String(leave.status || "Pending").toLowerCase() === "pending";
    });

    show("myAttendanceCount", String(attendance.length));
    show("myApprovedLeaves", String(approved.length));
    show("myPendingLeaves", String(pending.length));

    let status = "Abhi check-in nahi kiya";
    if (todayRecord) {
      const checkIn = todayRecord.checkIn ||
        todayRecord.checkin || todayRecord.checkInTime;
      const checkOut = todayRecord.checkOut ||
        todayRecord.checkout || todayRecord.checkOutTime;

      if (checkIn && checkOut) status = "Check-in aur check-out complete";
      else if (checkIn) status = "Check-in complete — check-out baqi";
    }

    show("myTodayStatus", status);

    const body = document.getElementById("myRecentAttendanceBody");
    if (body) {
      const recent = attendance.slice().reverse().slice(0, 7);

      if (recent.length === 0) {
        body.innerHTML =
          '<tr><td colspan="4">Abhi attendance history available nahi hai.</td></tr>';
      } else {
        body.innerHTML = recent.map(function (record) {
          return `<tr>
            <td>${escape(record.date || "—")}</td>
            <td>${escape(record.checkIn || record.checkin || record.checkInTime || "—")}</td>
            <td>${escape(record.checkOut || record.checkout || record.checkOutTime || "—")}</td>
            <td>${escape(record.status || "—")}</td>
          </tr>`;
        }).join("");
      }
    }
  }

  function init() {
    if (!window.HCMAuth) return;

    const user = currentUser();
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    if (user.role === "admin") {
      renderAdminDashboard();
    } else {
      renderEmployeeDashboard();
    }
  }

  window.HCMDashboard = {
    init,
    renderAdminDashboard,
    renderEmployeeDashboard
  };

  document.addEventListener("DOMContentLoaded", init);
})();
