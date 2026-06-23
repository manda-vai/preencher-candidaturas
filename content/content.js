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

    // Auto-fill: se configurado, preenche automaticamente ao carregar
    setTimeout(async () => {
      try {
        const settings = await STORAGE.getSettings();
        if (settings.autoFill) {
          // Pequeno delay extra pra garantir que o formulário carregou
          await sleep(800);
          await fillCurrentForm();
        }
      } catch (e) {
        // Silencioso — auto-fill é um extra, não crítico
      }
    }, 2500);

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

  async function setupFloatingButton() {
    if (floatingButton) return;
    if (!shouldShowButton()) return;

    // Verifica configuração: botão só aparece se showFloatingButton ativado
    try {
      const settings = await STORAGE.getSettings();
      if (!settings.showFloatingButton) return;
    } catch (e) {
      // Se STORAGE não estiver disponível, segue com padrão (mostrar)
      console.warn('[PreenchimentoRapido] STORAGE não disponível, mostrando botão.', e);
    }

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
      const profile = await STORAGE.getActiveProfile();
      if (!profile) {
        showToast('Nenhum perfil ativo. Configure no popup da extensão.', 'warning');
        return;
      }

      // 2. Pega configurações
      const settings = await STORAGE.getSettings();

      // 3. Detecta campos
      const fields = FieldMatcher.detectFields();
      if (fields.length === 0) {
        showToast('Nenhum campo reconhecido nesta página.', 'info');
        return;
      }

      // 4. Expande dados do perfil com fallbacks inteligentes
      const fillData = { ...profile.data };

      // Fallback: nome+sobrenome → nomeCompleto
      if (!fillData.nomeCompleto && fillData.nome && fillData.sobrenome) {
        fillData.nomeCompleto = `${fillData.nome} ${fillData.sobrenome}`.trim();
      }
      // Fallback: nomeCompleto → nome (primeiro nome)
      if (!fillData.nome && fillData.nomeCompleto) {
        const parts = fillData.nomeCompleto.trim().split(/\s+/);
        if (parts.length > 0) fillData.nome = parts[0];
      }
      // Fallback: nomeCompleto → sobrenome
      if (!fillData.sobrenome && fillData.nomeCompleto) {
        const parts = fillData.nomeCompleto.trim().split(/\s+/);
        if (parts.length > 1) fillData.sobrenome = parts.slice(1).join(' ');
      }

      // 5. Expande com templates para textareas sem dado
      expandWithTemplates(fillData, fields, profile.templates);

      // 6. Preview se configurado
      if (settings.confirmBeforeFill) {
        const confirmed = await showFillPreview(fields, fillData);
        if (!confirmed) return;
      }

      // 7. Preenche campos
      let filledCount = 0;
      for (const field of fields) {
        const key = field.bestMatch.key;
        const value = fillData[key];

        if (value !== undefined && value !== null && value !== '') {
          if (settings.fillDelay > 0) {
            await sleep(settings.fillDelay);
          }
          const success = FieldMatcher.fillField(field.element, value);
          if (success) filledCount++;
        }
      }

      // 7. Registra no histórico
      await recordApplication(filledCount, fields.length, profile);

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

  // ─── HISTÓRICO ──────────────────────────────────────────────────
  async function recordApplication(filled, total, profile) {
    try {
      await STORAGE.saveApplication({
        url: window.location.href,
        title: document.title,
        profileLabel: profile ? profile.label : 'Desconhecido',
        filled,
        total
      });
    } catch (e) {
      // Silencioso — histórico não é crítico
      console.warn('[PreenchimentoRapido] Erro ao salvar histórico:', e);
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

  // ─── TEMPLATES DE RESPOSTA ──────────────────────────────────────
  /** Renderiza variáveis {nome} {vaga} {empresa} no texto do template */
  function renderTemplateText(template, data) {
    let text = template.content || '';
    // Ordem das substituições: mais específicas primeiro
    const vars = {
      nomeCompleto: data.nomeCompleto || `${data.nome || ''} ${data.sobrenome || ''}`.trim(),
      nome: data.nome || '',
      sobrenome: data.sobrenome || '',
      email: data.email || '',
      telefone: data.telefone || '',
      vaga: '',
      empresa: ''
    };
    for (const [key, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${key}\\}`, 'gi'), value || '');
    }
    // Fallback para {vaga} e {empresa} — tenta extrair do título da página
    if (text.includes('{vaga}')) {
      const vaga = extractJobTitle() || '';
      text = text.replace(/\{vaga\}/gi, vaga);
    }
    if (text.includes('{empresa}')) {
      text = text.replace(/\{empresa\}/gi, '');
    }
    return text;
  }

  /** Tenta extrair título da vaga do DOM */
  function extractJobTitle() {
    const selectors = [
      'h1[class*="job"]', 'h1[class*="title"]', 'h1[class*="position"]',
      '[class*="job-title"]', '[class*="position-title"]', '[class*="vaga-title"]',
      'h2[class*="job"]', 'h2[class*="title"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim().slice(0, 120);
    }
    // Tenta pelo <title>
    const title = document.title;
    if (title && !title.includes(' - ') && title.length < 100) return title;
    return '';
  }

  /** Expande fillData com templates para campos textarea sem valor */
  function expandWithTemplates(fillData, fields, templates) {
    if (!templates || templates.length === 0) return;
    if (!fillData) return;

    // Encontra campos textarea no formulário que estão sem dado
    const textareaFields = fields.filter(f => {
      const key = f.bestMatch.key;
      const entry = FIELD_MAP[key];
      const val = fillData[key];
      return entry?.type === 'textarea' && (!val || val.trim() === '');
    });

    if (textareaFields.length === 0 || templates.length === 0) return;

    // Usa o primeiro template para preencher textareas vazios
    const template = templates[0];
    if (!template?.content) return;

    const rendered = renderTemplateText(template, fillData);
    if (!rendered) return;

    for (const tf of textareaFields) {
      fillData[tf.bestMatch.key] = rendered;
    }
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
