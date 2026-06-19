/**
 * storage.js
 * 
 * Wrapper sobre chrome.storage.sync + chrome.storage.local.
 * 
 * - Perfis e templates → sync (roam entre dispositivos, limite 100KB)
 * - Histórico de candidaturas → local (ilimitado)
 */

const STORAGE = (() => {
  // ─── CHAVES ───────────────────────────────────────────────────────
  const KEYS = {
    PROFILES: 'profiles',
    ACTIVE_PROFILE: 'activeProfileId',
    APPLICATIONS: 'applications',
    SETTINGS: 'settings'
  };

  // ─── PERFIS ───────────────────────────────────────────────────────
  async function getProfiles() {
    const result = await chrome.storage.sync.get(KEYS.PROFILES);
    return result[KEYS.PROFILES] || [];
  }

  async function saveProfiles(profiles) {
    await chrome.storage.sync.set({ [KEYS.PROFILES]: profiles });
  }

  async function getActiveProfileId() {
    const result = await chrome.storage.sync.get(KEYS.ACTIVE_PROFILE);
    return result[KEYS.ACTIVE_PROFILE] || null;
  }

  async function setActiveProfileId(id) {
    await chrome.storage.sync.set({ [KEYS.ACTIVE_PROFILE]: id });
  }

  async function getActiveProfile() {
    const profiles = await getProfiles();
    const activeId = await getActiveProfileId();
    return profiles.find(p => p.id === activeId) || profiles[0] || null;
  }

  async function saveProfile(profile) {
    const profiles = await getProfiles();
    const idx = profiles.findIndex(p => p.id === profile.id);
    if (idx >= 0) {
      profiles[idx] = profile;
    } else {
      profiles.push(profile);
    }
    await saveProfiles(profiles);
    return profile;
  }

  async function deleteProfile(id) {
    let profiles = await getProfiles();
    profiles = profiles.filter(p => p.id !== id);
    await saveProfiles(profiles);
    const activeId = await getActiveProfileId();
    if (activeId === id) {
      await setActiveProfileId(profiles.length > 0 ? profiles[0].id : null);
    }
  }

  // ─── CONFIGURAÇÕES ───────────────────────────────────────────────
  async function getSettings() {
    const result = await chrome.storage.sync.get(KEYS.SETTINGS);
    return result[KEYS.SETTINGS] || {
      autoFill: false,
      showFloatingButton: true,
      fillDelay: 50,
      confirmBeforeFill: true
    };
  }

  async function saveSettings(settings) {
    await chrome.storage.sync.set({ [KEYS.SETTINGS]: settings });
  }

  // ─── HISTÓRICO (local) ───────────────────────────────────────────
  async function getApplications() {
    const result = await chrome.storage.local.get(KEYS.APPLICATIONS);
    return result[KEYS.APPLICATIONS] || [];
  }

  async function saveApplication(app) {
    const apps = await getApplications();
    apps.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ...app,
      date: app.date || new Date().toISOString()
    });
    // Keep last 200
    if (apps.length > 200) apps.length = 200;
    await chrome.storage.local.set({ [KEYS.APPLICATIONS]: apps });
  }

  async function clearApplications() {
    await chrome.storage.local.set({ [KEYS.APPLICATIONS]: [] });
  }

  // ─── EXPORT / IMPORT ─────────────────────────────────────────────
  async function exportAll() {
    const syncData = await chrome.storage.sync.get(null);
    const localData = await chrome.storage.local.get(KEYS.APPLICATIONS);
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profiles: syncData[KEYS.PROFILES] || [],
      activeProfileId: syncData[KEYS.ACTIVE_PROFILE] || null,
      settings: syncData[KEYS.SETTINGS] || null,
      applications: localData[KEYS.APPLICATIONS] || []
    };
  }

  async function importAll(data) {
    if (data.profiles) {
      await chrome.storage.sync.set({ [KEYS.PROFILES]: data.profiles });
    }
    if (data.activeProfileId) {
      await chrome.storage.sync.set({ [KEYS.ACTIVE_PROFILE]: data.activeProfileId });
    }
    if (data.settings) {
      await chrome.storage.sync.set({ [KEYS.SETTINGS]: data.settings });
    }
    if (data.applications) {
      await chrome.storage.local.set({ [KEYS.APPLICATIONS]: data.applications });
    }
  }

  // ─── API PÚBLICA ─────────────────────────────────────────────────
  return {
    getProfiles,
    saveProfiles,
    getActiveProfileId,
    setActiveProfileId,
    getActiveProfile,
    saveProfile,
    deleteProfile,
    getSettings,
    saveSettings,
    getApplications,
    saveApplication,
    clearApplications,
    exportAll,
    importAll
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STORAGE };
}
