# Quick Add to ClickUp

[![CI](https://github.com/HichemTab-tech/quick-add-to-clickup/actions/workflows/ci.yml/badge.svg)](https://github.com/HichemTab-tech/quick-add-to-clickup/actions/workflows/ci.yml)

Create ClickUp tasks instantly from selected text, links, images, or any webpage using configurable Chrome context-menu actions.

## Features

- Multiple quick actions, each targeting a different ClickUp List
- Custom title and description templates
- Optional assignee, priority, status, tags, and open-after-create behavior
- Automatic Workspace and List discovery
- Local-only token storage with no analytics or intermediary server
- Dependency-free Chrome Manifest V3 extension

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the repository folder.
4. Paste your personal ClickUp API token into the settings page.
5. Load your Lists, configure an action, and save.

Create a personal token under **ClickUp Settings → Apps → API Token** and treat it like a password.

## Templates

Use `{{selection}}`, `{{linkUrl}}`, `{{pageUrl}}`, `{{pageTitle}}`, `{{imageUrl}}`, `{{date}}`, or `{{datetime}}`. Fallbacks are supported:

```text
{{selection || linkUrl || pageTitle}}
```

## Development

There is no build step or runtime dependency.

```bash
npm run check
npm run package
```

## CI/CD

GitHub Actions validates and packages every push to `master` and every pull request. Publishing a GitHub Release uploads the matching package to the Chrome Web Store and submits it for review. The release tag must match `manifest.json` (for example, `v0.1.2`).

Configure these repository secrets before publishing:

- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`
- `CWS_PUBLISHER_ID`
- `CWS_EXTENSION_ID`

The release workflow can also be run manually from GitHub Actions. It uses the [Chrome Web Store API v2](https://developer.chrome.com/docs/webstore/api/reference/rest) and requires OAuth credentials with the `chromewebstore` scope.

Read the [Privacy Policy](PRIVACY.md). Source available at [HichemTab-tech/quick-add-to-clickup](https://github.com/HichemTab-tech/quick-add-to-clickup).

Licensed under the [MIT License](LICENSE).

Built by [HichemTab-tech](https://github.com/HichemTab-tech).
