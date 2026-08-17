export const SETTINGS_KEY = "quickAddSettings";

export const SUPPORTED_CONTEXTS = ["page", "selection", "link", "image"];

export const PRIORITIES = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
};

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `action-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createDefaultAction() {
  return {
    id: newId(),
    label: "Add to Inbox",
    enabled: true,
    listId: "",
    listName: "",
    titleTemplate: "{{selection || linkUrl || pageTitle}}",
    descriptionTemplate: "Source: {{pageUrl}}\n\n{{selection}}",
    contexts: [...SUPPORTED_CONTEXTS],
    assignToMe: true,
    priority: "",
    status: "",
    tags: [],
    openAfterCreate: false,
  };
}

export function createDefaultSettings() {
  return {
    schemaVersion: 1,
    apiToken: "",
    currentUser: null,
    actions: [createDefaultAction()],
  };
}

function text(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function normalizeAction(value = {}) {
  const fallback = createDefaultAction();
  const contexts = Array.isArray(value.contexts)
    ? value.contexts.filter((context) => SUPPORTED_CONTEXTS.includes(context))
    : fallback.contexts;

  return {
    id: text(value.id) || fallback.id,
    label: text(value.label, fallback.label) || fallback.label,
    enabled: value.enabled !== false,
    listId: text(value.listId),
    listName: text(value.listName),
    titleTemplate: typeof value.titleTemplate === "string" ? value.titleTemplate : fallback.titleTemplate,
    descriptionTemplate:
      typeof value.descriptionTemplate === "string"
        ? value.descriptionTemplate
        : fallback.descriptionTemplate,
    contexts: contexts.length ? [...new Set(contexts)] : ["page"],
    assignToMe: value.assignToMe !== false,
    priority: Object.hasOwn(PRIORITIES, value.priority) ? value.priority : "",
    status: text(value.status),
    tags: Array.isArray(value.tags)
      ? value.tags.map((tag) => text(tag)).filter(Boolean)
      : [],
    openAfterCreate: value.openAfterCreate === true,
  };
}

export function normalizeSettings(value = {}) {
  const actions = Array.isArray(value.actions) ? value.actions.map(normalizeAction) : [];
  const currentUser = value.currentUser && value.currentUser.id
    ? {
        id: String(value.currentUser.id),
        username: text(value.currentUser.username || value.currentUser.name, "ClickUp user"),
      }
    : null;

  return {
    schemaVersion: 1,
    apiToken: text(value.apiToken),
    currentUser,
    actions: actions.length ? actions : [createDefaultAction()],
  };
}
