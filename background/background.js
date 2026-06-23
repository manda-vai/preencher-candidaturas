/**
 * background.js (Service Worker — Manifest V3)
 * 
 * Responsabilidades:
 * - Atalho de teclado (Ctrl+Shift+F)
 * - Migração automática sync→local na atualização
 * - Criação de perfil padrão na instalação
 */

'use strict';

// ─── COMANDO DE TECLADO ─────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'fill-form') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'fill' });
    } catch (e) {
      console.warn(
        '[PreenchimentoRapido] Não foi possível preencher:',
        e.message || 'content script não encontrado'
      );
    }
  }
});

// ─── CONSTANTES ──────────────────────────────────────────────────
const STORAGE_KEYS = {
  PROFILES: 'profiles',
  ACTIVE_PROFILE: 'activeProfileId',
  APPLICATIONS: 'applications',
  SETTINGS: 'settings'
};

// ─── INSTALAÇÃO / ATUALIZAÇÃO ────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  const reason = details.reason;

  // --- ATUALIZAÇÃO: migrar perfis sync → local ---
  if (reason === 'update') {
    await migrateProfilesFromSyncToLocal();
  }

  // --- INSTALAÇÃO: criar perfil padrão ---
  if (reason === 'install') {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PROFILES);
    const existingProfiles = result[STORAGE_KEYS.PROFILES] || [];

    if (existingProfiles.length === 0) {
      const defaultProfile = createEmptyProfile('Padrão');
      await chrome.storage.local.set({ [STORAGE_KEYS.PROFILES]: [defaultProfile] });
      await chrome.storage.sync.set({ [STORAGE_KEYS.ACTIVE_PROFILE]: defaultProfile.id });
      await chrome.storage.sync.set({
        [STORAGE_KEYS.SETTINGS]: {
          autoFill: false,
          showFloatingButton: true,
          fillDelay: 50,
          confirmBeforeFill: true
        }
      });
    }

    console.log('[PreenchimentoRapido] Extensão instalada com sucesso!');
  }
});

// ─── MIGRAÇÃO: SYNC → LOCAL ──────────────────────────────────────
async function migrateProfilesFromSyncToLocal() {
  try {
    // Lê perfis do sync (formato legado da v1.0.x)
    const syncResult = await chrome.storage.sync.get(STORAGE_KEYS.PROFILES);
    const legacyProfiles = syncResult[STORAGE_KEYS.PROFILES];

    if (!legacyProfiles || !Array.isArray(legacyProfiles) || legacyProfiles.length === 0) {
      console.log('[PreenchimentoRapido] Nenhum perfil legado para migrar.');
      return;
    }

    // Verifica se já não foram migrados (local tem dados mais recentes)
    const localResult = await chrome.storage.local.get(STORAGE_KEYS.PROFILES);
    const localProfiles = localResult[STORAGE_KEYS.PROFILES] || [];

    if (localProfiles.length > 0) {
      console.log('[PreenchimentoRapido] Dados locais já existem. Mantendo locais (sync ignorado).');
      // Remove do sync mesmo assim pra liberar quota
      await chrome.storage.sync.remove(STORAGE_KEYS.PROFILES);
      return;
    }

    // Migra: sync → local
    console.log(`[PreenchimentoRapido] Migrando ${legacyProfiles.length} perfil(is) de sync → local...`);
    await chrome.storage.local.set({ [STORAGE_KEYS.PROFILES]: legacyProfiles });

    // Remove do sync para liberar quota (cada perfil pode ter até 8KB)
    await chrome.storage.sync.remove(STORAGE_KEYS.PROFILES);

    console.log('[PreenchimentoRapido] Migração concluída!');
  } catch (err) {
    console.error('[PreenchimentoRapido] Erro na migração:', err);
  }
}

// ─── CRIA PERFIL VAZIO ───────────────────────────────────────────
function createEmptyProfile(label) {
  return {
    id: 'profile_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    label: label || 'Novo Perfil',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: {
      nome: '',
      sobrenome: '',
      nomeCompleto: '',
      email: '',
      telefone: '',
      cpf: '',
      dataNascimento: '',
      genero: '',
      raca: '',
      pcd: false,
      cep: '',
      endereco: '',
      cidade: '',
      estado: '',
      pais: '',
      linkedin: '',
      portfolio: '',
      github: '',
      twitter: '',
      pretensaoSalarial: '',
      disponibilidade: '',
      escolaridade: '',
      curso: '',
      instituicao: '',
      resumoProfissional: '',
      comoSoube: ''
    },
    templates: []
  };
}

// Exporta para uso em testes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createEmptyProfile };
}
