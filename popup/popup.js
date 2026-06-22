/**
 * popup.js
 * 
 * Interface do popup da extensão. Gerencia:
 * - CRUD de perfis
 * - Formulário de dados do candidato
 * - Templates de resposta
 * - Histórico de candidaturas
 * - Configurações
 * - Export/Import
 */

(function () {
  'use strict';

  // ─── ESTADO ─────────────────────────────────────────────────────
  let currentProfiles = [];
  let currentProfileId = null;
  let isSaving = false;

  // ─── DOM REFS ───────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  const profileList = $('profile-list');
  const profileForm = $('profile-form');
  const fieldLabel = $('field-label');
  const saveStatus = $('save-status');
  const templatesContainer = $('templates-container');

  // ─── INICIALIZAÇÃO ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    await loadProfiles();
    loadSettings();
    setupTabs();
    setupEventListeners();
  });

  // ─── CARREGA PERFIS ────────────────────────────────────────────
  async function loadProfiles() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['profiles', 'activeProfileId'], async (result) => {
        currentProfiles = result.profiles || [];
        currentProfileId = result.activeProfileId || null;

        renderProfileList();
        
        if (currentProfileId) {
          const profile = currentProfiles.find(p => p.id === currentProfileId);
          if (profile) {
            renderProfileForm(profile);
          } else if (currentProfiles.length > 0) {
            switchProfile(currentProfiles[0].id);
          }
        } else if (currentProfiles.length > 0) {
          switchProfile(currentProfiles[0].id);
        }

        resolve();
      });
    });
  }

  function renderProfileList() {
    profileList.innerHTML = '';
    currentProfiles.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label || `Perfil ${i + 1}`;
      if (p.id === currentProfileId) opt.selected = true;
      profileList.appendChild(opt);
    });

    if (currentProfiles.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Nenhum perfil — crie um!';
      opt.disabled = true;
      opt.selected = true;
      profileList.appendChild(opt);
      profileForm.style.display = 'none';
    } else {
      profileForm.style.display = 'block';
    }
  }

  function renderProfileForm(profile) {
    if (!profile) return;
    fieldLabel.value = profile.label || '';

    const data = profile.data || {};
    for (const [key, value] of Object.entries(data)) {
      const el = $(`f-${key}`);
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = Boolean(value);
        } else {
          el.value = value ?? '';
        }
      }
    }

    // Templates
    renderTemplates(profile.templates || []);
  }

  // ─── SWITCH PROFILE ────────────────────────────────────────────
  async function switchProfile(id) {
    currentProfileId = id;
    profileList.value = id;
    await chrome.storage.sync.set({ activeProfileId: id });

    const profile = currentProfiles.find(p => p.id === id);
    if (profile) renderProfileForm(profile);
  }

  // ─── CRUD PERFIS ───────────────────────────────────────────────
  async function addProfile() {
    if (typeof FIELD_DICTIONARY === 'undefined') {
      showSaveStatus('❌ Erro: dicionário de campos não carregado.', 'warning');
      return;
    }
    const count = currentProfiles.length + 1;
    const newProfile = {
      id: 'profile_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label: `Perfil ${count}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: createEmptyData(),
      templates: []
    };

    currentProfiles.push(newProfile);
    await chrome.storage.sync.set({ profiles: currentProfiles });
    await switchProfile(newProfile.id);
    renderProfileList();
    
    // Foca no nome do perfil
    fieldLabel.focus();
    fieldLabel.select();
  }

  async function duplicateProfile() {
    const current = currentProfiles.find(p => p.id === currentProfileId);
    if (!current) return;

    const clone = JSON.parse(JSON.stringify(current));
    clone.id = 'profile_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    clone.label = current.label + ' (cópia)';
    clone.createdAt = new Date().toISOString();
    clone.updatedAt = new Date().toISOString();

    currentProfiles.push(clone);
    await chrome.storage.sync.set({ profiles: currentProfiles });
    await switchProfile(clone.id);
    renderProfileList();
    showSaveStatus('📋 Perfil duplicado!', 'info');
  }

  async function deleteProfile() {
    if (currentProfiles.length <= 1) {
      showSaveStatus('⚠️ Não pode excluir o último perfil.', 'warning');
      return;
    }

    if (!confirm(`Excluir perfil "${currentProfiles.find(p => p.id === currentProfileId)?.label}"?`)) {
      return;
    }

    currentProfiles = currentProfiles.filter(p => p.id !== currentProfileId);
    await chrome.storage.sync.set({ profiles: currentProfiles });

    if (currentProfiles.length > 0) {
      await switchProfile(currentProfiles[0].id);
    } else {
      currentProfileId = null;
      profileForm.style.display = 'none';
    }

    renderProfileList();
    showSaveStatus('🗑️ Perfil excluído.', 'info');
  }

  // ─── SALVAR PERFIL ─────────────────────────────────────────────
  async function saveProfile(event) {
    if (event) event.preventDefault();
    if (isSaving) return;
    isSaving = true;

    try {
      const label = fieldLabel.value.trim();
      if (!label) {
        showSaveStatus('⚠️ Defina um nome para o perfil.', 'warning');
        fieldLabel.focus();
        isSaving = false;
        return;
      }

      const profile = currentProfiles.find(p => p.id === currentProfileId);
      if (!profile) {
        showSaveStatus('⚠️ Nenhum perfil selecionado.', 'warning');
        isSaving = false;
        return;
      }

      if (typeof FIELD_DICTIONARY === 'undefined') {
        showSaveStatus('❌ Erro: dicionário de campos não carregado.', 'warning');
        isSaving = false;
        return;
      }

      // Coleta dados do formulário
      const data = {};
      for (const entry of FIELD_DICTIONARY) {
        const el = $(`f-${entry.key}`);
        if (el) {
          if (el.type === 'checkbox') {
            data[entry.key] = el.checked;
          } else {
            data[entry.key] = el.value.trim();
          }
        }
      }

      // Coleta templates
      const templates = collectTemplates();

      profile.label = label;
      profile.data = data;
      profile.templates = templates;
      profile.updatedAt = new Date().toISOString();

      await chrome.storage.sync.set({ profiles: currentProfiles });
      renderProfileList();
      showSaveStatus('✅ Salvo!', 'success');
    } catch (err) {
      console.error('[PreenchimentoRapido] Erro ao salvar:', err);
      showSaveStatus('❌ Erro ao salvar: ' + err.message, 'warning');
    }

    isSaving = false;
  }

  function collectTemplates() {
    const items = templatesContainer.querySelectorAll('.template-item');
    const templates = [];
    items.forEach(item => {
      const name = item.querySelector('.tpl-name')?.value?.trim();
      const content = item.querySelector('.tpl-content')?.value?.trim();
      if (name && content) {
        templates.push({
          id: item.dataset.id || 'tpl_' + Date.now().toString(36),
          name,
          content
        });
      }
    });
    return templates;
  }

  // ─── TEMPLATES ─────────────────────────────────────────────────
  function renderTemplates(templates) {
    templatesContainer.innerHTML = '';
    if (!templates || templates.length === 0) {
      templatesContainer.innerHTML = '<p class="help-text" style="font-style:italic">Nenhum template ainda. Crie um para respostas como "Conte sobre você".</p>';
      return;
    }
    templates.forEach(t => addTemplateRow(t));
  }

  function addTemplateRow(template) {
    const tpl = template || { id: 'tpl_' + Date.now().toString(36), name: '', content: '' };
    
    const div = document.createElement('div');
    div.className = 'template-item';
    div.dataset.id = tpl.id;
    div.innerHTML = `
      <div class="template-fields">
        <input type="text" class="tpl-name input-full" placeholder="Nome do template (ex: Carta de apresentação)" value="${escapeHtml(tpl.name)}">
        <textarea class="tpl-content textarea-full" rows="3" placeholder="Conteúdo... use {nome} {vaga} {empresa}">${escapeHtml(tpl.content)}</textarea>
      </div>
      <button type="button" class="btn-remove-template" title="Remover template">✕</button>
    `;

    div.querySelector('.btn-remove-template').addEventListener('click', () => {
      div.remove();
      if (templatesContainer.querySelectorAll('.template-item').length === 0) {
        templatesContainer.innerHTML = '<p class="help-text" style="font-style:italic">Nenhum template ainda. Crie um para respostas como "Conte sobre você".</p>';
      }
    });

    // Se for a mensagem de "nenhum template", substitui
    const emptyMsg = templatesContainer.querySelector('.help-text');
    if (emptyMsg && !template) {
      templatesContainer.innerHTML = '';
    }
    
    templatesContainer.appendChild(div);
  }

  // ─── HISTÓRICO ─────────────────────────────────────────────────
  async function loadHistory() {
    const historyList = $('history-list');
    const countEl = $('history-count');

    return new Promise((resolve) => {
      chrome.storage.local.get('applications', (result) => {
        const apps = result.applications || [];
        countEl.textContent = `${apps.length} candidatura${apps.length !== 1 ? 's' : ''}`;

        if (apps.length === 0) {
          historyList.innerHTML = '<div class="empty-state">Nenhuma candidatura registrada ainda.</div>';
          resolve();
          return;
        }

        historyList.innerHTML = apps.map(app => {
          const date = new Date(app.date);
          const dateStr = date.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
          });
          const domain = extractDomain(app.url);
          return `
            <div class="history-item">
              <div class="h-title">${escapeHtml(app.title || domain)}</div>
              <div class="h-meta">
                <span>${dateStr}</span>
                <span>${app.filled}/${app.total} campos</span>
                <span class="h-profile">${escapeHtml(app.profileLabel || '')}</span>
              </div>
            </div>
          `;
        }).join('');

        resolve();
      });
    });
  }

  function extractDomain(url) {
    try { return new URL(url).hostname; } catch { return url; }
  }

  async function clearHistory() {
    if (!confirm('Limpar todo o histórico de candidaturas?')) return;
    await chrome.storage.local.set({ applications: [] });
    await loadHistory();
    showSaveStatus('🧹 Histórico limpo!', 'info');
  }

  // ─── CONFIGURAÇÕES ─────────────────────────────────────────────
  function loadSettings() {
    chrome.storage.sync.get('settings', (result) => {
      const s = result.settings || {};
      $('s-autoFill').checked = s.autoFill || false;
      $('s-showFloatingButton').checked = s.showFloatingButton !== false;
      $('s-confirmBeforeFill').checked = s.confirmBeforeFill !== false;
      $('s-fillDelay').value = s.fillDelay || 50;
      $('s-delay-value').textContent = s.fillDelay || 50;
    });
  }

  async function saveSetting(key, value) {
    chrome.storage.sync.get('settings', (result) => {
      const settings = result.settings || {};
      settings[key] = value;
      chrome.storage.sync.set({ settings });
    });
  }

  // ─── EXPORT / IMPORT ───────────────────────────────────────────
  async function exportData() {
    const data = await new Promise(resolve => {
      chrome.storage.sync.get(null, (sync) => {
        chrome.storage.local.get('applications', (local) => {
          resolve({
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            profiles: sync.profiles || [],
            activeProfileId: sync.activeProfileId || null,
            settings: sync.settings || null,
            applications: local.applications || []
          });
        });
      });
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preenchimento-rapido-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData() {
    $('import-file').click();
  }

  async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.profiles) {
        alert('Arquivo inválido: campos "profiles" não encontrados.');
        return;
      }

      if (data.profiles) await chrome.storage.sync.set({ profiles: data.profiles });
      if (data.activeProfileId) await chrome.storage.sync.set({ activeProfileId: data.activeProfileId });
      if (data.settings) await chrome.storage.sync.set({ settings: data.settings });
      if (data.applications) await chrome.storage.local.set({ applications: data.applications });

      await loadProfiles();
      loadSettings();
      showSaveStatus('📥 Dados importados com sucesso!', 'success');
    } catch (e) {
      alert('Erro ao importar: ' + e.message);
    }

    event.target.value = '';
  }

  // ─── TABS ──────────────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById(`view-${tab.dataset.tab}`);
        if (target) {
          target.classList.add('active');
          if (tab.dataset.tab === 'history') loadHistory();
        }
      });
    });
  }

  // ─── EVENT LISTENERS ───────────────────────────────────────────
  function setupEventListeners() {
    // Perfil selector
    profileList.addEventListener('change', (e) => {
      switchProfile(e.target.value);
    });

    // CRUD
    $('btn-add-profile').addEventListener('click', addProfile);
    $('btn-duplicate-profile').addEventListener('click', duplicateProfile);
    $('btn-delete-profile').addEventListener('click', deleteProfile);

    // Form
    profileForm.addEventListener('submit', saveProfile);

    // Templates
    $('btn-add-template').addEventListener('click', () => addTemplateRow());

    // Settings
    $('btn-settings').addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector('[data-tab="settings"]').classList.add('active');
      $('view-settings').classList.add('active');
    });

    // Settings toggles
    $('s-autoFill').addEventListener('change', (e) => saveSetting('autoFill', e.target.checked));
    $('s-showFloatingButton').addEventListener('change', (e) => saveSetting('showFloatingButton', e.target.checked));
    $('s-confirmBeforeFill').addEventListener('change', (e) => saveSetting('confirmBeforeFill', e.target.checked));
    $('s-fillDelay').addEventListener('input', (e) => {
      $('s-delay-value').textContent = e.target.value;
      saveSetting('fillDelay', parseInt(e.target.value));
    });

    // Export / Import
    $('btn-export').addEventListener('click', exportData);
    $('btn-import').addEventListener('click', importData);
    $('import-file').addEventListener('change', handleImportFile);

    // History
    $('btn-clear-history').addEventListener('click', clearHistory);

    // Fechar popup com Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') window.close();
    });
  }

  // ─── UTILITIES ─────────────────────────────────────────────────
  function createEmptyData() {
    if (typeof FIELD_DICTIONARY === 'undefined') return {};
    const data = {};
    for (const entry of FIELD_DICTIONARY) {
      data[entry.key] = entry.type === 'checkbox' ? false : '';
    }
    return data;
  }

  function showSaveStatus(msg, type = 'info') {
    saveStatus.textContent = msg;
    saveStatus.style.color = 
      type === 'success' ? 'var(--success)' :
      type === 'warning' ? 'var(--warning)' :
      'var(--text-secondary)';
    
    clearTimeout(saveStatus._timeout);
    saveStatus._timeout = setTimeout(() => {
      saveStatus.textContent = '';
    }, 3000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
