const DEFAULTS = {
  maxHistory: 1000,
  ignoredDomains: [],
  ignoredTypes: [],
  ignoredMethods: [],
  theme: 'dark',
  pauseOnDetach: false,
  autoExport: false,
  enableNotifications: false,
};

export async function getSettings() {
  const result = await chrome.storage.local.get('settings');
  return { ...DEFAULTS, ...(result.settings || {}) };
}

export async function saveSettings(settings) {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await chrome.storage.local.set({ settings: merged });
  return merged;
}

export async function resetSettings() {
  await chrome.storage.local.set({ settings: DEFAULTS });
  return { ...DEFAULTS };
}

export async function saveRequests(requests) {
  await chrome.storage.session.set({ requests });
}

export async function getRequests() {
  const result = await chrome.storage.session.get('requests');
  return result.requests || [];
}

export async function clearRequests() {
  await chrome.storage.session.remove('requests');
}

export async function appendRequests(newEntries) {
  const existing = await getRequests();
  const settings = await getSettings();
  const max = settings.maxHistory;
  const combined = [...newEntries, ...existing];
  if (combined.length > max) combined.length = max;
  await saveRequests(combined);
  return combined;
}

export async function getExportData() {
  return await getRequests();
}

export function getStorageEstimate() {
  if (navigator.storage?.estimate) {
    return navigator.storage.estimate();
  }
  return Promise.resolve({ usage: 0, quota: 0 });
}
