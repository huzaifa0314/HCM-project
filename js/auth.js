
/* =========================================
   HCM LITE — AUTHENTICATION
   File: js/auth.js
========================================= */

(function () {
  "use strict";

  const STORAGE = window.HCMStorage;

  if (!STORAGE) {
    console.error("HCMStorage load nahi hua. storage.js check karo.");
    return;
  }

  function getUsers() {
    return STORAGE.getCollection("users");
  }

  function getEmployees() {
    return STORAGE.getCollection("employees");
  }

  function setupComplete() {
    return STORAGE.get("setupComplete", false) === true;
  }

  function createCompanyAdmin(data) {
    if (setupComplete()) {
      return {
        success: false,
        message: "Company setup pehle hi complete ho chuka hai.",
      };
    }

    const companyName = String(data.companyName || "").trim();
    const adminName = String(data.adminName || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");

    if (!companyName || !adminName || !email || !password) {
      return {
        success: false,
        message: "Tamam fields fill karo.",
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        success: false,
        message: "Valid email address enter karo.",
      };
    }

    if (password.length < 8) {
      return {
        success: false,
        message: "Password kam az kam 8 characters ka ho.",
      };
    }

    const adminId = HCMUtils.generateId("ADM");

    const admin = {
      id: adminId,
      name: adminName,
      email: email,
      password: password,
      role: "admin",
      active: true,
      createdAt: new Date().toISOString(),
    };

    const employeeProfile = {
      id: adminId,
      userId: adminId,
      name: adminName,
      email: email,
      designation: "Administrator",
      department: "Management",
      salary: 0,
      joiningDate: HCMUtils.getToday(),
      active: true,
    };

    const company = {
      id: HCMUtils.generateId("COMP"),
      name: companyName,
      createdAt: new Date().toISOString(),
    };

    const usersSaved = STORAGE.saveCollection("users", [admin]);
    const employeesSaved = STORAGE.saveCollection(
      "employees",
      [employeeProfile]
    );
    const companySaved = STORAGE.set("company", company);
    const settingsSaved = STORAGE.saveSettings({
      companyName: companyName,
    });

    if (
      !usersSaved ||
      !employeesSaved ||
      !companySaved ||
      !settingsSaved
    ) {
      return {
        success: false,
        message: "Data save nahi hua. Browser storage check karo.",
      };
    }

    STORAGE.set("setupComplete", true);

    return {
      success: true,
      message: "Company aur Admin account create ho gaya.",
    };
  }

  function login(email, password) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const enteredPassword = String(password || "");

    if (!setupComplete()) {
      return {
        success: false,
        message: "Pehle company setup complete karo.",
      };
    }

    const user = getUsers().find(function (item) {
      return (
        String(item.email).toLowerCase() === normalizedEmail &&
        item.password === enteredPassword &&
        item.active !== false
      );
    });

    if (!user) {
      return {
        success: false,
        message: "Email ya password ghalat hai.",
      };
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    STORAGE.setCurrentUser(safeUser);

    return {
      success: true,
      user: safeUser,
      message: "Login successful.",
    };
  }

  function logout() {
    STORAGE.clearCurrentUser();
    window.location.href = "index.html";
  }

  function getCurrentUser() {
    return STORAGE.getCurrentUser();
  }

  function requireAuth(allowedRoles = []) {
    const user = getCurrentUser();

    if (!user) {
      window.location.href = "index.html";
      return false;
    }

    if (
      allowedRoles.length > 0 &&
      !allowedRoles.includes(user.role)
    ) {
      window.location.href =
        user.role === "admin" ? "admin.html" : "employee.html";

      return false;
    }

    return true;
  }

  function changePassword(oldPassword, newPassword) {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        message: "Pehle login karo.",
      };
    }

    if (String(newPassword).length < 8) {
      return {
        success: false,
        message: "Naya password kam az kam 8 characters ka ho.",
      };
    }

    const users = getUsers();
    const userIndex = users.findIndex(
      (user) => user.id === currentUser.id
    );

    if (
      userIndex === -1 ||
      users[userIndex].password !== String(oldPassword)
    ) {
      return {
        success: false,
        message: "Purana password ghalat hai.",
      };
    }

    users[userIndex].password = String(newPassword);

    const saved = STORAGE.saveCollection("users", users);

    return {
      success: saved,
      message: saved
        ? "Password change ho gaya."
        : "Password save nahi ho saka.",
    };
  }

  window.HCMAuth = {
    setupComplete,
    createCompanyAdmin,
    login,
    logout,
    getCurrentUser,
    requireAuth,
    changePassword,
  };
})();
