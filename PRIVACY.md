# Privacy Policy

Effective date: August 17, 2026

Quick Add to ClickUp is a browser extension built by HichemTab-tech. It creates ClickUp tasks only when you explicitly choose one of its context-menu actions.

## Data we handle

The extension stores the following information locally in your Chrome profile:

- Your ClickUp personal API token
- Your configured quick actions, templates, and destination List IDs
- Your ClickUp user ID and display name, when “Assign to me” is enabled

This information uses `chrome.storage.local` and is not synced by the extension. **Forget token** removes the token and connected-user identity; action settings remain until you clear the extension data or uninstall the extension.

When you invoke a quick action, the extension may send the configured task title and description—including selected text, the current page title or URL, and a clicked link or image URL—directly to the ClickUp API. ClickUp processes and stores that task under your account according to [ClickUp's Privacy Policy](https://clickup.com/terms/privacy-policy).

## What we do not do

- We do not collect analytics or telemetry.
- We do not operate a server that receives your token or task data.
- We do not sell, rent, or share your information with advertisers or data brokers.
- We do not monitor browsing activity or run scripts on webpages.

The use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including its Limited Use requirements.

## Permissions

- `contextMenus`: shows your configured quick actions.
- `activeTab`: reads the current page title after you click a quick action.
- `storage`: saves your token and settings locally.
- `notifications`: confirms whether a task was created.
- `https://api.clickup.com/*`: communicates directly with ClickUp.

## Security and control

Your token is treated as a password and restricted to trusted extension contexts. You can remove it at any time with **Forget token** in the extension settings. Because no storage mechanism can guarantee absolute security, use a personal token only on devices and Chrome profiles you trust.

## Contact

Questions or privacy requests can be submitted through the [project's GitHub Issues](https://github.com/HichemTab-tech/quick-add-to-clickup/issues).
