(() => {
  "use strict";

  const STORE = "cleaningInvoice.v1";
  const MAX_LOGO = 500 * 1024;
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const $ = id => document.getElementById(id);
  const form = $("invoice-form");
  const lines = $("lines");
  const status = $("status");

  // Pure total calculation, shared with the e2e test through the visible preview.
  const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const num = v => {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  function totals(items, discount, taxRate) {
    const subtotal = round2(items.reduce((s, i) => s + round2(num(i.qty) * num(i.rate)), 0));
    const disc = Math.min(num(discount), subtotal);
    const tax = round2((subtotal - disc) * num(taxRate) / 100);
    return { subtotal, discount: disc, tax, total: round2(subtotal - disc + tax) };
  }

  // Saved per browser only: business details, logo, notes, next invoice number.
  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
  };
  const save = data => {
    try { localStorage.setItem(STORE, JSON.stringify(data)); return true; } catch { return false; }
  };
  let saved = load();
  let logo = typeof saved.logo === "string" && saved.logo.startsWith("data:image/") ? saved.logo : "";

  const KEEP = ["bizName", "bizPhone", "bizEmail", "bizAddress", "notes", "invTerms"];
  function persist() {
    const data = { ...saved, logo };
    for (const k of KEEP) data[k] = form.elements[k].value;
    saved = data;
    save(data);
  }

  const pad = n => String(n).padStart(4, "0");
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const fmtDate = iso => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const addDays = (iso, days) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };

  let rowId = 0;
  function addLine(desc = "", qty = "1", rate = "") {
    rowId += 1;
    const n = lines.children.length + 1;
    const row = document.createElement("div");
    row.className = "inv-line";
    row.innerHTML = `
      <div class="field inv-line-desc"><label for="d${rowId}">Service</label><input id="d${rowId}" data-k="desc" /></div>
      <div class="field"><label for="q${rowId}">Qty</label><input id="q${rowId}" data-k="qty" type="number" inputmode="decimal" min="0" step="0.25" /></div>
      <div class="field"><label for="r${rowId}">Rate ($)</label><input id="r${rowId}" data-k="rate" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" /></div>
      <button class="inv-remove" type="button" aria-label="Remove line ${n}">Remove</button>`;
    row.querySelector('[data-k="desc"]').value = desc;
    row.querySelector('[data-k="qty"]').value = qty;
    row.querySelector('[data-k="rate"]').value = rate;
    lines.append(row);
    renumber();
    render();
    return row;
  }

  function renumber() {
    [...lines.children].forEach((row, i) => {
      row.querySelector(".inv-remove").setAttribute("aria-label", `Remove line ${i + 1}`);
    });
  }

  function items() {
    return [...lines.children].map(row => ({
      desc: row.querySelector('[data-k="desc"]').value.trim(),
      qty: row.querySelector('[data-k="qty"]').value,
      rate: row.querySelector('[data-k="rate"]').value,
    }));
  }

  // Build preview with textContent only, never innerHTML, so typed text can't become markup.
  const setText = (id, text) => { $(id).textContent = text; };
  const setLines = (id, parts) => setText(id, parts.filter(Boolean).join("\n"));

  function render() {
    const f = form.elements;
    setText("p-biz-name", f.bizName.value.trim() || "Your business name");
    setLines("p-biz-lines", [f.bizAddress.value.trim(), f.bizPhone.value.trim(), f.bizEmail.value.trim()]);
    setText("p-client-name", f.clientName.value.trim() || "Client name");
    setLines("p-client-lines", [f.clientAddress.value.trim(), f.clientContact.value.trim()]);
    setText("p-number", f.invNumber.value.trim());
    setText("p-date", fmtDate(f.invDate.value));
    setText("p-service-date", fmtDate(f.serviceDate.value));
    $("p-service-row").hidden = !f.serviceDate.value;
    const days = Number(f.invTerms.value);
    setText("p-due", days === 0 ? "On receipt" : fmtDate(addDays(f.invDate.value, days)));

    const logoEl = $("p-logo");
    logoEl.hidden = !logo;
    if (logo) logoEl.src = logo; else logoEl.removeAttribute("src");

    const body = $("p-lines");
    body.replaceChildren();
    const list = items().filter(i => i.desc || num(i.rate));
    for (const i of list) {
      const tr = document.createElement("tr");
      for (const [text, cls] of [[i.desc || "Service", ""], [String(num(i.qty)), "num"], [money.format(num(i.rate)), "num"], [money.format(round2(num(i.qty) * num(i.rate))), "num"]]) {
        const td = document.createElement("td");
        td.textContent = text;
        if (cls) td.className = cls;
        tr.append(td);
      }
      body.append(tr);
    }
    if (!list.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.className = "inv-empty";
      td.textContent = "Add a service to start your invoice.";
      tr.append(td);
      body.append(tr);
    }

    const t = totals(items(), f.discount.value, f.taxRate.value);
    setText("p-subtotal", money.format(t.subtotal));
    $("p-discount-row").hidden = !t.discount;
    setText("p-discount", "−" + money.format(t.discount));
    $("p-tax-row").hidden = !t.tax;
    setText("p-tax-label", `Sales tax (${num(f.taxRate.value)}%)`);
    setText("p-tax", money.format(t.tax));
    setText("p-total", money.format(t.total));
    setText("p-notes", f.notes.value.trim());
  }

  // Events
  form.addEventListener("input", e => {
    render();
    if (KEEP.includes(e.target.name)) persist();
  });
  form.addEventListener("change", e => {
    if (KEEP.includes(e.target.name)) persist();
  });
  lines.addEventListener("click", e => {
    const btn = e.target.closest(".inv-remove");
    if (!btn) return;
    const row = btn.closest(".inv-line");
    const next = row.nextElementSibling || row.previousElementSibling;
    row.remove();
    renumber();
    render();
    (next ? next.querySelector("input") : $("preset")).focus();
  });
  $("add-preset").addEventListener("click", () => {
    const sel = $("preset");
    if (!sel.value) { sel.focus(); return; }
    const row = addLine(sel.value);
    sel.value = "";
    row.querySelector('[data-k="rate"]').focus();
  });
  $("add-blank").addEventListener("click", () => addLine().querySelector('[data-k="desc"]').focus());

  $("biz-logo").addEventListener("change", e => {
    const file = e.target.files && e.target.files[0];
    const err = $("logo-error");
    err.textContent = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) { err.textContent = "Choose a PNG, JPEG, WebP or SVG image."; return; }
    if (file.size > MAX_LOGO) { err.textContent = "That image is over 500 KB. Choose a smaller one."; return; }
    const reader = new FileReader();
    reader.onload = () => { logo = String(reader.result); persist(); render(); };
    reader.readAsDataURL(file);
  });

  let titleBefore = document.title;
  $("download").addEventListener("click", () => {
    titleBefore = document.title;
    const f = form.elements;
    // The PDF file name comes from the page title in most browsers.
    document.title = ["Invoice", f.invNumber.value.trim(), f.clientName.value.trim()].filter(Boolean).join(" ");
    // Count this number as used, so the next invoice gets the next one.
    const m = f.invNumber.value.trim().match(/(\d+)\s*$/);
    if (m) { saved.next = Number(m[1]) + 1; persist(); }
    window.print();
  });
  window.addEventListener("afterprint", () => { document.title = titleBefore; });

  $("new-invoice").addEventListener("click", () => {
    const f = form.elements;
    for (const k of ["clientName", "clientAddress", "clientContact", "discount", "taxRate", "serviceDate"]) f[k].value = "";
    f.invNumber.value = `INV-${pad(saved.next || 1)}`;
    f.invDate.value = today();
    lines.replaceChildren();
    addLine("Standard cleaning");
    status.textContent = `New invoice ${f.invNumber.value} started. Your business details were kept.`;
    f.clientName.focus();
  });

  $("forget").addEventListener("click", () => {
    try { localStorage.removeItem(STORE); } catch { /* storage blocked: nothing saved */ }
    saved = {};
    logo = "";
    $("biz-logo").value = "";
    for (const k of ["bizName", "bizPhone", "bizEmail", "bizAddress"]) form.elements[k].value = "";
    render();
    status.textContent = "Saved details removed from this browser.";
  });

  // Start
  for (const k of KEEP) if (typeof saved[k] === "string") form.elements[k].value = saved[k];
  form.elements.invNumber.value = `INV-${pad(saved.next || 1)}`;
  form.elements.invDate.value = today();
  addLine("Standard cleaning");
  render();
})();
