import test from "node:test";
import assert from "node:assert/strict";

import { ClickUpClient, ClickUpError } from "../lib/clickup.js";

function response(data, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return data === null ? "" : JSON.stringify(data);
    },
  };
}

test("creates a task with the correct endpoint, token, and JSON body", async () => {
  let request;
  const client = new ClickUpClient("pk_secret", {
    baseUrl: "https://example.test/api/v2/",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response({ id: "task-1", name: "Read this" });
    },
  });

  const task = await client.createTask("list 123", {
    name: "Read this",
    priority: 2,
  });

  assert.equal(request.url, "https://example.test/api/v2/list/list%20123/task");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "pk_secret");
  assert.equal(request.options.headers.Accept, "application/json");
  assert.equal(request.options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(request.options.body), { name: "Read this", priority: 2 });
  assert.equal(task.id, "task-1");
});

test("does not send a content type header on bodyless requests", async () => {
  let headers;
  const client = new ClickUpClient("pk_secret", {
    fetchImpl: async (_url, options) => {
      headers = options.headers;
      return response({ user: { id: 1 } });
    },
  });

  await client.getCurrentUser();
  assert.equal(headers.Accept, "application/json");
  assert.equal(headers["Content-Type"], undefined);
});

test("binds fetch to the global scope for WorkerGlobalScope compatibility", async () => {
  let receiver;
  async function browserStyleFetch() {
    receiver = this;
    return response({ user: { id: 1 } });
  }

  const client = new ClickUpClient("pk_secret", { fetchImpl: browserStyleFetch });
  await client.getCurrentUser();

  assert.equal(receiver, globalThis);
});

test("turns ClickUp error responses into useful errors", async () => {
  const client = new ClickUpClient("pk_secret", {
    fetchImpl: async () => response({ err: "Token invalid", ECODE: "OAUTH_025" }, { status: 401 }),
  });

  await assert.rejects(
    client.getCurrentUser(),
    (error) =>
      error instanceof ClickUpError &&
      error.message === "Token invalid" &&
      error.status === 401 &&
      error.code === "OAUTH_025",
  );
});

test("discovers and flattens folder and folderless lists", async () => {
  const routes = new Map([
    ["/team", { teams: [{ id: "w1", name: "Work" }] }],
    ["/team/w1/space?archived=false", { spaces: [{ id: "s1", name: "Product" }] }],
    ["/space/s1/folder?archived=false", {
      folders: [{ id: "f1", name: "Roadmap", lists: [{ id: "l2", name: "Later" }] }],
    }],
    ["/space/s1/list?archived=false", { lists: [{ id: "l1", name: "Inbox" }] }],
  ]);
  const baseUrl = "https://example.test/api/v2";
  const client = new ClickUpClient("pk_secret", {
    baseUrl,
    fetchImpl: async (url) => response(routes.get(url.slice(baseUrl.length))),
  });

  assert.deepEqual(await client.discoverLists(), [
    { id: "l1", name: "Inbox", folder: "", space: "Product", workspace: "Work" },
    { id: "l2", name: "Later", folder: "Roadmap", space: "Product", workspace: "Work" },
  ]);
});
