
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function readCollection(name) {
    try {
      if (window.HCMStorage &&
          typeof window.HCMStorage.getCollection === "function") {
        const result = window.HCMStorage.getCollection(name);
        return Array.isArray(result) ? result : [];
      }

      const result = localStorage.getItem("hcm_lite_" + name);
      const parsed = result ? JSON.parse(result) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Collection read error:", name, error);
      return [];
    }
  }

  function getCurrentUser() {
    try {
      if (window.HCMAuth &&
          typeof window.HCMAuth.getCurrentUser === "function") {
        return window.HCMAuth.getCurrentUser();
      }

      if (window.HCMStorage &&
          typeof window.HCMStorage.getCurrentUser === "function") {
        return window.HCMStorage.getCurrentUser();
      }
    } catch (error) {
      console.error("Current user error:", error);
    }

    return null;
  }

  function numberFrom(record, keys) {
    for (const key of keys) {
      const value = record && record[key];
      if (value !== undefined && value !== null && value !== "") {
        const number = Number(String(value).replace(/,/g, ""));
        if (Number.isFinite(number)) return number;
      }
    }
    return 0;
  }

  function textFrom(record, keys, fallback) {
    for (const key of keys) {
      if (record && record[key] !== undefined &&
          record[key] !== null && String(record[key]).trim() !== "") {
        return String(record[key]);
      }
    }
    return fallback || "—";
  }

  function money(amount) {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 2
    }).format(amount);
  }

  function showMessage(message) {
    const status = $("statusMessage");
    if (status) {
      status.hidden = false;
      status.textContent = message;
    }
    const content = $("payslipContent");
    if (content) content.hidden = true;
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function loadPayslip() {
    if (!window.HCMStorage) {
      showMessage("Storage module load nahi hua. js/storage.js ka path check karein.");
      return;
    }

    const user = getCurrentUser();

    if (!user) {
      showMessage("Aap login nahi hain. Pehle login karein.");
      window.setTimeout(() => {
        window.location.href = "index.html";
      }, 1200);
      return;
    }

    if (user.role !== "employee") {
      showMessage("Ye page employee ke liye hai. Employee account se login karein.");
      return;
    }

    const employees = readCollection("employees");

    const userId = String(user.id ?? user.userId ?? "");
    const userEmail = String(user.email ?? "").trim().toLowerCase();
    const employeeId = String(user.employeeId ?? "");

    const employee = employees.find((item) => {
      const itemId = String(item.id ?? item.employeeId ?? "");
      const linkedUserId = String(item.userId ?? item.user_id ?? "");
      const itemEmail = String(item.email ?? "").trim().toLowerCase();

      return (
        (userId && (itemId === userId || linkedUserId === userId)) ||
        (employeeId && itemId === employeeId) ||
        (userEmail && itemEmail === userEmail)
      );
    });

    if (!employee) {
      showMessage(
        "Aapka employee profile nahi mila. Admin se employee account aur employee record ka link check karwayein."
      );
      return;
    }

    const basic = numberFrom(employee, [
      "basicSalary", "basic_salary", "monthlySalary",
      "monthly_salary", "salary", "baseSalary"
    ]);

    const allowances = numberFrom(employee, [
      "allowances", "allowance", "totalAllowances"
    ]);

    const bonus = numberFrom(employee, [
      "bonus", "monthlyBonus", "incentive"
    ]);

    const deductions = numberFrom(employee, [
      "deductions", "deduction", "totalDeductions"
    ]);

    const net = basic + allowances + bonus - deductions;

    setText("employeeName", textFrom(employee, ["name", "fullName", "employeeName"],
      textFrom(user, ["name", "fullName", "username"], "—")));

    setText("employeeId", textFrom(employee, ["employeeCode", "employeeId", "id"],
      textFrom(user, ["employeeId", "id"], "—")));

    setText("employeeEmail", textFrom(employee, ["email"],
      textFrom(user, ["email"], "—")));

    setText("employeeDepartment", textFrom(employee, ["department", "departmentName"], "—"));
    setText("employeeDesignation", textFrom(employee, ["designation", "position", "jobTitle"], "—"));

    const now = new Date();
    setText("salaryPeriod", now.toLocaleString("en", {
      month: "long",
      year: "numeric"
    }));

    setText("basicSalary", money(basic));
    setText("allowances", money(allowances));
    setText("bonus", money(bonus));
    setText("deductions", money(deductions));
    setText("netSalary", money(net));

    const status = $("statusMessage");
    if (status) status.hidden = true;

    const content = $("payslipContent");
    if (content) content.hidden = false;

    if (basic === 0 && allowances === 0 && bonus === 0 && deductions === 0) {
      const note = document.createElement("p");
      note.className = "message no-print";
      note.textContent =
        "Employee profile mil gaya, lekin salary fields mein amount nahi mila. Admin ko employee record mein salary data enter karna hoga.";
      content.prepend(note);
    }
  }

  document.addEventListener("DOMContentLoaded", loadPayslip);
})();
