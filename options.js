import { createDefaultAction, normalizeAction } from "./lib/config.js";
import { getSettings, protectLocalStorage, saveSettings } from "./lib/storage.js";

const elements = {
  token: document.querySelector("#api-token"),
  toggleToken: document.querySelector("#toggle-token"),
  connect: document.querySelector("#connect-button"),
  forget: document.querySelector("#forget-token"),
  connectionState: document.querySelector("#connection-state"),
  connectionError: document.querySelector("#connection-error"),
  actions: document.querySelector("#actions"),
  template: document.querySelector("#action-template"),
  addAction: document.querySelector("#add-action"),
  save: document.querySelector("#save-button"),
  saveStatus: document.querySelector("#save-status"),
};

let settings;
let discoveredLists = [];

function setConnectionState(message, type = "neutral") {
  elements.connectionState.textContent = message;
  elements.connectionState.className = `status-pill status-pill--${type}`;
}

function setConnectionError(message = "") {
  elements.connectionError.textContent = message;
  elements.connectionError.hidden = !message;
}

function formatConnectionError(result) {
  const error = result?.error ?? {};
  const suffix = [error.code, error.status ? `HTTP ${error.status}` : ""]
    .filter(Boolean)
    .join(" · ");
  const stage = result?.stage === "authentication"
    ? "ClickUp rejected the token"
    : result?.stage === "list-discovery"
      ? "The token is valid, but ClickUp list loading failed"
      : "The extension could not contact ClickUp";
  return `${stage}: ${error.message || "Unknown error"}${suffix ? ` (${suffix})` : ""}`;
}

function setSaveStatus(message, type = "") {
  elements.saveStatus.textContent = message;
  elements.saveStatus.className = `save-status${type ? ` save-status--${type}` : ""}`;
}

function listLabel(list) {
  return [list.workspace, list.space, list.folder, list.name].filter(Boolean).join(" › ");
}

function addListOptions(select, action) {
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = discoveredLists.length
    ? "Choose a list…"
    : "Connect to load your lists";
  select.append(placeholder);

  if (action.listId && !discoveredLists.some((list) => list.id === action.listId)) {
    const current = document.createElement("option");
    current.value = action.listId;
    current.textContent = action.listName || `Current list (${action.listId})`;
    current.dataset.listName = action.listName;
    select.append(current);
  }

  for (const list of discoveredLists) {
    const option = document.createElement("option");
    option.value = list.id;
    option.textContent = listLabel(list);
    option.dataset.listName = list.name;
    select.append(option);
  }

  select.value = action.listId;
}

function renderActions() {
  elements.actions.replaceChildren();

  settings.actions.forEach((action) => {
    const fragment = elements.template.content.cloneNode(true);
    const card = fragment.querySelector(".action-card");
    card.dataset.id = action.id;

    card.querySelector('[data-field="enabled"]').checked = action.enabled;
    card.querySelector('[data-field="label"]').value = action.label;
    card.querySelector('[data-field="listId"]').value = action.listId;
    card.querySelector('[data-field="titleTemplate"]').value = action.titleTemplate;
    card.querySelector('[data-field="descriptionTemplate"]').value = action.descriptionTemplate;
    card.querySelector('[data-field="priority"]').value = action.priority;
    card.querySelector('[data-field="status"]').value = action.status;
    card.querySelector('[data-field="tags"]').value = action.tags.join(", ");
    card.querySelector('[data-field="assignToMe"]').checked = action.assignToMe;
    card.querySelector('[data-field="openAfterCreate"]').checked = action.openAfterCreate;

    for (const checkbox of card.querySelectorAll("[data-context]")) {
      checkbox.checked = action.contexts.includes(checkbox.dataset.context);
    }

    addListOptions(card.querySelector('[data-field="listSelect"]'), action);
    elements.actions.append(fragment);
  });
}

function actionFromCard(card) {
  const selectedList = card.querySelector('[data-field="listSelect"]');
  const selectedOption = selectedList.selectedOptions[0];
  const listId = card.querySelector('[data-field="listId"]').value.trim();
  const contexts = [...card.querySelectorAll("[data-context]:checked")].map(
    (checkbox) => checkbox.dataset.context,
  );

  return normalizeAction({
    id: card.dataset.id,
    enabled: card.querySelector('[data-field="enabled"]').checked,
    label: card.querySelector('[data-field="label"]').value,
    listId,
    listName: selectedList.value === listId ? selectedOption?.dataset.listName || "" : "",
    titleTemplate: card.querySelector('[data-field="titleTemplate"]').value,
    descriptionTemplate: card.querySelector('[data-field="descriptionTemplate"]').value,
    contexts,
    priority: card.querySelector('[data-field="priority"]').value,
    status: card.querySelector('[data-field="status"]').value,
    tags: card.querySelector('[data-field="tags"]').value.split(","),
    assignToMe: card.querySelector('[data-field="assignToMe"]').checked,
    openAfterCreate: card.querySelector('[data-field="openAfterCreate"]').checked,
  });
}

function syncActionsFromDom() {
  settings.actions = [...elements.actions.querySelectorAll(".action-card")].map(actionFromCard);
}

