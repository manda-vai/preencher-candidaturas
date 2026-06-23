/**
 * storage.js
 * 
 * Wrapper ÚNICO para chrome.storage.
 * 
 * Arquitetura de armazenamento:
 * ┌─────────────────────┬──────────────────┬──────────────────────────────┐
 * │ Dado                │ Store            │ Motivo                       │
 * ├─────────────────────┼──────────────────┼──────────────────────────────┤
 * │ profiles            │ chrome.storage.local │ Pode exceder 8KB (limite │
 * │                     │                  │ do sync por item)            │
 * │ activeProfileId     │ chrome.storage.sync  │ String curta (< 100b)    │
 * │ settings            │ chrome.storage.sync  │ Objeto pequeno, roam     │
 * │ applications        │ chrome.storage.local │ Pode crescer (200 itens) │
 * └─────────────────────┴──────────────────┴──────────────────────────────┘
 * 
 * ⚠️ IMPORTANTE: Todo acesso a storage DEVE passar por este módulo.
 *    Nunca chame chrome.storage.directo() fora daqui.
 */

const STORAGE = (() => {
  'use strict';

  // ─── CONSTANTES ───────────────────────────────────────────────────
  const KEYS = {
    PROFILES: 'profiles',
    ACTIVE_PROFILE: 'activeProfileId',
    APPLICATIONS: 'applications',
    SETTINGS: 'settings'
  };

  // ─── PROFILES (LOCAL — pode exceder 8KB) ──────────────────────────
  async function getProfiles() {
    const result = await chrome.storage.local.get(KEYS.PROFILES);
    return result[KEYS.PROFILES] || [];
  }

  async function saveProfiles(profiles) {
    await chrome.storage.local.set({ [KEYS.PROFILES]: profiles });
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

  // ─── CONFIGURAÇÕES (SYNC — objeto pequeno) ────────────────────────
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

  // ─── HISTÓRICO (LOCAL — pode acumular 200+ registros) ─────────────
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

  // ─── EXPORT / IMPORT (lê de ambos os stores) ──────────────────────
  async function exportAll() {
    const profiles = await getProfiles();
    const activeProfileId = await getActiveProfileId();
    const settings = await getSettings();
    const applications = await getApplications();
    return {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      profiles,
      activeProfileId,
      settings,
      applications
    };
  }

  async function importAll(data) {
    if (data.profiles) {
      await saveProfiles(data.profiles);
    }
    if (data.activeProfileId) {
      await setActiveProfileId(data.activeProfileId);
    }
    if (data.settings) {
      await saveSettings(data.settings);
    }
    if (data.applications) {
      await chrome.storage.local.set({ [KEYS.APPLICATIONS]: data.applications });
    }
  }

  // ─── MIGRAÇÃO (1.x → 1.1: sync → local) ──────────────────────────
  async function migrateFromSync() {
    try {
      // Lê perfis do sync (formato legado)
      const syncResult = await chrome.storage.sync.get(KEYS.PROFILES);
      const legacyProfiles = syncResult[KEYS.PROFILES];

      if (legacyProfiles && Array.isArray(legacyProfiles) && legacyProfiles.length > 0) {
        // Verifica se já não foram migrados
        const localResult = await chrome.storage.local.get(KEYS.PROFILES);
        const localProfiles = localResult[KEYS.PROFILES] || [];

        if (localProfiles.length === 0) {
          console.log('[PreenchimentoRapido] Migrando perfis de sync → local...');
          await saveProfiles(legacyProfiles);

          // Remove do sync para liberar quota
          await chrome.storage.sync.remove(KEYS.PROFILES);
          console.log(`[PreenchimentoRapido] Migração concluída: ${legacyProfiles.length} perfil(is)`);
        } else {
          // Já tem dados locais, ignora os do sync (local ganha)
          console.log('[PreenchimentoRapido] Dados locais já existem, migração ignorada.');
        }
      } else {
        console.log('[PreenchimentoRapido] Nenhum perfil legado encontrado no sync.');
      }
    } catch (err) {
      console.error('[PreenchimentoRapido] Erro na migração:', err);
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
    importAll,
    migrateFromSync
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STORAGE };
}
