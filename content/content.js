/**
 * content.js
 * 
 * Script injetado nas páginas de candidatura. Gerencia:
 * - Recepção de mensagens do popup e service worker
 * - Botão flutuante "Preencher"
 * - Execução do preenchimento automático
 * - Detecção de formulários multi-step
 * - Registro de candidaturas no histórico
 */

(function () {
  'use strict';

  // ─── ESTADO ─────────────────────────────────────────────────────
  let floatingButton = null;
  let isFilling = false;

  // ─── INICIALIZAÇÃO ──────────────────────────────────────────────
  function init() {
    // Aguarda um pouco pra garantir que o DOM React carregou
    setTimeout(() => {
      setupFloatingButton();
    }, 1500);

    // Observa mudanças no DOM (SPAs que carregam formulários depois)
    const observer = new MutationObserver(() => {
      if (!floatingButton && shouldShowButton()) {
        setupFloatingButton();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Escuta comandos do background
    chrome.runtime.onMessage.addListener(handleMessage);
  }

  // ─── BOTÃO FLUTUANTE ────────────────────────────────────────────
  function shouldShowButton() {
    const forms = document.querySelectorAll('form, [class*="form"], [class*="candidate"], ' +
      '[class*="application"], [id*="apply"], [class*="apply"], ' +
      'input:not([type="hidden"]):not([type="submit"])');
    return forms.length >= 3;
  }

  function setupFloatingButton() {
    if (floatingButton) return;
    if (!shouldShowButton()) return;

    floatingButton = document.createElement('div');
    floatingButton.id = 'preenchimento-rapido-btn';
    floatingButton.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      <span style="display:none">Preencher</span>
    `;

    // Estilos inline pra não depender de CSS externo
    Object.assign(floatingButton.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      backgroundColor: '#4285f4',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: '2147483647',
      boxShadow: '0 4px 12px rgba(66,133,244,0.4)',
      transition: 'all 0.2s ease',
      border: 'none',
      opacity: '0',
      transform: 'scale(0.8)'
    });

    // Anima entrada
    requestAnimationFrame(() => {
      floatingButton.style.opacity = '1';
      floatingButton.style.transform = 'scale(1)';
    });

    // Hover
    floatingButton.addEventListener('mouseenter', () => {
      floatingButton.style.transform = 'scale(1.1)';
      floatingButton.style.boxShadow = '0 6px 20px rgba(66,133,244,0.6)';
    });
    floatingButton.addEventListener('mouseleave', () => {
      floatingButton.style.transform = 'scale(1)';
      floatingButton.style.boxShadow = '0 4px 12px rgba(66,133,244,0.4)';
    });

    floatingButton.addEventListener('click', async () => {
      await fillCurrentForm();
    });

    document.body.appendChild(floatingButton);
  }

  // ─── HANDLER DE MENSAGENS ───────────────────────────────────────
  function handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'fill':
        fillCurrentForm().then(sendResponse);
        return true;

      case 'preview':
        const preview = FieldMatcher.getFieldsPreview();
        sendResponse({ success: true, fields: preview });
        return true;

      case 'ping':
        sendResponse({ success: true });
        return true;
    }
  }

  // ─── PREENCHIMENTO PRINCIPAL ────────────────────────────────────
  async function fillCurrentForm() {
    if (isFilling) return;
    isFilling = true;

    try {
      // 1. Pega o perfil ativo
      const profile = await getActiveProfile();
      if (!profile) {
        showToast('Nenhum perfil ativo. Configure no popup da extensão.', 'warning');
        return;
      }

      // 2. Pega configurações
      const settings = await getSettings();

      // 3. Detecta campos
      const fields = FieldMatcher.detectFields();
      if (fields.length === 0) {
        showToast('Nenhum campo reconhecido nesta página.', 'info');
        return;
      }

      // 4. Preview se configurado
      if (settings.confirmBeforeFill) {
        const confirmed = await showFillPreview(fields, profile.data);
        if (!confirmed) return;
      }

      // 5. Preenche
      let filledCount = 0;
      for (const field of fields) {
        const key = field.bestMatch.key;
        const value = profile.data[key];
        
        if (value !== undefined && value !== null && value !== '') {
          // Delay entre campos pra evitar detecção anti-bot
          if (settings.fillDelay > 0) {
            await sleep(settings.fillDelay);
          }
          const success = FieldMatcher.fillField(field.element, value);
          if (success) filledCount++;
        }
      }

      // 6. Registra no histórico
      await recordApplication(filledCount, fields.length);

      showToast(
        `✅ ${filledCount} de ${fields.length} campos preenchidos com "${profile.label}"`,
        filledCount > 0 ? 'success' : 'info'
      );

    } catch (error) {
      console.error('[PreenchimentoRapido] Erro:', error);
      showToast('Erro ao preencher. Veja o console (F12).', 'error');
    } finally {
      isFilling = false;
    }
  }

  // ─── PERFIL E CONFIG (bridge) ───────────────────────────────────
  function getActiveProfile() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['profiles', 'activeProfileId'], (result) => {
        const profiles = result.profiles || [];
        const activeId = result.activeProfileId;
        const profile = profiles.find(p => p.id === activeId) || profiles[0] || null;
        resolve(profile);
      });
    });
  }

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('settings', (result) => {
        const defaults = {
          autoFill: false,
          showFloatingButton: true,
          fillDelay: 50,
          confirmBeforeFill: true
        };
        resolve({ ...defaults, ...(result.settings || {}) });
      });
    });
  }

  // ─── HISTÓRICO ──────────────────────────────────────────────────
  async function recordApplication(filled, total) {
    try {
      const profile = await getActiveProfile();
      await chrome.storage.local.get('applications', (result) => {
        const apps = result.applications || [];
        apps.unshift({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          url: window.location.href,
          title: document.title,
          profileLabel: profile ? profile.label : 'Desconhecido',
          filled,
          total,
          date: new Date().toISOString()
        });
        if (apps.length > 200) apps.length = 200;
        chrome.storage.local.set({ applications: apps });
      });
    } catch (e) {
      // Silencioso — histórico não é crítico
    }
  }

  // ─── TOAST / NOTIFICAÇÃO IN-PAGE ────────────────────────────────
  function showToast(message, type = 'info') {
    const existing = document.getElementById('preenchimento-rapido-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'preenchimento-rapido-toast';

    const colors = {
      success: '#34a853',
      warning: '#fbbc04',
      error: '#ea4335',
      info: '#4285f4'
    };

    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '84px',
      right: '24px',
      backgroundColor: colors[type] || colors.info,
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      zIndex: '2147483647',
      maxWidth: '360px',
      opacity: '0',
      transform: 'translateY(10px)',
      transition: 'all 0.3s ease',
      pointerEvents: 'none'
    });

    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // ─── PREVIEW MODAL ──────────────────────────────────────────────
  function showFillPreview(fields, data) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.id = 'preenchimento-rapido-preview';

      const matched = fields.filter(f => {
        const val = data[f.bestMatch.key];
        return val !== undefined && val !== null && val !== '';
      });
      const unmatched = fields.filter(f => {
        const val = data[f.bestMatch.key];
        return val === undefined || val === null || val === '';
      });

      overlay.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:24px;max-width:480px;width:90%;
                    max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.25);
                    font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;">
          <h3 style="margin:0 0 16px;font-size:18px;font-weight:600;">
            🔍 Prévia do Preenchimento
          </h3>
          <p style="font-size:13px;color:#666;margin:0 0 16px;">
            ${matched.length} campos serão preenchidos · ${unmatched.length} campos sem dado correspondente
          </p>
          ${matched.length > 0 ? `
            <div style="margin-bottom:16px;">
              <p style="font-weight:600;font-size:13px;color:#34a853;margin:0 0 8px;">✅ Serão preenchidos:</p>
              ${matched.map(f => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;">
                  <span style="color:#333;">${f.bestMatch.label}</span>
                  <span style="color:#666;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${String(data[f.bestMatch.key]).slice(0, 40)}
                  </span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${unmatched.length > 0 ? `
            <details style="margin-bottom:16px;">
              <summary style="cursor:pointer;font-size:13px;color:#ea4335;font-weight:500;">
                ⚠️ ${unmatched.length} campos sem dado
              </summary>
              <div style="margin-top:8px;">
                ${unmatched.map(f => `
                  <div style="padding:4px 0;font-size:12px;color:#888;">
                    • ${f.bestMatch.label}
                  </div>
                `).join('')}
              </div>
            </details>
          ` : ''}
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button id="pr-cancel" style="padding:8px 20px;border:1px solid #ddd;border-radius:6px;
                    background:#fff;cursor:pointer;font-size:14px;color:#555;">
              Cancelar
            </button>
            <button id="pr-confirm" style="padding:8px 20px;border:none;border-radius:6px;
                    background:#4285f4;color:#fff;cursor:pointer;font-size:14px;font-weight:500;">
              Preencher ${matched.length} campos
            </button>
          </div>
        </div>
      `;

      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '2147483647',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      });

      document.body.appendChild(overlay);

      overlay.querySelector('#pr-confirm').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });
      overlay.querySelector('#pr-cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      });
    });
  }

  // ─── UTILITIES ──────────────────────────────────────────────────
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ─── START ──────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
