const STORAGE_KEY = "orbit-capstone-v1";
const SESSION_KEY = "orbit-demo-session-v1";
const initialTasks = [
  { id: "t-101", title: "Finalize capstone requirements", description: "Confirm scope, acceptance criteria, and delivery plan.", priority: "high", status: "progress", due: todayISO(), createdAt: Date.now() - 50000 },
  { id: "t-102", title: "Build responsive dashboard", description: "Check navigation, summary cards, and small-screen layouts.", priority: "high", status: "todo", due: addDaysISO(2), createdAt: Date.now() - 40000 },
  { id: "t-103", title: "Write project documentation", description: "Document setup, architecture, features, and deployment.", priority: "medium", status: "todo", due: addDaysISO(4), createdAt: Date.now() - 30000 },
  { id: "t-104", title: "Review accessibility", description: "Test keyboard navigation, labels, and contrast.", priority: "medium", status: "done", due: addDaysISO(-1), createdAt: Date.now() - 20000 },
  { id: "t-105", title: "Capture demo screenshots", description: "Prepare desktop and mobile screenshots for review.", priority: "low", status: "todo", due: addDaysISO(5), createdAt: Date.now() - 10000 }
];
const state = { tasks: loadTasks(), view: "all", query: "", priority: "all", status: "all", user: loadSession() };
const $ = selector => document.querySelector(selector);
const els = {
  auth: $("#auth-screen"), shell: $("#app-shell"), login: $("#login-form"),
  name: $("#name-input"), email: $("#email-input"), profileName: $("#profile-name"),
  profileEmail: $("#profile-email"), avatar: $("#profile-avatar"), greeting: $("#greeting"),
  taskList: $("#task-list"), empty: $("#empty-state"), dialog: $("#task-dialog"),
  form: $("#task-form"), title: $("#task-title"), description: $("#task-description"),
  priority: $("#task-priority"), status: $("#task-status"), due: $("#task-due"),
  id: $("#task-id"), formError: $("#form-error"), toast: $("#toast")
};
let toastTimer;
function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function addDaysISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function loadTasks() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(value) ? value.filter(task => task && typeof task.id === "string" && typeof task.title === "string") : initialTasks;
  } catch { return initialTasks; }
}
function saveTasks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks)); }
  catch { notify("Could not save changes. Browser storage may be disabled."); }
}
function loadSession() {
  try {
    const user = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    return user && typeof user.name === "string" && typeof user.email === "string" ? user : null;
  } catch { return null; }
}
function notify(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2500);
}
function showApp() {
  els.auth.hidden = true;
  els.shell.hidden = false;
  if (state.user) {
    els.profileName.textContent = state.user.name;
    els.profileEmail.textContent = state.user.email;
    els.avatar.textContent = state.user.name.trim().charAt(0).toUpperCase();
    const firstName = state.user.name.trim().split(/\s+/)[0];
    els.greeting.textContent = `Good day, ${firstName} 👋`;
  }
  render();
}
function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
  state.user = null;
  els.shell.hidden = true;
  els.auth.hidden = false;
  els.login.reset();
  els.name.focus();
}
function getVisibleTasks() {
  const query = state.query.trim().toLowerCase();
  return state.tasks.filter(task => {
    const matchesQuery = `${task.title} ${task.description || ""}`.toLowerCase().includes(query);
    const matchesPriority = state.priority === "all" || task.priority === state.priority;
    const matchesStatus = state.status === "all" || task.status === state.status;
    const matchesView = state.view === "all" ||
      (state.view === "today" && task.due === todayISO() && task.status !== "done") ||
      (state.view === "completed" && task.status === "done");
    return matchesQuery && matchesPriority && matchesStatus && matchesView;
  }).sort((a,b) => (a.due || "9999").localeCompare(b.due || "9999") || b.createdAt - a.createdAt);
}
function formatDate(value) {
  if (!value) return "No due date";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}
