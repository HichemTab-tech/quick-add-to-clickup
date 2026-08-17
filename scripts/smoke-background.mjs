import assert from "node:assert/strict";

function event() {
  const listeners = [];
  return {
    listeners,
    addListener(listener) {
      listeners.push(listener);
    },
  };
}

const localData = {};
const sessionData = {};
const createdMenus = [];

function getValues(source, keys) {
  if (typeof keys === "string") return { [keys]: source[keys] };
  if (Array.isArray(keys)) return Object.fromEntries(keys.map((key) => [key, source[key]]));
  return { ...source };
}

globalThis.chrome = {
  action: { onClicked: event() },
  contextMenus: {
    onClicked: event(),
    async removeAll() {
      createdMenus.length = 0;
    },
    create(properties, callback) {
      createdMenus.push(properties);
      queueMicrotask(callback);
      return properties.id;
    },
  },
  notifications: {
    onClicked: event(),
    onClosed: event(),
    async create() {},
    async clear() {},
  },
  runtime: {
    id: "quick-add-test-extension",
    lastError: null,
    onMessage: event(),
    onInstalled: event(),
    onStartup: event(),
    async openOptionsPage() {},
    getManifest() {
      return { version: "0.1.2" };
    },
  },
  storage: {
    onChanged: event(),
    local: {
      async setAccessLevel() {},
      async get(keys) {
        return getValues(localData, keys);
      },
      async set(values) {
        Object.assign(localData, values);
      },
    },
    session: {
      async get(keys) {
        return getValues(sessionData, keys);
      },
      async set(values) {
        Object.assign(sessionData, values);
      },
      async remove(key) {
        delete sessionData[key];
      },
    },
  },
  tabs: { async create() {} },
};

await import("../background.js");
await new Promise((resolve) => setTimeout(resolve, 20));

assert.equal(chrome.runtime.onInstalled.listeners.length, 1);
assert.equal(chrome.runtime.onStartup.listeners.length, 1);
assert.equal(chrome.runtime.onMessage.listeners.length, 1);
assert.equal(chrome.contextMenus.onClicked.listeners.length, 1);
assert.equal(chrome.notifications.onClicked.listeners.length, 1);
assert.equal(createdMenus.length, 1);
assert.match(String(createdMenus[0].id), /^quick-add-action:/);
assert.equal(createdMenus[0].title, "Add to Inbox");

const apiResponses = new Map([
  ["/user", { user: { id: 42, username: "Test user" } }],
  ["/team", { teams: [{ id: "w1", name: "Workspace" }] }],
  ["/team/w1/space?archived=false", { spaces: [{ id: "s1", name: "Space" }] }],
  ["/space/s1/folder?archived=false", { folders: [] }],
  ["/space/s1/list?archived=false", { lists: [{ id: "l1", name: "Inbox" }] }],
]);

globalThis.fetch = async (url) => {
  const path = url.replace("https://api.clickup.com/api/v2", "");
  const payload = apiResponses.get(path);
  return {
    ok: Boolean(payload),
    status: payload ? 200 : 404,
    async text() {
      return JSON.stringify(payload ?? { err: "Not found" });
    },
  };
};

const connectionResult = await new Promise((resolve) => {
  const keepChannelOpen = chrome.runtime.onMessage.listeners[0](
    { type: "inspect-clickup-connection", token: "pk_test" },
    { id: chrome.runtime.id },
    resolve,
  );
  assert.equal(keepChannelOpen, true);
});

assert.equal(connectionResult.ok, true);
assert.equal(connectionResult.protocolVersion, 2);
assert.equal(connectionResult.user.username, "Test user");
assert.equal(connectionResult.lists[0].name, "Inbox");

console.log("Loaded the service worker, created its menu, and completed a mocked ClickUp connection.");
