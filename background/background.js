/**
 * background.js (Service Worker — Manifest V3)
 * 
 * Responsabilidades:
 * - Atalho de teclado (Ctrl+Shift+F)
 * - Migração automática sync→local na atualização
 * - Criação de perfil padrão na instalação
 */

'use strict';

import { STORAGE } from '../lib/storage.module.js';
import { FIELD_DICTIONARY } from '../lib/field-dictionary.module.js';

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

// ─── INSTALAÇÃO / ATUALIZAÇÃO ────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  const reason = details.reason;

  // --- ATUALIZAÇÃO: migrar perfis sync → local ---
  if (reason === 'update') {
    await STORAGE.migrateFromSync();
  }

  // --- INSTALAÇÃO: criar perfil padrão ---
  if (reason === 'install') {
    const existingProfiles = await STORAGE.getProfiles();

    if (existingProfiles.length === 0) {
      const defaultProfile = createEmptyProfile('Padrão');
      await STORAGE.saveProfiles([defaultProfile]);
      await STORAGE.setActiveProfileId(defaultProfile.id);
      await STORAGE.saveSettings({
        autoFill: false,
        showFloatingButton: true,
        fillDelay: 50,
        confirmBeforeFill: true
      });
    }

    console.log('[PreenchimentoRapido] Extensão instalada com sucesso!');
  }
});

// ─── CRIA PERFIL VAZIO ───────────────────────────────────────────
function createEmptyProfile(label) {
  const data = {};
  for (const entry of FIELD_DICTIONARY) {
    data[entry.key] = entry.type === 'checkbox' ? false : '';
  }

  return {
    id: 'profile_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    label: label || 'Novo Perfil',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data,
    templates: []
  };
}

// Exporta para uso em testes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createEmptyProfile };
}
