(() => {
  "use strict";

  const STORAGE_KEY = "checklist-manager-v1";
  let state = loadState();
  let selectedId = state.checklists[0]?.id ?? null;

  const $ = id => document.getElementById(id);
  const listEl = $("checklistList");
  const noLists = $("noLists");
  const listCount = $("listCount");
  const emptyState = $("emptyState");
  const view = $("checklistView");
  const nameInput = $("checklistName");
  const progressBar = $("progressBar");
  const progressText = $("progressText");
  const itemsEl = $("items");
  const statusEl = $("status");
  const newItem = $("newItem");

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { checklists: [] };
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.checklists)) throw new Error();
      parsed.checklists = parsed.checklists.filter(c => c && typeof c.id === "string" && typeof c.name === "string" && Array.isArray(c.items));
      parsed.checklists.forEach(c => c.items = c.items.filter(i => i && typeof i.text === "string").map(i => ({ text: i.text, done: !!i.done })));
      return parsed;
    } catch {
      return { checklists: [] };
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function current() {
    return state.checklists.find(c => c.id === selectedId) || null;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }

  function message(text) {
    statusEl.textContent = text;
    clearTimeout(message.timer);
    message.timer = setTimeout(() => statusEl.textContent = "", 2200);
  }

  function renderList() {
    listEl.innerHTML = "";
    noLists.hidden = state.checklists.length > 0;
    listCount.textContent = state.checklists.length ? `${state.checklists.length}` : "";
    state.checklists.forEach(c => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "list-button" + (c.id === selectedId ? " active" : "");
      const done = c.items.filter(i => i.done).length;
      button.innerHTML = `<span class="list-name">${escapeHtml(c.name || "Untitled checklist")}</span><span class="list-count">${done}/${c.items.length}</span>`;
      button.addEventListener("click", () => { selectedId = c.id; render(); });
      listEl.appendChild(button);
    });
  }

  function renderItems(c) {
    itemsEl.innerHTML = "";
    if (!c.items.length) {
      itemsEl.innerHTML = '<div class="empty" style="padding:28px 8px">No items yet. Add your first item above.</div>';
      return;
    }

    c.items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "item" + (item.done ? " done" : "");
      row.draggable = true;
      row.dataset.index = String(index);
      row.innerHTML = `
        <span class="drag-handle" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
        <input class="item-check" type="checkbox" ${item.done ? "checked" : ""} aria-label="Complete item">
        <span class="item-text">${escapeHtml(item.text)}</span>
        <button type="button" class="move-up" aria-label="Move item up" ${index === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="move-down" aria-label="Move item down" ${index === c.items.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="remove" aria-label="Remove item">×</button>
      `;

      row.querySelector(".item-check").addEventListener("change", e => {
        item.done = e.target.checked;
        save(); render();
      });

      row.querySelector(".move-up").addEventListener("click", () => {
        if (index <= 0) return;
        [c.items[index - 1], c.items[index]] = [c.items[index], c.items[index - 1]];
        save(); render();
      });

      row.querySelector(".move-down").addEventListener("click", () => {
        if (index >= c.items.length - 1) return;
        [c.items[index + 1], c.items[index]] = [c.items[index], c.items[index + 1]];
        save(); render();
      });

      row.querySelector(".remove").addEventListener("click", () => {
        c.items.splice(index, 1);
        save(); render();
      });

      row.addEventListener("dragstart", e => {
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      });

      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        itemsEl.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
      });

      row.addEventListener("dragover", e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        row.classList.add("drag-over");
      });

      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));

      row.addEventListener("drop", e => {
        e.preventDefault();
        row.classList.remove("drag-over");
        const from = Number(e.dataTransfer.getData("text/plain"));
        const to = index;
        if (!Number.isInteger(from) || from === to || from < 0 || from >= c.items.length) return;
        const [moved] = c.items.splice(from, 1);
        c.items.splice(to, 0, moved);
        save(); render();
        message("Item order saved.");
      });

      itemsEl.appendChild(row);
    });
  }

  function render() {
    renderList();
    const c = current();
    emptyState.hidden = !!c;
    view.hidden = !c;
    if (!c) return;

    nameInput.value = c.name;
    const done = c.items.filter(i => i.done).length;
    const total = c.items.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    progressBar.style.width = pct + "%";
    progressText.textContent = total ? `${done} of ${total} complete (${pct}%)` : "0 items";
    renderItems(c);
  }

  function createChecklist(name) {
    const clean = String(name || "").trim();
    if (!clean) return;
    const c = { id: id(), name: clean.slice(0, 150), items: [] };
    state.checklists.push(c);
    selectedId = c.id;
    save(); render();
    setTimeout(() => newItem.focus(), 0);
  }

  $("newChecklist").addEventListener("click", () => {
    const name = prompt("Checklist name:", "New checklist");
    if (name !== null) createChecklist(name);
  });
  $("emptyNew").addEventListener("click", () => {
    const name = prompt("Checklist name:", "New checklist");
    if (name !== null) createChecklist(name);
  });

  $("addForm").addEventListener("submit", e => {
    e.preventDefault();
    const c = current();
    const text = newItem.value.trim();
    if (!c || !text) return;
    c.items.push({ text, done: false });
    newItem.value = "";
    save(); render();
    newItem.focus();
  });

  $("renameButton").addEventListener("click", () => {
    const c = current();
    if (!c) return;
    const name = prompt("Checklist name:", c.name);
    if (name !== null && name.trim()) {
      c.name = name.trim().slice(0,150);
      save(); render(); message("Checklist renamed.");
    }
  });

  nameInput.addEventListener("change", () => {
    const c = current();
    if (!c) return;
    c.name = nameInput.value.trim().slice(0,150) || "Untitled checklist";
    save(); renderList(); message("Name saved.");
  });

  $("deleteButton").addEventListener("click", () => {
    const c = current();
    if (!c) return;
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    state.checklists = state.checklists.filter(x => x.id !== c.id);
    selectedId = state.checklists[0]?.id ?? null;
    save(); render();
  });

  $("completeAll").addEventListener("click", () => {
    const c = current(); if (!c) return;
    c.items.forEach(i => i.done = true);
    save(); render(); message("All items completed.");
  });

  $("clearCompleted").addEventListener("click", () => {
    const c = current(); if (!c) return;
    c.items = c.items.filter(i => !i.done);
    save(); render(); message("Completed items removed.");
  });

  $("resetChecklist").addEventListener("click", () => {
    const c = current(); if (!c) return;
    if (!confirm("Reset all items to incomplete?")) return;
    c.items.forEach(i => i.done = false);
    save(); render(); message("Checklist reset.");
  });

  function csvCell(value) {
    const s = String(value ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  $("exportCurrent").addEventListener("click", () => {
    const c = current(); if (!c) return;
    const rows = [["checklist","item","completed"], ...c.items.map(i => [c.name, i.text, i.done ? "true" : "false"])];
    download(`${safeFilename(c.name)}.csv`, rows.map(r => r.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
    message("CSV exported.");
  });

  $("exportAll").addEventListener("click", () => {
    if (!state.checklists.length) { message("Nothing to export."); return; }
    const rows = [["checklist","item","completed"]];
    state.checklists.forEach(c => c.items.forEach(i => rows.push([c.name, i.text, i.done ? "true" : "false"])));
    download("checklists.csv", rows.map(r => r.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
    message("All checklists exported.");
  });

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i=0; i<text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i+1] === '"') { cell += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else {
        if (ch === '"') quoted = true;
        else if (ch === ",") { row.push(cell); cell = ""; }
        else if (ch === "\n") { row.push(cell); rows.push(row); row=[]; cell=""; }
        else if (ch !== "\r") cell += ch;
      }
    }
    row.push(cell);
    if (row.length > 1 || row[0].trim()) rows.push(row);
    return rows;
  }

  $("csvInput").addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result || ""));
        if (!rows.length) throw new Error("CSV is empty.");
        const header = rows[0].map(x => x.trim().toLowerCase());
        let nameIndex = header.indexOf("checklist");
        let itemIndex = header.indexOf("item");
        let doneIndex = header.indexOf("completed");
        let start = 1;

        if (itemIndex < 0) {
          itemIndex = header.indexOf("task");
          if (itemIndex < 0) {
            nameIndex = 0; itemIndex = 1; doneIndex = 2; start = 0;
          }
        }

        const groups = new Map();
        for (let i=start; i<rows.length; i++) {
          const r = rows[i];
          const itemText = String(r[itemIndex] ?? "").trim();
          if (!itemText) continue;
          const name = String(r[nameIndex] ?? "").trim() || file.name.replace(/\.csv$/i, "") || "Imported checklist";
          const done = doneIndex >= 0 && /^(true|yes|1|done|complete|completed)$/i.test(String(r[doneIndex] ?? "").trim());
          if (!groups.has(name)) groups.set(name, []);
          groups.get(name).push({ text: itemText, done });
        }
        if (!groups.size) throw new Error("No checklist items found.");

        let firstId = null;
        groups.forEach((items, name) => {
          const c = { id: id(), name: name.slice(0,150), items };
          state.checklists.push(c);
          if (!firstId) firstId = c.id;
        });
        selectedId = firstId;
        save(); render(); message(`${groups.size} checklist${groups.size > 1 ? "s" : ""} imported.`);
      } catch (err) {
        alert("Could not import CSV: " + err.message);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  });

  $("clearData").addEventListener("click", () => {
    if (!confirm("Delete all locally stored checklists? This cannot be undone.")) return;
    state = { checklists: [] };
    selectedId = null;
    save(); render();
  });

  function safeFilename(name) {
    return String(name || "checklist").replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0,80) || "checklist";
  }

  render();
})();
