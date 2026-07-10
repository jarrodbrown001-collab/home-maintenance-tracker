(function () {
  "use strict";

  var STORAGE_KEY = "house-log-v1";

  var SYSTEMS = [
    { id: "roof",       name: "Roof & Gutters",        icon: '<path d="M3 12 12 5l9 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 11v8h14v-8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 15h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
    { id: "hvac",       name: "HVAC",                  icon: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3v4.2M12 16.8V21M3 12h4.2M16.8 12H21M5.6 5.6l3 3M15.4 15.4l3 3M18.4 5.6l-3 3M8.6 15.4l-3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
    { id: "plumbing",   name: "Plumbing & Water",      icon: '<path d="M12 4c2.6 3.4 5 6.4 5 9.2A5 5 0 0 1 7 13.2C7 10.4 9.4 7.4 12 4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' },
    { id: "electrical", name: "Electrical",            icon: '<path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' },
    { id: "exterior",   name: "Exterior & Structure",  icon: '<rect x="4" y="6" width="16" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 11h16M4 15.5h16M9.5 6v14M15 6v14" fill="none" stroke="currentColor" stroke-width="1.2"/>' },
    { id: "windows",    name: "Windows & Doors",       icon: '<rect x="5" y="4" width="14" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 4v16M5 12h14" fill="none" stroke="currentColor" stroke-width="1.3"/>' },
    { id: "appliances", name: "Appliances",            icon: '<rect x="5" y="3.5" width="14" height="17" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 6.5h1.2M12.5 6.5h1.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' },
    { id: "safety",     name: "Interior & Safety",     icon: '<circle cx="12" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9.5 10a2.5 2.5 0 0 1 2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><rect x="10.3" y="16" width="3.4" height="4.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/>' },
    { id: "grounds",    name: "Yard & Grounds",        icon: '<path d="M12 21c0-6 0-10.5 0-15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 9c0-3 2.4-5 5.5-5C17.5 7 15 9 12 9ZM12 13c0-2.6-2-4.4-4.8-4.4C7.2 11 9.4 13 12 13Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' }
  ];
  var SYS_BY_ID = {};
  SYSTEMS.forEach(function (s) { SYS_BY_ID[s.id] = s; });

  var TYPE_LABEL = { maintenance: "Maintenance", repair: "Repair", upgrade: "Upgrade", renovation: "Renovation" };

  var state = { houseName: "", houseAddress: "", entries: [] };
  var filters = { search: "", system: "", type: "", sort: "date-desc" };
  var editingId = null;
  var currentPhotoDataUrl = null;
  var toastTimer = null;

  // ---------- persistence ----------
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        state.houseName = parsed.houseName || "";
        state.houseAddress = parsed.houseAddress || "";
        state.entries = parsed.entries || [];
        return true;
      }
    } catch (e) {}
    return false;
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      window.alert("Storage is full — try removing a photo from an entry, or export a backup and trim old entries.");
    }
  }

  // ---------- date helpers ----------
  function todayISO() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return isoOf(d);
  }
  function isoOf(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function addMonths(iso, months) {
    var parts = iso.split("-").map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setMonth(d.getMonth() + months);
    return isoOf(d);
  }
  function daysBetween(isoA, isoB) {
    var a = new Date(isoA + "T00:00:00");
    var b = new Date(isoB + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }
  function fmtDate(iso) {
    var parts = iso.split("-").map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  function fmtDateShort(iso) {
    var parts = iso.split("-").map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  function fmtMoney(n) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  function uid() { return "e" + Math.random().toString(36).slice(2, 10); }

  // ---------- seed data ----------
  function seedData() {
    var today = todayISO();
    function back(months) { return addMonths(today, -months); }
    var rows = [
      { system: "hvac", title: "Furnace filter change", type: "maintenance", months: 3, date: back(2), cost: 22 },
      { system: "hvac", title: "AC tune-up & coil clean", type: "maintenance", months: 12, date: back(14), cost: 180 },
      { system: "roof", title: "Gutter clear-out", type: "maintenance", months: 6, date: back(7), cost: 0, notes: "DIY, front and back gutters" },
      { system: "roof", title: "Roof inspection", type: "maintenance", months: 24, date: back(30), cost: 150 },
      { system: "plumbing", title: "Water heater flush", type: "maintenance", months: 12, date: back(13), cost: 0 },
      { system: "plumbing", title: "Water softener salt refill", type: "maintenance", months: 2, date: back(1), cost: 45 },
      { system: "safety", title: "Smoke & CO detector batteries", type: "maintenance", months: 6, date: back(8), cost: 18 },
      { system: "appliances", title: "Dryer vent cleaning", type: "maintenance", months: 12, date: back(15), cost: 120 },
      { system: "exterior", title: "Driveway sealcoating", type: "maintenance", months: 24, date: back(3), cost: 340 },
      { system: "grounds", title: "Sprinkler winterization", type: "maintenance", months: 12, date: back(9), cost: 90 },
      { system: "windows", title: "Re-caulk exterior trim", type: "maintenance", months: 18, date: back(20), cost: 0, notes: "Weekend project" },

      { system: "appliances", title: "Garbage disposal replaced", type: "repair", date: back(4), cost: 165, notes: "InSinkErator Badger 5" },
      { system: "plumbing", title: "Fixed slow leak under kitchen sink", type: "repair", date: back(6), cost: 90 },
      { system: "electrical", title: "Replaced GFCI outlet, half bath", type: "repair", date: back(11), cost: 60 },
      { system: "exterior", title: "Patched siding after storm", type: "repair", date: back(17), cost: 280 },
      { system: "windows", title: "Garage door opener sensor fix", type: "repair", date: back(1), cost: 75 },

      { system: "hvac", title: "New water heater installed", type: "upgrade", date: back(13), cost: 1450, notes: "50-gal, 12-yr warranty" },
      { system: "safety", title: "Smart thermostat installed", type: "upgrade", date: back(5), cost: 240 },
      { system: "exterior", title: "LED flood lights, driveway", type: "upgrade", date: back(9), cost: 130 },

      { system: "appliances", title: "Kitchen remodel — counters & cabinets", type: "renovation", date: back(22), cost: 18400 },
      { system: "safety", title: "Primary bath renovation", type: "renovation", date: back(31), cost: 12800 }
    ];
    return rows.map(function (r) {
      var e = {
        id: uid(),
        system: r.system,
        title: r.title,
        type: r.type,
        date: r.date,
        cost: r.cost,
        notes: r.notes || "",
        recurring: !!r.months,
        intervalMonths: r.months || null
      };
      e.nextDue = e.recurring ? addMonths(e.date, e.intervalMonths) : null;
      return e;
    });
  }

  function loadSample() {
    if (state.entries.length && !window.confirm("Replace the current log with the sample data? This can't be undone.")) return;
    state.houseName = state.houseName || "142 Maple Ridge Road";
    state.houseAddress = state.houseAddress || "Purchased 2019 · 2,150 sq ft";
    state.entries = seedData();
    save();
    renderAll();
  }

  // ---------- derived data ----------
  function withComputed(e) {
    var status = null, daysUntil = null;
    if (e.recurring && e.nextDue) {
      daysUntil = daysBetween(todayISO(), e.nextDue);
      status = daysUntil < 0 ? "overdue" : daysUntil <= 30 ? "soon" : "ok";
    }
    return { entry: e, status: status, daysUntil: daysUntil };
  }

  function latestPerTitleBySystem(systemId) {
    var groups = {};
    state.entries.forEach(function (e) {
      if (e.system !== systemId || !e.recurring) return;
      var key = e.title.trim().toLowerCase();
      if (!groups[key] || e.date > groups[key].date) groups[key] = e;
    });
    return Object.keys(groups).map(function (k) { return groups[k]; });
  }

  // ---------- rendering ----------
  function renderAll() {
    document.getElementById("houseName").value = state.houseName;
    document.getElementById("houseAddr").value = state.houseAddress;
    renderStats();
    renderChart();
    renderSystems();
    renderFilterOptions();
    renderTable();
    renderPrintHeader();
  }

  function renderPrintHeader() {
    document.getElementById("printTitle").textContent = state.houseName || "House Log";
    document.getElementById("printSub").textContent = state.houseAddress || "";
    document.getElementById("printMeta").textContent =
      "Printed " + fmtDate(todayISO()) + " · " + state.entries.length + " entries on record";
  }

  function renderStats() {
    var overdue = 0, soon = 0, ytdSpend = 0, total = state.entries.length;
    var yearNow = new Date().getFullYear();
    state.entries.forEach(function (e) {
      if (new Date(e.date + "T00:00:00").getFullYear() === yearNow) ytdSpend += Number(e.cost) || 0;
    });
    SYSTEMS.forEach(function (s) {
      latestPerTitleBySystem(s.id).forEach(function (e) {
        var c = withComputed(e);
        if (c.status === "overdue") overdue++;
        else if (c.status === "soon") soon++;
      });
    });

    var stats = [
      { label: "Overdue", value: overdue, tone: overdue > 0 ? "tone-critical" : "", sub: "past their interval" },
      { label: "Due within 30 days", value: soon, tone: soon > 0 ? "tone-warn" : "", sub: "coming up" },
      { label: "Spent this year", value: fmtMoney(ytdSpend), tone: "", sub: yearNow + " to date" },
      { label: "Entries on record", value: total, tone: "", sub: "since first logged" }
    ];
    document.getElementById("statRow").innerHTML = stats.map(function (s) {
      return '<div class="stat"><p class="label">' + s.label + '</p>' +
        '<div class="value ' + s.tone + '">' + s.value + '</div>' +
        '<p class="sub">' + s.sub + '</p></div>';
    }).join("");
  }

  function renderChart() {
    var yearNow = new Date().getFullYear();
    var totals = {};
    state.entries.forEach(function (e) {
      if (new Date(e.date + "T00:00:00").getFullYear() !== yearNow) return;
      totals[e.system] = (totals[e.system] || 0) + (Number(e.cost) || 0);
    });
    var rows = SYSTEMS.map(function (s) { return { name: s.name, val: totals[s.id] || 0 }; })
      .filter(function (r) { return r.val > 0; })
      .sort(function (a, b) { return b.val - a.val; });

    var el = document.getElementById("chartCard");
    if (!rows.length) {
      el.innerHTML = '<p class="chart-empty">No spend logged for ' + yearNow + ' yet.</p>';
      return;
    }
    var max = rows[0].val;
    el.innerHTML = rows.map(function (r) {
      var pct = Math.max(4, Math.round((r.val / max) * 100));
      return '<div class="bar-row">' +
        '<div class="bar-label" title="' + r.name + '">' + r.name + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="bar-value">' + fmtMoney(r.val) + '</div>' +
        '</div>';
    }).join("");
  }

  function renderSystems() {
    var html = SYSTEMS.map(function (s) {
      var actives = latestPerTitleBySystem(s.id).map(withComputed).sort(function (a, b) {
        return a.entry.nextDue < b.entry.nextDue ? -1 : 1;
      });
      var top = actives[0];
      var pillHtml, itemHtml, dueHtml;
      if (top) {
        var toneClass = "tone-" + top.status;
        var toneText = top.status === "overdue" ? (Math.abs(top.daysUntil) + "d overdue")
          : top.status === "soon" ? "due soon" : "on track";
        pillHtml = '<span class="pill ' + toneClass + '">' + toneText + '</span>';
        itemHtml = top.entry.title;
        dueHtml = '<div class="next-due-date">Next due ' + fmtDateShort(top.entry.nextDue) + '</div>';
      } else {
        pillHtml = '<span class="pill tone-none">unscheduled</span>';
        itemHtml = '<span class="muted">No recurring maintenance logged yet</span>';
        dueHtml = "";
      }
      var extra = actives.length > 1 ? '<span class="track-count">+' + (actives.length - 1) + ' more tracked</span>' : '<span class="track-count"></span>';
      return '<div class="system-card">' +
        '<div class="head"><svg viewBox="0 0 24 24">' + s.icon + '</svg><span class="sys-name">' + s.name + '</span>' + pillHtml + '</div>' +
        '<div class="next-item">' + itemHtml + dueHtml + '</div>' +
        '<div class="foot">' + extra + '<button class="link-btn" data-quick-system="' + s.id + '" data-quick-title="' + (top ? top.entry.title.replace(/"/g, "&quot;") : "") + '" data-quick-interval="' + (top ? top.entry.intervalMonths : "") + '">Log service &rarr;</button></div>' +
        '</div>';
    }).join("");
    document.getElementById("systemsGrid").innerHTML = html;

    document.querySelectorAll("[data-quick-system]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openPanel(null, {
          system: btn.getAttribute("data-quick-system"),
          title: btn.getAttribute("data-quick-title") || "",
          interval: btn.getAttribute("data-quick-interval") || ""
        });
      });
    });
  }

  function renderFilterOptions() {
    var sel = document.getElementById("fSystem");
    if (sel.options.length <= 1) {
      SYSTEMS.forEach(function (s) {
        var o = document.createElement("option");
        o.value = s.id; o.textContent = s.name;
        sel.appendChild(o);
      });
    }
    var fldSystem = document.getElementById("fldSystem");
    if (fldSystem.options.length === 0) {
      SYSTEMS.forEach(function (s) {
        var o = document.createElement("option");
        o.value = s.id; o.textContent = s.name;
        fldSystem.appendChild(o);
      });
    }
  }

  function renderTable() {
    var rows = state.entries.slice();
    var q = filters.search.trim().toLowerCase();
    if (q) rows = rows.filter(function (e) { return (e.title + " " + e.notes).toLowerCase().indexOf(q) !== -1; });
    if (filters.system) rows = rows.filter(function (e) { return e.system === filters.system; });
    if (filters.type) rows = rows.filter(function (e) { return e.type === filters.type; });

    rows.sort(function (a, b) {
      switch (filters.sort) {
        case "date-asc": return a.date < b.date ? -1 : 1;
        case "cost-desc": return (Number(b.cost) || 0) - (Number(a.cost) || 0);
        case "cost-asc": return (Number(a.cost) || 0) - (Number(b.cost) || 0);
        default: return a.date < b.date ? 1 : -1;
      }
    });

    var body = document.getElementById("logBody");
    if (!rows.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="6">No entries match. Try clearing filters, or log the first one.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (e) {
      var sys = SYS_BY_ID[e.system];
      var recur = e.recurring ? ('every ' + e.intervalMonths + ' mo · next ' + fmtDateShort(e.nextDue)) : "—";
      var photoChip = e.photo
        ? '<button type="button" class="photo-chip" data-photo="' + e.id + '" aria-label="View attached photo">' +
          '<svg viewBox="0 0 24 24" width="13" height="13"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.1" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>' +
          '</button>'
        : '';
      return '<tr>' +
        '<td class="col-date">' + fmtDate(e.date) + '</td>' +
        '<td>' + (sys ? sys.name : e.system) + '</td>' +
        '<td><div class="item-title-row"><span class="item-title">' + escapeHtml(e.title) + '</span>' + photoChip + '</div>' +
          '<span class="type-chip">' + TYPE_LABEL[e.type] + '</span>' +
          (e.notes ? '<div class="item-notes">' + escapeHtml(e.notes) + '</div>' : '') + '</td>' +
        '<td class="recur-note">' + recur + '</td>' +
        '<td class="col-cost">' + fmtMoney(e.cost) + '</td>' +
        '<td class="col-actions">' +
          '<button class="icon-btn" data-edit="' + e.id + '">Edit</button>' +
          '<button class="icon-btn danger" data-del="' + e.id + '">Delete</button>' +
        '</td></tr>';
    }).join("");

    body.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openPanel(b.getAttribute("data-edit")); });
    });
    body.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () { deleteEntry(b.getAttribute("data-del")); });
    });
    body.querySelectorAll("[data-photo]").forEach(function (b) {
      b.addEventListener("click", function () {
        var e = state.entries.find(function (x) { return x.id === b.getAttribute("data-photo"); });
        if (e && e.photo) openLightbox(e.photo);
      });
    });
  }

  // ---------- delete with undo ----------
  function deleteEntry(id) {
    var idx = state.entries.findIndex(function (x) { return x.id === id; });
    if (idx === -1) return;
    var removed = state.entries[idx];
    var atIndex = idx;
    state.entries.splice(idx, 1);
    save();
    renderAll();
    showUndoToast('Deleted "' + removed.title + '"', function () {
      state.entries.splice(atIndex, 0, removed);
      save();
      renderAll();
    });
  }

  function showUndoToast(message, onUndo) {
    clearTimeout(toastTimer);
    var toast = document.getElementById("toast");
    toast.innerHTML = "<span>" + escapeHtml(message) + '</span><button type="button" class="toast-undo" id="toastUndoBtn">Undo</button>';
    toast.classList.add("show");
    document.getElementById("toastUndoBtn").addEventListener("click", function () {
      clearTimeout(toastTimer);
      toast.classList.remove("show");
      onUndo();
    });
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 6000);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- panel ----------
  var overlay = document.getElementById("overlay");
  var panel = document.getElementById("panel");
  var recurBlock = document.getElementById("recurBlock");

  function openPanel(id, prefill) {
    editingId = id || null;
    document.getElementById("panelTitle").textContent = editingId ? "Edit entry" : "Log an entry";
    document.getElementById("deleteEntryBtn").style.display = editingId ? "inline-block" : "none";

    document.getElementById("fldPhoto").value = "";

    if (editingId) {
      var e = state.entries.find(function (x) { return x.id === editingId; });
      document.getElementById("fldTitle").value = e.title;
      document.getElementById("fldSystem").value = e.system;
      document.getElementById("fldType").value = e.type;
      document.getElementById("fldDate").value = e.date;
      document.getElementById("fldCost").value = e.cost || "";
      document.getElementById("fldNotes").value = e.notes || "";
      document.getElementById("fldRecurs").checked = !!e.recurring;
      document.getElementById("fldInterval").value = e.intervalMonths || "";
      currentPhotoDataUrl = e.photo || null;
    } else {
      document.getElementById("fldTitle").value = prefill && prefill.title ? prefill.title : "";
      document.getElementById("fldSystem").value = prefill && prefill.system ? prefill.system : SYSTEMS[0].id;
      document.getElementById("fldType").value = "maintenance";
      document.getElementById("fldDate").value = todayISO();
      document.getElementById("fldCost").value = "";
      document.getElementById("fldNotes").value = "";
      document.getElementById("fldRecurs").checked = !!(prefill && prefill.interval);
      document.getElementById("fldInterval").value = prefill && prefill.interval ? prefill.interval : "";
      currentPhotoDataUrl = null;
    }
    syncPhotoPreview();
    syncRecurVisibility();
    overlay.classList.add("open");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    setTimeout(function () { document.getElementById("fldTitle").focus(); }, 50);
  }

  function closePanel() {
    overlay.classList.remove("open");
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    editingId = null;
  }

  function syncRecurVisibility() {
    var isMaint = document.getElementById("fldType").value === "maintenance";
    recurBlock.classList.toggle("hidden", !isMaint);
    if (!isMaint) document.getElementById("fldRecurs").checked = false;
  }

  // ---------- photo attach ----------
  function syncPhotoPreview() {
    var wrap = document.getElementById("photoPreviewWrap");
    if (currentPhotoDataUrl) {
      document.getElementById("photoPreview").src = currentPhotoDataUrl;
      wrap.classList.remove("hidden");
    } else {
      document.getElementById("photoPreview").src = "";
      wrap.classList.add("hidden");
    }
  }

  function readAndCompressImage(file, maxDim, quality, callback) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var w = Math.round(img.width * scale);
        var h = Math.round(img.height * scale);
        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  document.getElementById("fldPhoto").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    readAndCompressImage(file, 900, 0.72, function (dataUrl) {
      currentPhotoDataUrl = dataUrl;
      syncPhotoPreview();
    });
  });
  document.getElementById("removePhotoBtn").addEventListener("click", function () {
    currentPhotoDataUrl = null;
    document.getElementById("fldPhoto").value = "";
    syncPhotoPreview();
  });

  // ---------- lightbox ----------
  var lightbox = document.getElementById("lightbox");
  function openLightbox(url) {
    document.getElementById("lightboxImg").src = url;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
  }
  function closeLightbox() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.getElementById("lightboxImg").src = "";
  }
  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });

  document.getElementById("fldType").addEventListener("change", syncRecurVisibility);
  document.getElementById("newEntryBtn").addEventListener("click", function () { openPanel(null); });
  document.getElementById("panelClose").addEventListener("click", closePanel);
  document.getElementById("cancelBtn").addEventListener("click", closePanel);
  overlay.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (lightbox.classList.contains("open")) closeLightbox();
    else if (panel.classList.contains("open")) closePanel();
  });

  document.getElementById("saveBtn").addEventListener("click", function () {
    var title = document.getElementById("fldTitle").value.trim();
    var date = document.getElementById("fldDate").value;
    if (!title) { document.getElementById("fldTitle").focus(); return; }
    if (!date) { document.getElementById("fldDate").focus(); return; }

    var recurring = document.getElementById("fldRecurs").checked;
    var interval = parseInt(document.getElementById("fldInterval").value, 10);
    if (recurring && (!interval || interval < 1)) { document.getElementById("fldInterval").focus(); return; }

    var payload = {
      title: title,
      system: document.getElementById("fldSystem").value,
      type: document.getElementById("fldType").value,
      date: date,
      cost: document.getElementById("fldCost").value === "" ? null : Number(document.getElementById("fldCost").value),
      notes: document.getElementById("fldNotes").value.trim(),
      recurring: recurring,
      intervalMonths: recurring ? interval : null,
      photo: currentPhotoDataUrl || null
    };
    payload.nextDue = recurring ? addMonths(date, interval) : null;

    if (editingId) {
      var idx = state.entries.findIndex(function (x) { return x.id === editingId; });
      state.entries[idx] = Object.assign({ id: editingId }, payload);
    } else {
      payload.id = uid();
      state.entries.unshift(payload);
    }
    save();
    closePanel();
    renderAll();
  });

  document.getElementById("deleteEntryBtn").addEventListener("click", function () {
    if (!editingId) return;
    var id = editingId;
    closePanel();
    deleteEntry(id);
  });

  // ---------- header + filters wiring ----------
  document.getElementById("houseName").addEventListener("input", function (e) { state.houseName = e.target.value; save(); });
  document.getElementById("houseAddr").addEventListener("input", function (e) { state.houseAddress = e.target.value; save(); });
  document.getElementById("resetBtn").addEventListener("click", loadSample);
  document.getElementById("printBtn").addEventListener("click", function () { window.print(); });

  document.getElementById("exportBtn").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var base = (state.houseName || "house-log").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "house-log";
    var a = document.createElement("a");
    a.href = url;
    a.download = base + "-backup-" + todayISO() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById("importBtn").addEventListener("click", function () {
    document.getElementById("importFile").click();
  });
  document.getElementById("importFile").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var parsed;
      try {
        parsed = JSON.parse(ev.target.result);
        if (!parsed || !Array.isArray(parsed.entries)) throw new Error("bad shape");
      } catch (err) {
        window.alert("That file doesn't look like a House Log backup.");
        return;
      }
      var msg = "Import will replace the current log (" + state.entries.length + " entries) with this backup (" + parsed.entries.length + " entries). Continue?";
      if (!window.confirm(msg)) return;
      state.houseName = parsed.houseName || "";
      state.houseAddress = parsed.houseAddress || "";
      state.entries = parsed.entries;
      save();
      renderAll();
    };
    reader.readAsText(file);
    e.target.value = "";
  });
  document.getElementById("fSearch").addEventListener("input", function (e) { filters.search = e.target.value; renderTable(); });
  document.getElementById("fSystem").addEventListener("change", function (e) { filters.system = e.target.value; renderTable(); });
  document.getElementById("fType").addEventListener("change", function (e) { filters.type = e.target.value; renderTable(); });
  document.getElementById("fSort").addEventListener("change", function (e) { filters.sort = e.target.value; renderTable(); });

  // ---------- boot ----------
  var hadData = load();
  if (!hadData) {
    state.houseName = "142 Maple Ridge Road";
    state.houseAddress = "Purchased 2019 · 2,150 sq ft";
    state.entries = seedData();
    save();
  }
  renderAll();
})();