function validateActions() {
  for (const [index, action] of settings.actions.entries()) {
    if (!action.label) throw new Error(`Action ${index + 1} needs a menu label.`);
    if (action.enabled && !action.listId) {
      throw new Error(`“${action.label}” needs a destination list.`);
    }
    if (!action.titleTemplate.trim()) {
      throw new Error(`“${action.label}” needs a title template.`);
    }
  }
}

async function persist() {
  syncActionsFromDom();
  validateActions();
  settings.apiToken = elements.token.value.trim();
  settings = await saveSettings(settings);
}

elements.actions.addEventListener("change", (event) => {
  if (event.target.matches('[data-field="listSelect"]')) {
    const card = event.target.closest(".action-card");
    card.querySelector('[data-field="listId"]').value = event.target.value;
  }
  setSaveStatus("Unsaved changes");
});

elements.actions.addEventListener("input", () => setSaveStatus("Unsaved changes"));

elements.actions.addEventListener("input", (event) => {
  if (!event.target.matches('[data-field="listId"]')) return;
  const card = event.target.closest(".action-card");
  const select = card.querySelector('[data-field="listSelect"]');
  const matchingOption = [...select.options].some((option) => option.value === event.target.value.trim());
  select.value = matchingOption ? event.target.value.trim() : "";
});

elements.actions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  syncActionsFromDom();
  const card = button.closest(".action-card");
  const index = settings.actions.findIndex((action) => action.id === card.dataset.id);
  if (index < 0) return;

  if (button.dataset.action === "remove") {
    settings.actions.splice(index, 1);
    if (!settings.actions.length) settings.actions.push(createDefaultAction());
  } else if (button.dataset.action === "up" && index > 0) {
    [settings.actions[index - 1], settings.actions[index]] =
      [settings.actions[index], settings.actions[index - 1]];
  } else if (button.dataset.action === "down" && index < settings.actions.length - 1) {
    [settings.actions[index + 1], settings.actions[index]] =
      [settings.actions[index], settings.actions[index + 1]];
  }

  renderActions();
  setSaveStatus("Unsaved changes");
});

elements.addAction.addEventListener("click", () => {
  syncActionsFromDom();
  const action = createDefaultAction();
  action.label = `Quick action ${settings.actions.length + 1}`;
  settings.actions.push(action);
  renderActions();
  setSaveStatus("Unsaved changes");
  elements.actions.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
});

elements.toggleToken.addEventListener("click", () => {
  const showing = elements.token.type === "text";
  elements.token.type = showing ? "password" : "text";
  elements.toggleToken.textContent = showing ? "Show" : "Hide";
  elements.toggleToken.setAttribute("aria-label", showing ? "Show token" : "Hide token");
});

elements.connect.addEventListener("click", async () => {
  const token = elements.token.value.trim();
  if (!token) {
    setConnectionState("Token required", "error");
    elements.token.focus();
    return;
  }

  elements.connect.disabled = true;
  elements.connect.textContent = "Connecting…";
  setConnectionState("Checking…", "neutral");
  setConnectionError();
  setSaveStatus("Loading your ClickUp lists…");

  try {
    const result = await chrome.runtime.sendMessage({
      type: "inspect-clickup-connection",
      token,
    });

    if (!result?.ok) {
      if (result?.user) {
        syncActionsFromDom();
        settings.apiToken = token;
        settings.currentUser = result.user;
        settings = await saveSettings(settings);
        setConnectionState(`Connected as ${result.user.username}`, "success");
      } else {
        setConnectionState("Connection failed", "error");
      }
      const message = formatConnectionError(result);
      setConnectionError(message);
      setSaveStatus(message, "error");
      return;
    }

    discoveredLists = result.lists;

    syncActionsFromDom();
    settings.apiToken = token;
    settings.currentUser = result.user;
    settings = await saveSettings(settings);

    renderActions();
    setConnectionState(`Connected as ${settings.currentUser.username}`, "success");
    setSaveStatus(`${discoveredLists.length} lists loaded`, "success");
  } catch (error) {
    console.error(error);
    setConnectionState("Connection failed", "error");
    const message = `The extension could not run the connection check: ${error.message || "Unknown error"}`;
    setConnectionError(message);
    setSaveStatus(message, "error");
  } finally {
    elements.connect.disabled = false;
    elements.connect.textContent = "Connect & load lists";
  }
});

elements.forget.addEventListener("click", async () => {
  if (!elements.token.value && !settings.apiToken) return;
  if (!confirm("Remove the saved ClickUp token from this browser?")) return;

  syncActionsFromDom();
  settings.apiToken = "";
  settings.currentUser = null;
  settings = await saveSettings(settings);
  elements.token.value = "";
  discoveredLists = [];
  renderActions();
  setConnectionState("Not connected", "neutral");
  setSaveStatus("Token removed", "success");
});

elements.save.addEventListener("click", async () => {
  elements.save.disabled = true;
  try {
    await persist();
    setSaveStatus("Changes saved. The context menu is ready.", "success");
  } catch (error) {
    setSaveStatus(error.message, "error");
  } finally {
    elements.save.disabled = false;
  }
});

async function start() {
  await protectLocalStorage();
  settings = await getSettings();
  elements.token.value = settings.apiToken;
  if (settings.currentUser) {
    setConnectionState(`Saved for ${settings.currentUser.username}`, "success");
  }
  renderActions();
}

start().catch((error) => {
  console.error(error);
  setSaveStatus(error.message || "Could not load settings.", "error");
});
