import test from "node:test";
import assert from "node:assert/strict";

import { buildTemplateContext, createTaskDraft, renderTemplate } from "../lib/templates.js";

test("renders variables and first-present fallback expressions", () => {
  const context = { selection: "", linkUrl: "https://example.com/story", pageTitle: "Example" };

  assert.equal(
    renderTemplate("Save {{ selection || linkUrl || pageTitle }}", context),
    "Save https://example.com/story",
  );
  assert.equal(renderTemplate("{{missing}}", context), "");
});

test("builds the supported context-menu variables", () => {
  const now = new Date("2026-08-17T08:30:00.000Z");
  const context = buildTemplateContext(
    {
      selectionText: "  selected words  ",
      pageUrl: "https://example.com/page",
      linkUrl: "https://example.com/target",
      srcUrl: "https://example.com/image.png",
      mediaType: "image",
    },
    { title: "Page title" },
    now,
  );

  assert.deepEqual(context, {
    selection: "selected words",
    linkUrl: "https://example.com/target",
    pageUrl: "https://example.com/page",
    pageTitle: "Page title",
    imageUrl: "https://example.com/image.png",
    mediaUrl: "https://example.com/image.png",
    date: "2026-08-17",
    datetime: "2026-08-17T08:30:00.000Z",
  });
});

test("creates a compact title and rendered markdown description", () => {
  const draft = createTaskDraft(
    {
      titleTemplate: "{{selection || pageTitle}}",
      descriptionTemplate: "Source: {{pageUrl}}\n\n{{selection}}",
    },
    { selectionText: "A title\nwith whitespace", pageUrl: "https://example.com" },
    { title: "Fallback" },
  );

  assert.equal(draft.name, "A title with whitespace");
  assert.equal(draft.markdown_content, "Source: https://example.com\n\nA title\nwith whitespace");
});

test("falls back to a useful title when the template is empty", () => {
  const draft = createTaskDraft(
    { titleTemplate: "{{selection}}", descriptionTemplate: "" },
    { pageUrl: "https://www.example.com/article" },
    {},
  );

  assert.equal(draft.name, "New task from example.com");
});