function labelStatus(status) { return ({todo:"To do", progress:"In progress", done:"Completed"})[status] || "To do"; }
function makeCell(content) { const td = document.createElement("td"); if (content instanceof Node) td.append(content); else td.textContent = content; return td; }
function render() {
  const visible = getVisibleTasks();
  const completed = state.tasks.filter(task => task.status === "done").length;
  const progress = state.tasks.filter(task => task.status === "progress").length;
  $("#all-count").textContent = String(state.tasks.length);
  $("#stat-total").textContent = String(state.tasks.length);
  $("#stat-progress").textContent = String(progress);
  $("#stat-completed").textContent = String(completed);
  $("#stat-rate").textContent = `${state.tasks.length ? Math.round(completed / state.tasks.length * 100) : 0}%`;
  $("#task-summary").textContent = `${visible.length} of ${state.tasks.length} task${state.tasks.length === 1 ? "" : "s"} shown`;
  const fragment = document.createDocumentFragment();
  visible.forEach(task => {
    const row = document.createElement("tr");
    const nameWrap = document.createElement("div"); nameWrap.className = "task-name";
    const check = document.createElement("input"); check.type = "checkbox"; check.className = "task-check";
    check.checked = task.status === "done"; check.setAttribute("aria-label", `Mark ${task.title} completed`);
    check.addEventListener("change", () => updateTask(task.id, { status: check.checked ? "done" : "todo" }));
    const textWrap = document.createElement("div");
    const title = document.createElement("div"); title.className = "task-title"; title.textContent = task.title;
    const desc = document.createElement("div"); desc.className = "task-description"; desc.textContent = task.description || "No description";
    textWrap.append(title, desc); nameWrap.append(check, textWrap); row.append(makeCell(nameWrap));
    const priority = document.createElement("span"); priority.className = `priority ${task.priority}`; priority.textContent = task.priority[0].toUpperCase() + task.priority.slice(1);
    row.append(makeCell(priority), makeCell(formatDate(task.due)));
    const status = document.createElement("select"); status.className = `status ${task.status}`; status.setAttribute("aria-label", `Status for ${task.title}`);
    [["todo","To do"],["progress","In progress"],["done","Completed"]].forEach(([value,label]) => { const option = document.createElement("option"); option.value=value; option.textContent=label; option.selected=task.status===value; status.append(option); });
    status.addEventListener("change", () => updateTask(task.id, { status: status.value }));
    row.append(makeCell(status));
    const actions = document.createElement("div"); actions.className = "row-actions";
    const edit = document.createElement("button"); edit.type="button"; edit.className="small-action"; edit.textContent="Edit"; edit.setAttribute("aria-label", `Edit ${task.title}`); edit.addEventListener("click", () => openTaskDialog(task));
    const del = document.createElement("button"); del.type="button"; del.className="small-action delete"; del.textContent="Delete"; del.setAttribute("aria-label", `Delete ${task.title}`); del.addEventListener("click", () => deleteTask(task.id));
    actions.append(edit, del); row.append(makeCell(actions)); fragment.append(row);
  });
  els.taskList.replaceChildren(fragment);
  els.empty.hidden = visible.length !== 0;
}
function openTaskDialog(task = null) {
  els.form.reset(); els.formError.hidden = true;
  els.id.value = task?.id || "";
  $("#dialog-title").textContent = task ? "Edit task" : "Create a task";
  $("#save-task-button").textContent = task ? "Save changes" : "Save task";
  if (task) {
    els.title.value = task.title; els.description.value = task.description || "";
    els.priority.value = task.priority; els.status.value = task.status; els.due.value = task.due || "";
  } else {
    els.priority.value = "medium"; els.status.value = "todo"; els.due.value = "";
  }
  els.dialog.showModal();
  els.title.focus();
}
function updateTask(id, changes) {
  state.tasks = state.tasks.map(task => task.id === id ? { ...task, ...changes } : task);
  saveTasks(); render();
}
function deleteTask(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task || !confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
  state.tasks = state.tasks.filter(item => item.id !== id);
  saveTasks(); render(); notify("Task deleted.");
}
els.login.addEventListener("submit", event => {
  event.preventDefault();
  if (!els.login.reportValidity()) return;
  state.user = { name: els.name.value.trim(), email: els.email.value.trim() };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.user)); } catch {}
  showApp(); notify("Welcome to your workspace.");
});
$("#logout-button").addEventListener("click", signOut);
$("#new-task-button").addEventListener("click", () => openTaskDialog());
$("#empty-add-button").addEventListener("click", () => openTaskDialog());
$("#dialog-close").addEventListener("click", () => els.dialog.close());
$("#cancel-dialog").addEventListener("click", () => els.dialog.close());
els.dialog.addEventListener("click", event => { if (event.target === els.dialog) els.dialog.close(); });
els.form.addEventListener("submit", event => {
  event.preventDefault();
  if (!els.form.reportValidity()) return;
  const title = els.title.value.trim();
  if (title.length < 2) {
    els.formError.textContent = "Please enter a task name with at least two characters.";
    els.formError.hidden = false; els.title.focus(); return;
  }
  const task = {
    id: els.id.value || `t-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,
    title, description: els.description.value.trim(), priority: els.priority.value,
    status: els.status.value, due: els.due.value, createdAt: Date.now()
  };
  const editing = Boolean(els.id.value);
  if (editing) state.tasks = state.tasks.map(item => item.id === task.id ? { ...item, ...task } : item);
  else state.tasks.unshift(task);
  saveTasks(); els.dialog.close(); render(); notify(editing ? "Task updated." : "Task created.");
});
$("#task-search").addEventListener("input", event => { state.query = event.target.value; render(); });
$("#priority-filter").addEventListener("change", event => { state.priority = event.target.value; render(); });
$("#status-filter").addEventListener("change", event => { state.status = event.target.value; render(); });
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
  state.view = button.dataset.view;
  document.querySelectorAll("[data-view]").forEach(item => item.classList.toggle("active", item === button));
  $("#tasks-title").textContent = ({all:"Your tasks",today:"Due today",completed:"Completed tasks"})[state.view];
  render();
}));
if (state.user) showApp();
else { els.auth.hidden = false; els.shell.hidden = true; }
