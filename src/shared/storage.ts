import { STORAGE_SETTINGS_KEY, STORAGE_TRANSLATOR_SETTINGS_KEY } from "./constants";
import { DEFAULT_SETTINGS, sanitizeSettings } from "./settings";
import { DEFAULT_TRANSLATOR_SETTINGS, sanitizeTranslatorSettings } from "./translator";
import type {
  TranslatorSettings,
  UserSettings,
} from "./types";

export async function getSettings(): Promise<UserSettings> {
  const localResult = await chrome.storage.local.get(STORAGE_SETTINGS_KEY);
  const localSettings = localResult[STORAGE_SETTINGS_KEY] as Partial<UserSettings> | undefined;

  if (localSettings) {
    return sanitizeSettings(localSettings);
  }

  const syncResult = await chrome.storage.sync.get(STORAGE_SETTINGS_KEY);
  const legacySettings = syncResult[STORAGE_SETTINGS_KEY] as Partial<UserSettings> | undefined;
  const sanitized = sanitizeSettings(legacySettings ?? DEFAULT_SETTINGS);

  if (legacySettings) {
    await chrome.storage.local.set({
      [STORAGE_SETTINGS_KEY]: sanitized,
    });
  }

  return sanitized;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_SETTINGS_KEY]: sanitizeSettings(settings),
  });
}

export async function getTranslatorSettings(): Promise<TranslatorSettings> {
  const result = await chrome.storage.local.get(STORAGE_TRANSLATOR_SETTINGS_KEY);
  return sanitizeTranslatorSettings(
    (result[STORAGE_TRANSLATOR_SETTINGS_KEY] as Partial<TranslatorSettings> | undefined) ??
      DEFAULT_TRANSLATOR_SETTINGS,
  );
}

export async function saveTranslatorSettings(settings: TranslatorSettings): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_TRANSLATOR_SETTINGS_KEY]: sanitizeTranslatorSettings(settings),
  });
}
