import { SETTINGS_KEY, createDefaultSettings, normalizeSettings } from "./config.js";

export async function protectLocalStorage() {
  if (!chrome.storage.local.setAccessLevel) return;

  await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
}

export async function getSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  if (!stored[SETTINGS_KEY]) {
    const defaults = createDefaultSettings();
    await chrome.storage.local.set({ [SETTINGS_KEY]: defaults });
    return defaults;
  }

  return normalizeSettings(stored[SETTINGS_KEY]);
}

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: normalized });
  return normalized;
}
