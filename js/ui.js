
(function () {
  "use strict";

  const HCMUI = {};

  // Screen par temporary notification dikhata hai.
  HCMUI.notify = function (message, type) {
    let box = document.getElementById("hcmToast");

    if (!box) {
      box = document.createElement("div");
      box.id = "hcmToast";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }

    box.className = "hcm-toast " + (type || "info");
    box.textContent = String(message);
    box.hidden = false;

    if (box._hideTimer) clearTimeout(box._hideTimer);

    box._hideTimer = setTimeout(function () {
      box.hidden = true;
    }, 3500);
  };

  // Search input ko table ki rows ke saath connect karta hai.
  HCMUI.bindTableSearch = function (input, table) {
    const searchBox = typeof input === "string"
      ? document.querySelector(input) : input;
    const targetTable = typeof table === "string"
      ? document.querySelector(table) : table;

    if (!searchBox || !targetTable) {
      console.warn("Table search: input ya table nahi mila.");
      return false;
    }

    searchBox.addEventListener("input", function () {
      const query = searchBox.value.trim().toLowerCase();
      const rows = targetTable.querySelectorAll("tbody tr");

      rows.forEach(function (row) {
        row.hidden = !row.textContent.toLowerCase().includes(query);
      });
    });

    return true;
  };

  // HTML table ko CSV file ke taur par download karta hai.
  HCMUI.exportTableCSV = function (table, filename) {
    const targetTable = typeof table === "string"
      ? document.querySelector(table) : table;

    if (!targetTable) {
      HCMUI.notify("Export ke liye table nahi mila.", "error");
      return false;
    }

    const rows = Array.from(targetTable.querySelectorAll("tr"));

    if (!rows.length) {
      HCMUI.notify("Export karne ke liye data nahi hai.", "error");
      return false;
    }

    const csv = rows.map(function (row) {
      return Array.from(row.querySelectorAll("th, td"))
        .map(function (cell) {
          const value = cell.innerText.replace(/\s+/g, " ").trim();
          return '"' + value.replace(/"/g, '""') + '"';
        })
        .join(",");
    }).join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "hcm-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    HCMUI.notify("CSV file export ho gayi.", "success");
    return true;
  };

  // Buttons ko data attributes ke zariye connect karta hai.
  document.addEventListener("click", function (event) {
    const exportButton = event.target.closest("[data-hcm-export]");
    if (exportButton) {
      const tableSelector = exportButton.getAttribute("data-hcm-export");
      const filename = exportButton.getAttribute("data-hcm-filename");
      HCMUI.exportTableCSV(tableSelector, filename);
    }

    const searchInput = event.target.closest("[data-hcm-search]");
    if (searchInput && !searchInput.dataset.hcmSearchBound) {
      const tableSelector = searchInput.getAttribute("data-hcm-search");
      searchInput.dataset.hcmSearchBound = "true";
      HCMUI.bindTableSearch(searchInput, tableSelector);
    }
  });

  window.HCMUI = HCMUI;
})();
