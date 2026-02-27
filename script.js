(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile nav
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-nav-menu]");

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    menu.classList.toggle("is-open", open);
  }

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      setMenu(!isOpen);
    });

    // Close on link click (mobile)
    menu.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.tagName === "A") setMenu(false);
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenu(false);
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      const target = e.target;
      const isClickInside = (header && header.contains(target)) || (menu && menu.contains(target)) || (toggle && toggle.contains(target));
      if (!isClickInside) setMenu(false);
    });
  }

  // Contact form (mailto fallback)
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");

  const showError = (field, msg) => {
    const el = document.querySelector(`[data-error-for="${field}"]`);
    if (el) el.textContent = msg || "";
  };

  const validate = (data) => {
    let ok = true;
    showError("name", "");
    showError("email", "");
    showError("message", "");

    if (!data.name || data.name.trim().length < 2) {
      showError("name", "Please enter your name.");
      ok = false;
    }

    const email = (data.email || "").trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      showError("email", "Please enter a valid email address.");
      ok = false;
    }

    if (!data.message || data.message.trim().length < 10) {
      showError("message", "Please add a short message (10+ characters).");
      ok = false;
    }

    return ok;
  };

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const data = {
        name: document.getElementById("name")?.value || "",
        email: document.getElementById("email")?.value || "",
        company: document.getElementById("company")?.value || "",
        message: document.getElementById("message")?.value || ""
      };

      if (!validate(data)) {
        if (status) status.textContent = "Please fix the highlighted fields and try again.";
        return;
      }

      const to = "hello@sandboxdigitallabs.com";
      const subject = encodeURIComponent(`Project inquiry from ${data.name}`);
      const body = encodeURIComponent(
        [
          `Name: ${data.name}`,
          `Email: ${data.email}`,
          `Company: ${data.company || "(not provided)"}`,
          "",
          "Message:",
          data.message
        ].join("\n")
      );

      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      if (status) status.textContent = "Opening your email client…";
      form.reset();
    });
  }
})();