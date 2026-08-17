import { PRIORITIES, SETTINGS_KEY } from "./lib/config.js";
import { ClickUpClient } from "./lib/clickup.js";
import { getSettings, protectLocalStorage } from "./lib/storage.js";
import { createTaskDraft } from "./lib/templates.js";

const ACTION_PREFIX = "quick-add-action:";
const ROOT_MENU_ID = "quick-add-root";
const CONFIGURE_MENU_ID = "quick-add-configure";
const NOTIFICATION_LINK_PREFIX = "notificationLink:";
const CONNECTION_PROTOCOL_VERSION = 2;
let menuRebuildQueue = Promise.resolve();

function createMenuItem(properties) {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create(properties, () => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve();
    });
  });
}

async function rebuildContextMenus() {
  await chrome.contextMenus.removeAll();
  const settings = await getSettings();
  const actions = settings.actions.filter((action) => action.enabled);

  if (!actions.length) {
    await createMenuItem({
      id: CONFIGURE_MENU_ID,
      title: "Configure Quick Add to ClickUp…",
      contexts: ["page", "selection", "link", "image"],
    });
    return;
  }

  if (actions.length === 1) {
    const [action] = actions;
    await createMenuItem({
      id: `${ACTION_PREFIX}${action.id}`,
      title: action.label,
      contexts: action.contexts,
    });
    return;
  }

  const rootContexts = [...new Set(actions.flatMap((action) => action.contexts))];
  await createMenuItem({
    id: ROOT_MENU_ID,
    title: "Quick Add to ClickUp",
    contexts: rootContexts,
  });

  for (const action of actions) {
    await createMenuItem({
      id: `${ACTION_PREFIX}${action.id}`,
      parentId: ROOT_MENU_ID,
      title: action.label,
      contexts: action.contexts,
    });
  }
}

function scheduleContextMenuRebuild() {
  menuRebuildQueue = menuRebuildQueue
    .catch(() => undefined)
    .then(rebuildContextMenus);
  return menuRebuildQueue;
}

async function rememberNotificationLink(notificationId, url) {
  await chrome.storage.session.set({ [`${NOTIFICATION_LINK_PREFIX}${notificationId}`]: url });
}

async function notify({ title, message, url = "" }) {
  const id = `quick-add-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await chrome.notifications.create(id, {
    type: "basic",
    iconUrl: "assets/icon-128.png",
    title,
    message: String(message).slice(0, 500),
    priority: 0,
  });
  if (url) await rememberNotificationLink(id, url);
}

async function createTaskFromAction(actionId, info, tab) {
  const settings = await getSettings();
  const action = settings.actions.find((candidate) => candidate.id === actionId);

  if (!action) throw new Error("This quick action no longer exists.");
  if (!settings.apiToken) {
    await chrome.runtime.openOptionsPage();
    throw new Error("Connect your ClickUp account in the extension settings first.");
  }
  if (!action.listId) {
    await chrome.runtime.openOptionsPage();
    throw new Error(`Choose a destination list for “${action.label}”.`);
  }

  const draft = createTaskDraft(action, info, tab);
  const payload = {
    name: draft.name,
    ...(draft.markdown_content ? { markdown_content: draft.markdown_content } : {}),
    ...(action.assignToMe && settings.currentUser?.id
      ? { assignees: [Number(settings.currentUser.id)] }
      : {}),
    ...(action.priority ? { priority: PRIORITIES[action.priority] } : {}),
    ...(action.status ? { status: action.status } : {}),
    ...(action.tags.length ? { tags: action.tags } : {}),
  };

  const client = new ClickUpClient(settings.apiToken);
  const task = await client.createTask(action.listId, payload);
  const taskUrl = task?.url || (task?.id ? `https://app.clickup.com/t/${task.id}` : "");

  await notify({
    title: "Task created",
    message: `${draft.name} → ${action.listName || action.listId}`,
    url: taskUrl,
  });

  if (action.openAfterCreate && taskUrl) await chrome.tabs.create({ url: taskUrl });
}

function serializeError(error) {
  return {
    message: error?.message || "Unknown ClickUp error.",
    status: error?.status || 0,
    code: error?.code || "",
    cause: error?.details?.message || "",
  };
}

async function inspectClickUpConnection(token) {
  const client = new ClickUpClient(token);
  let user;

  try {
    const response = await client.getCurrentUser();
    user = response?.user ?? response;
    if (!user?.id) throw new Error("ClickUp authenticated but did not return a user ID.");
  } catch (error) {
    return {
      ok: false,
      protocolVersion: CONNECTION_PROTOCOL_VERSION,
      stage: "authentication",
      error: serializeError(error),
    };
  }

  const safeUser = {
    id: String(user.id),
    username: user.username || user.name || "ClickUp user",
  };

  try {
    const lists = await client.discoverLists();
    return {
      ok: true,
      protocolVersion: CONNECTION_PROTOCOL_VERSION,
      user: safeUser,
      lists,
    };
  } catch (error) {
    return {
      ok: false,
      protocolVersion: CONNECTION_PROTOCOL_VERSION,
      stage: "list-discovery",
      user: safeUser,
      error: serializeError(error),
    };
  }
}

async function initialize({ openOptions = false } = {}) {
  await protectLocalStorage();
  await getSettings();
  await scheduleContextMenuRebuild();
  if (openOptions) await chrome.runtime.openOptionsPage();
}

chrome.runtime.onInstalled.addListener((details) => {
  initialize({ openOptions: details.reason === "install" }).catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  initialize().catch(console.error);
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.type !== "inspect-clickup-connection") return false;

  inspectClickUpConnection(message.token)
    .then(sendResponse)
    .catch((error) => sendResponse({
      ok: false,
      protocolVersion: CONNECTION_PROTOCOL_VERSION,
      stage: "extension",
      error: serializeError(error),
    }));
  return true;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[SETTINGS_KEY]) {
    scheduleContextMenuRebuild().catch(console.error);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONFIGURE_MENU_ID) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const menuId = String(info.menuItemId);
  if (!menuId.startsWith(ACTION_PREFIX)) return;

  createTaskFromAction(menuId.slice(ACTION_PREFIX.length), info, tab).catch((error) => {
    console.error(error);
    notify({ title: "Task not created", message: error.message || "Unknown error" }).catch(console.error);
  });
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const key = `${NOTIFICATION_LINK_PREFIX}${notificationId}`;
  const stored = await chrome.storage.session.get(key);
  const url = stored[key];
  if (url) await chrome.tabs.create({ url });
  await chrome.storage.session.remove(key);
  await chrome.notifications.clear(notificationId);
});

chrome.notifications.onClosed.addListener((notificationId) => {
  chrome.storage.session.remove(`${NOTIFICATION_LINK_PREFIX}${notificationId}`);
});

initialize().catch(console.error);
