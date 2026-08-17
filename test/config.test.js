import test from "node:test";
import assert from "node:assert/strict";

import { normalizeAction, normalizeSettings } from "../lib/config.js";

test("normalizes action contexts, priority, and tags", () => {
  const action = normalizeAction({
    id: "one",
    label: " Research ",
    contexts: ["selection", "invalid", "selection"],
    priority: "high",
    tags: [" reading ", "", "later"],
  });

  assert.equal(action.label, "Research");
  assert.deepEqual(action.contexts, ["selection"]);
  assert.equal(action.priority, "high");
  assert.deepEqual(action.tags, ["reading", "later"]);
});

test("does not preserve unknown priority values or malformed users", () => {
  const settings = normalizeSettings({
    apiToken: " pk_example ",
    currentUser: { username: "Nobody" },
    actions: [{ priority: "critical" }],
  });

  assert.equal(settings.apiToken, "pk_example");
  assert.equal(settings.currentUser, null);
  assert.equal(settings.actions[0].priority, "");
});
