
/* HCM LITE — EMPLOYEE MANAGEMENT */

(function () {
  "use strict";

  const storage = window.HCMStorage;
  const auth = window.HCMAuth;
  const utils = window.HCMUtils;

  const form = document.getElementById("employeeForm");
  const tableBody = document.getElementById("employeeTableBody");
  const searchInput = document.getElementById("employeeSearch");
  const messageBox = document.getElementById("employeeMessage");
  const cancelButton = document.getElementById("cancelEdit");
  const submitButton = document.getElementById("submitEmployee");
  const logoutButton = document.getElementById("logoutButton");

  if (!storage || !auth || !utils || !form || !tableBody) {
    console.error("Employee page ya JavaScript files load nahi hui.");
    return;
  }

  if (!auth.requireAuth(["admin"])) return;

  let editingId = null;

  function field(name) {
    return form.elements.namedItem(name);
  }

  function showMessage(text, type = "info") {
    messageBox.textContent = text;
    messageBox.className = "message message-" + type;
    messageBox.hidden = false;
  }

  function getEmployees() {
    return storage.getCollection("employees");
  }

  function resetForm() {
    form.reset();
    editingId = null;

    field("password").required = true;
    field("password").placeholder = "At least 8 characters";

    submitButton.textContent = "Add employee";
    cancelButton.hidden = true;
  }

  function renderEmployees() {
    const admin = auth.getCurrentUser();
    const query = String(searchInput.value || "").trim().toLowerCase();

    const employees = getEmployees().filter(function (employee) {
      // Admin ko employee list mein show nahi karna.
      if (admin && employee.id === admin.id) return false;

      const searchable = [
        employee.name,
        employee.email,
        employee.department,
        employee.designation
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });

    if (!employees.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-cell">
            ${query
              ? "Koi matching employee nahi mila."
              : "Abhi koi employee add nahi hua."}
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = employees.map(function (employee) {
      const active = employee.active !== false;
      const id = utils.escapeHTML(employee.id);

      return `
        <tr>
          <td><strong>${utils.escapeHTML(employee.name)}</strong></td>
          <td>${utils.escapeHTML(employee.email)}</td>
          <td>${utils.escapeHTML(employee.department || "—")}</td>
          <td>${utils.escapeHTML(employee.designation || "—")}</td>
          <td>
            <span class="status ${active ? "status-active" : "status-inactive"}">
              ${active ? "Active" : "Inactive"}
            </span>
          </td>
          <td>
            <div class="actions">
              <button type="button" class="small-button"
                data-action="edit" data-id="${id}">Edit</button>

              <button type="button" class="small-button"
                data-action="toggle" data-id="${id}">
                ${active ? "Deactivate" : "Activate"}
              </button>

              <button type="button" class="small-button danger-button"
                data-action="delete" data-id="${id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function readForm() {
    return {
      name: String(field("name").value || "").trim(),
      email: String(field("email").value || "").trim().toLowerCase(),
      department: String(field("department").value || "").trim(),
      designation: String(field("designation").value || "").trim(),
      salary: Number(field("salary").value),
      joiningDate: field("joiningDate").value,
      password: String(field("password").value || "")
    };
  }

  function validate(data) {
    if (
      !data.name ||
      !data.email ||
      !data.department ||
      !data.designation ||
      !data.joiningDate
    ) {
      return "Tamam required fields fill karo.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return "Valid email address enter karo.";
    }

    if (!Number.isFinite(data.salary) || data.salary < 0) {
      return "Salary zero ya us se zyada honi chahiye.";
    }

    if (data.password && data.password.length < 8) {
      return "Password kam az kam 8 characters ka hona chahiye.";
    }

    const duplicate = storage.getCollection("users").find(function (user) {
      return user.email.toLowerCase() === data.email &&
        user.id !== editingId;
    });

    if (duplicate) {
      return "Yeh email pehle se kisi account mein use ho rahi hai.";
    }

    if (!editingId && !data.password) {
      return "Employee ke liye login password enter karo.";
    }

    return null;
  }

  function saveEmployee(data) {
    const error = validate(data);

    if (error) {
      showMessage(error, "error");
      return;
    }

    const employees = getEmployees();
    const users = storage.getCollection("users");

    if (editingId) {
      const employeeIndex = employees.findIndex(
        (item) => item.id === editingId
      );
      const userIndex = users.findIndex(
        (item) => item.id === editingId
      );

      if (employeeIndex < 0 || userIndex < 0) {
        showMessage("Employee ya login account nahi mila.", "error");
        return;
      }

      const oldEmployees = JSON.stringify(employees);
      const oldUsers = JSON.stringify(users);

      employees[employeeIndex] = {
        ...employees[employeeIndex],
        name: data.name,
        email: data.email,
        department: data.department,
        designation: data.designation,
        salary: data.salary,
        joiningDate: data.joiningDate
      };

      users[userIndex] = {
        ...users[userIndex],
        name: data.name,
        email: data.email
      };

      if (data.password) {
        users[userIndex].password = data.password;
      }

      const employeeSaved = storage.saveCollection("employees", employees);
      const userSaved = storage.saveCollection("users", users);

      if (!employeeSaved || !userSaved) {
        storage.saveCollection("employees", JSON.parse(oldEmployees));
        storage.saveCollection("users", JSON.parse(oldUsers));
        showMessage("Changes save nahi ho sake. Dobara try karo.", "error");
        return;
      }

      resetForm();
      renderEmployees();
      showMessage("Employee details update ho gayi.", "success");
      return;
    }

    const id = utils.generateId("EMP");

    const employee = {
      id: id,
      userId: id,
      name: data.name,
      email: data.email,
      department: data.department,
      designation: data.designation,
      salary: data.salary,
      joiningDate: data.joiningDate,
      active: true,
      createdAt: new Date().toISOString()
    };

    const user = {
      id: id,
      name: data.name,
      email: data.email,
      password: data.password,
      role: "employee",
      active: true,
      createdAt: new Date().toISOString()
    };

    const employeeSaved = storage.saveCollection(
      "employees",
      [...employees, employee]
    );

    if (!employeeSaved) {
      showMessage("Employee save nahi ho saka.", "error");
      return;
    }

    const userSaved = storage.saveCollection("users", [...users, user]);

    if (!userSaved) {
      storage.saveCollection("employees", employees);
      showMessage("Login account save nahi hua.", "error");
      return;
    }

    resetForm();
    renderEmployees();
    showMessage(
      "Employee aur login account successfully create ho gaye.",
      "success"
    );
  }

  function startEdit(id) {
    const employee = getEmployees().find((item) => item.id === id);

    if (!employee) {
      showMessage("Employee nahi mila.", "error");
      return;
    }

    editingId = id;

    field("name").value = employee.name || "";
    field("email").value = employee.email || "";
    field("department").value = employee.department || "";
    field("designation").value = employee.designation || "";
    field("salary").value = employee.salary ?? 0;
    field("joiningDate").value = employee.joiningDate || "";
    field("password").value = "";
    field("password").required = false;
    field("password").placeholder = "Khali chhoro agar password change nahi karna";

    submitButton.textContent = "Save changes";
    cancelButton.hidden = false;

    document.getElementById("employeeFormCard").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function toggleEmployee(id) {
    const employees = getEmployees();
    const employee = employees.find((item) => item.id === id);

    if (!employee) return;

    const nextActive = employee.active === false;

    if (!nextActive && !window.confirm(
      "Kya is employee ko deactivate karna hai?"
    )) {
      return;
    }

    const users = storage.getCollection("users");
    const user = users.find((item) => item.id === id);

    const oldEmployees = JSON.stringify(employees);
    const oldUsers = JSON.stringify(users);

    employee.active = nextActive;
    if (user) user.active = nextActive;

    const employeeSaved = storage.saveCollection("employees", employees);
    const userSaved = storage.saveCollection("users", users);

    if (!employeeSaved || !userSaved) {
      storage.saveCollection("employees", JSON.parse(oldEmployees));
      storage.saveCollection("users", JSON.parse(oldUsers));
      showMessage("Status update nahi ho saka.", "error");
      return;
    }

    renderEmployees();
    showMessage(
      nextActive ? "Employee activate ho gaya." : "Employee deactivate ho gaya.",
      "success"
    );
  }

  function deleteEmployee(id) {
    const employee = getEmployees().find((item) => item.id === id);

    if (!employee) return;

    if (!window.confirm(
      `Kya "${employee.name}" ko permanently delete karna hai?`
    )) {
      return;
    }

    const employees = getEmployees();
    const users = storage.getCollection("users");
    const updatedEmployees = employees.filter((item) => item.id !== id);
    const updatedUsers = users.filter((item) => item.id !== id);

    if (!storage.saveCollection("employees", updatedEmployees)) {
      showMessage("Employee delete nahi hua.", "error");
      return;
    }

    if (!storage.saveCollection("users", updatedUsers)) {
      storage.saveCollection("employees", employees);
      showMessage("Account delete nahi hua. Dobara try karo.", "error");
      return;
    }

    if (editingId === id) resetForm();

    renderEmployees();
    showMessage("Employee aur uska login account delete ho gaya.", "success");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    saveEmployee(readForm());
  });

  cancelButton.addEventListener("click", resetForm);
  searchInput.addEventListener("input", renderEmployees);

  tableBody.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;

    if (button.dataset.action === "edit") startEdit(id);
    if (button.dataset.action === "toggle") toggleEmployee(id);
    if (button.dataset.action === "delete") deleteEmployee(id);
  });

  logoutButton.addEventListener("click", auth.logout);

  renderEmployees();
})();
