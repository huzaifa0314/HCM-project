
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const money = (amount) =>
    "Rs. " + Number(amount || 0).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  function readData(key, fallback = []) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getUsers() {
    const users = readData("hcm_users", []);
    return Array.isArray(users) ? users : [];
  }

  function getEmployees() {
    return getUsers().filter(user =>
      String(user.role || "").toLowerCase() === "employee"
    );
  }

  function getAttendance() {
    const records = readData("hcm_attendance", []);
    return Array.isArray(records) ? records : [];
  }

  function getSession() {
    return readData("hcm_session", null);
  }

  function getUserId(record) {
    return String(
      record.userId ??
      record.employeeId ??
      record.user_id ??
      record.employee_id ??
      record.id ??
      ""
    );
  }

  function getMonthWorkingDays(year, monthIndex) {
    let count = 0;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const weekday = date.getDay();

      if (weekday !== 0 && weekday !== 6) {
        count++;
      }
    }

    return count;
  }

  function showNotice(message, isError = false) {
    const notice = $("notice");
    notice.textContent = message;
    notice.classList.toggle("error", isError);
    notice.classList.remove("hidden");
  }

  function hideSlip() {
    $("salarySlip").classList.add("hidden");
  }

  function loadEmployees() {
    const select = $("employeeSelect");
    const employees = getEmployees();

    select.replaceChildren();

    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = "Select an employee";
    select.appendChild(firstOption);

    employees.forEach(employee => {
      const option = document.createElement("option");
      option.value = String(employee.id);
      option.textContent =
        `${employee.name || "Unnamed"} (${employee.id})`;

      select.appendChild(option);
    });

    if (employees.length === 0) {
      showNotice(
        "Koi employee nahi mila. Check karein ke hcm_users mein employees aur unka role 'employee' saved hai.",
        true
      );
    }

    return employees;
  }

  function findAttendanceForEmployee(employee, month) {
    const attendance = getAttendance();

    return attendance.filter(record => {
      const recordDate = String(record.date || "").slice(0, 10);

      if (!recordDate.startsWith(month)) {
        return false;
      }

      if (getUserId(record) !== String(employee.id)) {
        return false;
      }

      return true;
    });
  }

  function calculateSalary(employee, month) {
    const [year, monthNumber] = month.split("-").map(Number);
    const monthIndex = monthNumber - 1;

    const workingDays = getMonthWorkingDays(year, monthIndex);
    const monthlySalary = Number(employee.salary) || 0;

    if (workingDays === 0) {
      throw new Error("Is month ke working days calculate nahi ho sake.");
    }

    const records = findAttendanceForEmployee(employee, month);

    let present = 0;
    let absent = 0;
    let half = 0;

    const seenDates = new Set();

    records.forEach(record => {
      const date = String(record.date || "").slice(0, 10);

      if (!date || seenDates.has(date)) {
        return;
      }

      seenDates.add(date);

      const day = new Date(date + "T12:00:00").getDay();

      if (day === 0 || day === 6) {
        return;
      }

      const status = String(record.status || "").toLowerCase().trim();

      if (["half", "half-day", "half day", "halfday"].includes(status)) {
        half++;
      } else if (["absent", "absent-day"].includes(status)) {
        absent++;
      } else if (["present", "late", "checked-in", "checked-out"].includes(status)) {
        present++;
      }
    });

    const dailySalary = monthlySalary / workingDays;
    const absentDeduction = dailySalary * absent;
    const halfDeduction = dailySalary * 0.5 * half;
    const totalDeduction = absentDeduction + halfDeduction;
    const netSalary = Math.max(0, monthlySalary - totalDeduction);

    return {
      workingDays,
      present,
      absent,
      half,
      monthlySalary,
      dailySalary,
      absentDeduction,
      halfDeduction,
      totalDeduction,
      netSalary
    };
  }

  function setText(id, value) {
    $(id).textContent = value;
  }

  function generateSlip() {
    hideSlip();

    const employeeId = $("employeeSelect").value;
    const month = $("salaryMonth").value;

    if (!employeeId) {
      showNotice("Pehle employee select karein.", true);
      return;
    }

    if (!month) {
      showNotice("Salary month select karein.", true);
      return;
    }

    const employee = getEmployees().find(
      user => String(user.id) === String(employeeId)
    );

    if (!employee) {
      showNotice("Employee record nahi mila.", true);
      return;
    }

    try {
      const salary = calculateSalary(employee, month);
      const company = readData("hcm_company", {});

      setText(
        "companyName",
        typeof company === "object" && company
          ? company.name || "HCM Lite"
          : "HCM Lite"
      );

      setText("slipMonth", month);
      setText("slipDate", "Generated: " + new Date().toLocaleDateString());
      setText("employeeName", employee.name || "—");
      setText("employeeId", employee.id || "—");
      setText("employeeEmail", employee.email || "—");
      setText("employeeDepartment", employee.department || "—");

      setText("workingDays", salary.workingDays);
      setText("presentDays", salary.present);
      setText("absentDays", salary.absent);
      setText("halfDays", salary.half);

      setText("basicSalary", money(salary.monthlySalary));
      setText("dailySalary", money(salary.dailySalary));
      setText("absentDeduction", money(salary.absentDeduction));
      setText("halfDeduction", money(salary.halfDeduction));
      setText("totalDeduction", money(salary.totalDeduction));
      setText("netSalary", money(salary.netSalary));

      $("salarySlip").classList.remove("hidden");
      showNotice("Salary Slip generate ho gayi.");
    } catch (error) {
      showNotice(error.message || "Salary Slip generate nahi ho saki.", true);
    }
  }

  function checkAdminAccess() {
    const session = getSession();

    if (!session) {
      showNotice(
        "Login session nahi mila. Apne project ke login page se dobara login karein.",
        true
      );
      $("generateBtn").disabled = true;
      $("printBtn").disabled = true;
      return false;
    }

    const role = String(session.role || "").toLowerCase();

    if (role !== "admin") {
      showNotice(
        "Yeh page sirf Admin ke liye hai. Admin account se login karein.",
        true
      );
      $("generateBtn").disabled = true;
      $("printBtn").disabled = true;
      return false;
    }

    return true;
  }

  function init() {
    const now = new Date();

    $("salaryMonth").value =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    $("generateBtn").addEventListener("click", generateSlip);

    $("printBtn").addEventListener("click", () => {
      if ($("salarySlip").classList.contains("hidden")) {
        showNotice("Print se pehle Salary Slip generate karein.", true);
        return;
      }

      window.print();
    });

    if (!checkAdminAccess()) {
      return;
    }

    loadEmployees();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
