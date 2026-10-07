const STORAGE_KEY = "mes-taches";

const form = document.getElementById("form");
const input = document.getElementById("input");
const list = document.getElementById("list");
const count = document.getElementById("count");
const clearBtn = document.getElementById("clear");
const filterBtns = document.querySelectorAll("[data-filter]");

let tasks = load();
let filter = "all";

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Stockage indisponible (navigation privée, etc.) : on continue en mémoire.
  }
}

function render() {
  const visible = tasks.filter((t) =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done
  );

  list.innerHTML = "";
  if (visible.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = tasks.length ? "Aucune tâche ici." : "Aucune tâche pour l'instant.";
    list.appendChild(li);
  }

  for (const task of visible) {
    const li = document.createElement("li");
    li.className = "item" + (task.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", "Marquer comme terminée");
    checkbox.addEventListener("change", () => toggle(task.id));

    const text = document.createElement("span");
    text.className = "text";
    text.textContent = task.text;
    text.title = "Double-cliquez pour modifier";
    text.addEventListener("dblclick", () => edit(task.id));

    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "×";
    del.setAttribute("aria-label", "Supprimer");
    del.addEventListener("click", () => remove(task.id));

    li.append(checkbox, text, del);
    list.appendChild(li);
  }

  const remaining = tasks.filter((t) => !t.done).length;
  count.textContent = `${remaining} tâche${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`;
  clearBtn.hidden = !tasks.some((t) => t.done);
}

function update() {
  save();
  render();
}

function add(text) {
  tasks.push({ id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()), text, done: false });
  update();
}

function toggle(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.done = !task.done;
  update();
}

function edit(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const next = prompt("Modifier la tâche :", task.text);
  if (next === null) return;
  const trimmed = next.trim();
  if (trimmed) task.text = trimmed;
  else tasks = tasks.filter((t) => t.id !== id);
  update();
}

function remove(id) {
  tasks = tasks.filter((t) => t.id !== id);
  update();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  add(text);
  input.value = "";
  input.focus();
});

clearBtn.addEventListener("click", () => {
  tasks = tasks.filter((t) => !t.done);
  update();
});

filterBtns.forEach((btn) =>
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.toggle("active", b === btn));
    render();
  })
);

render();
