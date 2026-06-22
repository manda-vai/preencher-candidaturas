/**
 * background.js
 * 
 * Service worker (Manifest V3) para:
 * - Gerenciar atalhos de teclado (Ctrl+Shift+F)
 * - Receber mensagens do content script e popup
 * - Injetar script em abas quando necessário
 */

'use strict';

// ─── COMANDO DE TECLADO ─────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'fill-form') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'fill' });
    } catch (e) {
      // Content script não carregado ou página não suportada
      console.warn('[PreenchimentoRapido] Não foi possível preencher:', e.message);
    }
  }
});

// ─── INSTALAÇÃO / ATUALIZAÇÃO ────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Perfil inicial padrão na primeira instalação
    const defaultProfile = createEmptyProfile('Padrão');
    
    chrome.storage.sync.get('profiles', (result) => {
      const profiles = result.profiles || [];
      if (profiles.length === 0) {
        chrome.storage.sync.set({
          profiles: [defaultProfile],
          activeProfileId: defaultProfile.id,
          settings: {
            autoFill: false,
            showFloatingButton: true,
            fillDelay: 50,
            confirmBeforeFill: true
          }
        });
      }
    });

    console.log('[PreenchimentoRapido] Extensão instalada!');
  }
  
  if (details.reason === 'update') {
    console.log('[PreenchimentoRapido] Extensão atualizada!');
  }
});

// ─── UTILITIES ────────────────────────────────────────────────────
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
