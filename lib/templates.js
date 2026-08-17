const VARIABLE_PATTERN = /{{\s*([^{}]+?)\s*}}/g;

function valueFor(name, context) {
  const value = context[name.trim()];
  return value === null || value === undefined ? "" : String(value);
}

function resolveExpression(expression, context) {
  const candidates = expression.split("||");
  for (const candidate of candidates) {
    const value = valueFor(candidate, context);
    if (value.trim()) return value;
  }
  return "";
}

export function renderTemplate(template, context) {
  return String(template ?? "").replace(VARIABLE_PATTERN, (_, expression) =>
    resolveExpression(expression, context),
  );
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "the web";
  }
}

export function buildTemplateContext(info = {}, tab = {}, now = new Date()) {
  return {
    selection: info.selectionText?.trim() ?? "",
    linkUrl: info.linkUrl ?? "",
    pageUrl: info.pageUrl ?? tab.url ?? "",
    pageTitle: tab.title ?? "",
    imageUrl: info.mediaType === "image" ? info.srcUrl ?? "" : "",
    mediaUrl: info.srcUrl ?? "",
    date: now.toISOString().slice(0, 10),
    datetime: now.toISOString(),
  };
}

export function createTaskDraft(action, info, tab, now) {
  const context = buildTemplateContext(info, tab, now);
  const renderedTitle = renderTemplate(action.titleTemplate, context)
    .replace(/\s+/g, " ")
    .trim();
  const fallbackTitle = context.selection || context.linkUrl || context.pageTitle ||
    `New task from ${hostFromUrl(context.pageUrl)}`;

  return {
    name: (renderedTitle || fallbackTitle).slice(0, 500),
    markdown_content: renderTemplate(action.descriptionTemplate, context).trim(),
  };
}
