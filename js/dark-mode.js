
(function () {
  const storageKey = "hcm_dark_mode";
  const enabled = localStorage.getItem(storageKey) === "on";

  document.body.classList.toggle("dark-mode", enabled);

  const button = document.createElement("button");
  button.id = "dark-mode-toggle";
  button.type = "button";
  button.textContent = enabled ? "☀️ Light Mode" : "🌙 Dark Mode";
  button.setAttribute("aria-label", "Toggle dark mode");

  button.addEventListener("click", function () {
    const isDark = document.body.classList.toggle("dark-mode");

    localStorage.setItem(storageKey, isDark ? "on" : "off");
    button.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  });

  document.body.appendChild(button);
})();
