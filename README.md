# Quick Add to ClickUp

A personal Chrome extension that creates ClickUp tasks from configurable context-menu actions.

Select text, right-click a link, image, or page, then choose an action such as **Add to Inbox**. Each action can target a different ClickUp list and use its own title, description, assignee, priority, status, tags, and open-after-create behavior.

## Current feature set

- Manifest V3 extension with no runtime or build dependencies
- Personal ClickUp API token stored only in `chrome.storage.local`
- Extension storage restricted to trusted extension contexts
- ClickUp workspace/list discovery—no need to copy list IDs manually
- Any number of ordered, enabled/disabled context-menu actions
- Page, selection, link, and image context targeting
- Temporary `activeTab` access on a context-menu click so title templates can read the current page title
- Template variables and fallback expressions
- Native success and error notifications
- Optional assignment to the connected ClickUp user
- Optional opening of the newly created task

## Install locally

1. Open `chrome://extensions` in Chrome or Chromium.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository directory.
5. The settings page opens automatically. Paste a ClickUp personal API token and choose **Connect & load lists**.
6. Select a destination list for the initial action and save.

Create a personal token in ClickUp under **Settings → Apps → API Token**. Treat it like a password.

## Templates

The following variables are supported:

| Variable | Value |
| --- | --- |
| `{{selection}}` | Selected page text |
| `{{linkUrl}}` | The right-clicked link destination |
| `{{pageUrl}}` | Current page URL |
| `{{pageTitle}}` | Current tab title |
| `{{imageUrl}}` | Right-clicked image URL |
| `{{mediaUrl}}` | Right-clicked image, audio, or video URL |
| `{{date}}` | Current date in ISO format |
| `{{datetime}}` | Current timestamp in ISO format |

Fallback expressions choose the first non-empty variable:

```text
{{selection || linkUrl || pageTitle}}
```

## Security model

This initial version is intentionally a personal tool. It uses a personal API token and talks directly to `https://api.clickup.com`. The token is stored locally, is not placed in sync storage, and is restricted from content-script access. The extension does not inject scripts into websites. Its only persistent host access is ClickUp's API; `activeTab` grants temporary access to the current tab after you explicitly click a context-menu action.

For a public, multi-user release, replace the personal-token screen with ClickUp OAuth and perform the client-secret token exchange on a backend or serverless function.

## Development

No install or build step is required. Run all checks with a current Node.js release:

```bash
npm test
npm run check
```

The implementation follows the current [Chrome Manifest V3 documentation](https://developer.chrome.com/docs/extensions/reference/manifest), [Chrome context menus API](https://developer.chrome.com/docs/extensions/reference/api/contextMenus), and [ClickUp Create Task API](https://developer.clickup.com/reference/createtask).
