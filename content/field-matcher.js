/**
 * field-matcher.js
 * 
 * Motor de detecção inteligente de campos em formulários HTML.
 * 
 * Analisa múltiplos sinais de cada elemento (name, id, placeholder,
 * aria-label, label associado, classe CSS, data attributes, parent text)
 * e encontra o melhor match no FIELD_DICTIONARY usando sistema de score.
 */

const FieldMatcher = (() => {
  'use strict';

  // ─── UTILITIES ──────────────────────────────────────────────────
  /** Normaliza texto: lowercase, remove acentos, trim, collapses spaces */
  function normalize(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s]/g, ' ')    // remove pontuação
      .replace(/\s+/g, ' ')            // colapsa espaços
      .trim();
  }

  /** Tokeniza em palavras únicas significativas */
  function tokenize(text) {
    return normalize(text).split(/\s+/).filter(t => t.length > 1);
  }

  /** Obtém o label textual associado a um elemento */
  function getLabelText(el) {
    // 1. aria-labelledby
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const labelEl = document.getElementById(labelledby);
      if (labelEl) return labelEl.textContent;
    }

    // 2. aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // 3. <label for="...">
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label) return label.textContent;
    }

    // 4. Parent label (element inside <label>)
    let parent = el.parentElement;
    while (parent) {
      if (parent.tagName === 'LABEL') return parent.textContent;
      parent = parent.parentElement;
    }

    // 5. Wrapped label: div/fieldset with label/legend inside
    parent = el.closest('fieldset');
    if (parent) {
      const legend = parent.querySelector('legend');
      if (legend) return legend.textContent;
    }

    // 6. Previous sibling label-like element
    let prev = el.previousElementSibling;
    if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'DIV')) {
      return prev.textContent;
    }

    // 7. Container div's label child
    parent = el.closest('div, .field, .form-group, .input-group, [class*="field"], [class*="input"]');
    if (parent) {
      const labelChild = parent.querySelector('label, .label, [class*="label"]');
      if (labelChild) return labelChild.textContent;
    }

    return '';
  }

  /** Obtém todos os sinais de um elemento */
  function getSignals(el) {
    const signals = new Set();

    // Atributos diretos
    const attrs = ['name', 'id', 'placeholder', 'aria-label', 'title', 'data-field', 'data-name', 'data-label'];
    for (const attr of attrs) {
      const val = el.getAttribute(attr);
      if (val) {
        // Para name/id, usar o valor direto e também separar por hífen/underscore/camelCase
        signals.add(val);
        val.split(/[-_]/).forEach(s => signals.add(s));
      }
    }

    // Tipo do input
    const inputType = el.getAttribute('type');
    if (inputType) signals.add(inputType);

    // Classes CSS
    el.classList.forEach(cls => {
      signals.add(cls);
      // classes compostas como "input-email" → "email"
      cls.split(/[-_]/).forEach(s => signals.add(s));
    });

    // Label textual
    const labelText = getLabelText(el);
    if (labelText) {
      signals.add(labelText);
      // Placeholder text é útil
    }

    // Data attributes genéricos
    for (const attr of el.getAttributeNames() || []) {
      if (attr.startsWith('data-')) {
        const val = el.getAttribute(attr);
        if (val) signals.add(val);
      }
    }

    // Parent container hints
    let container = el.closest('[class*="form"], [class*="field"], [id*="field"]');
    if (container) {
      const text = container.textContent.trim().slice(0, 100);
      if (text) signals.add(text);
    }

    return [...signals].map(s => normalize(s)).filter(Boolean);
  }

  // ─── CACHE DE PADRÕES (compilados uma vez) ─────────────────────
  let patternCache = null;

  function buildPatternCache() {
    if (patternCache) return patternCache;
    
    patternCache = FIELD_DICTIONARY.map(entry => {
      const tokens = new Set(
        entry.patterns.flatMap(p => tokenize(p))
      );
      // Adiciona a key como token de bônus
      tokenize(entry.key).forEach(t => tokens.add(t));
      return {
        ...entry,
        tokenSet: tokens
      };
    });
    return patternCache;
  }

  // ─── SCORING ─────────────────────────────────────────────────────
  function scoreElement(el) {
    const cache = buildPatternCache();
    const signals = getSignals(el);
    const tokens = new Set(signals.flatMap(s => tokenize(s)));

    const results = [];

    for (const entry of cache) {
      let score = 0;
      const matchedPatterns = [];

      for (const signal of signals) {
        // Match exato de padrão (original)
        for (const pattern of entry.patterns) {
          const normPattern = normalize(pattern);
          if (signal === normPattern) {
            score += 20;
            matchedPatterns.push(pattern);
            break;
          }
          if (signal.includes(normPattern) || normPattern.includes(signal)) {
            if (signal.length > 2 && normPattern.length > 2) {
              score += 10;
              matchedPatterns.push(pattern);
              break;
            }
          }
        }
      }

      // Token overlap
      if (tokens.size > 0 && entry.tokenSet.size > 0) {
        let overlap = 0;
        for (const token of tokens) {
          if (entry.tokenSet.has(token)) overlap++;
        }
        if (overlap > 0) {
          score += overlap * 8;
        }
      }

      // Type bonus: se o type do input corresponde ao tipo esperado
      const elType = (el.getAttribute('type') || 'text').toLowerCase();
      if (entry.type === 'email' && elType === 'email') score += 15;
      if (entry.type === 'tel' && (elType === 'tel' || elType === 'phone')) score += 15;
      if (entry.type === 'url' && elType === 'url') score += 15;
      if (entry.type === 'number' && elType === 'number') score += 10;
      if (entry.type === 'file' && elType === 'file') score += 30;
      if (entry.type === 'textarea' && el.tagName === 'TEXTAREA') score += 15;
      if (entry.type === 'checkbox' && elType === 'checkbox') score += 15;
      if (entry.type === 'date' && (elType === 'date' || elType === 'datetime-local')) score += 15;

      // Select detection
      if (entry.type === 'select' && el.tagName === 'SELECT') score += 10;

      // Required bonus
      if (el.required) score += 3;
      if (el.getAttribute('aria-required') === 'true') score += 3;

      if (score > 0) {
        results.push({
          key: entry.key,
          label: entry.label,
          score: score,
          matchedPatterns: matchedPatterns.slice(0, 3),
          priority: entry.priority,
          type: entry.type,
          weight: score + entry.priority * 2
        });
      }
    }

    // Ordena por weight descendente
    results.sort((a, b) => b.weight - a.weight);
    return results;
  }

  // ─── DETECTA TODOS OS CAMPOS DO FORMULÁRIO ──────────────────────
  function detectFields(container = document) {
    const elements = container.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), ' +
      'textarea, ' +
      'select'
    );

    const detected = [];

    for (const el of elements) {
      // Pula elementos invisíveis
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (el.offsetParent === null && el.tagName !== 'SELECT') continue;

      const scores = scoreElement(el);
      if (scores.length > 0) {
        detected.push({
          element: el,
          bestMatch: scores[0],
          allMatches: scores.slice(0, 3)
        });
      }
    }

    return detected;
  }

  // ─── PREENCHE UM CAMPO ──────────────────────────────────────────
  function fillField(element, value) {
    if (!element || value === undefined || value === null) return false;

    const tagName = element.tagName;
    const type = (element.getAttribute('type') || 'text').toLowerCase();

    try {
      if (tagName === 'SELECT') {
        return fillSelect(element, value);
      } else if (type === 'checkbox') {
        return fillCheckbox(element, value);
      } else if (type === 'radio') {
        return fillRadio(element, value);
      } else if (type === 'file') {
        return false; // File inputs cannot be auto-filled programmatically
      } else {
        var result = fillTextField(element, value);
        // Tratamento especial para intl-tel-input
        if (type === 'tel' || type === 'phone') {
          handleIntlTelInput(element, value);
        }
        return result;
      }
    } catch (e) {
      console.warn('[PreenchimentoRapido] Erro ao preencher campo:', element, e);
      return false;
    }
  }

  function fillTextField(element, value) {
    // Para react/vue/angular, disparar eventos apropriados
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    );
    const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    );

    if (nativeSetter && nativeSetter.set) {
      nativeSetter.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));

    // React 16+ precisa desse evento específico
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    
    return true;
  }

  // ─── INTL-TEL-INPUT (código internacional) ─────────────────────
  function handleIntlTelInput(element, value) {
    const container = element.closest('.iti');
    if (!container) return false;

    // Tenta acessar a instância do plugin intl-tel-input
    // O plugin armazena a instância em _it, _intlTelInput, ou via jQuery.data
    let iti = element._it || element._intlTelInput;
    if (!iti && typeof jQuery !== 'undefined') {
      try { iti = jQuery.data(element, 'intl-tel-input'); } catch (e) {}
    }

    // Se encontrou a instância, usa setNumber que já atualiza
    // o dropdown, bandeira e código do país automaticamente
    if (iti && typeof iti.setNumber === 'function') {
      iti.setNumber(value);
      return true;
    }

    // Fallback: força a biblioteca a re-parsear o valor
    element.dispatchEvent(new KeyboardEvent('keyup', {
      bubbles: true,
      key: 'Backspace',
      keyCode: 8
    }));
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: value.slice(-1)
    }));

    return false;
  }

  function fillSelect(element, value) {
    const valueStr = String(value).toLowerCase().trim();
    const options = Array.from(element.options);

    // Tenta match exato do value
    for (const opt of options) {
      if (String(opt.value).toLowerCase().trim() === valueStr) {
        element.value = opt.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }

    // Tenta match do texto
    for (const opt of options) {
      if (opt.text.toLowerCase().trim() === valueStr ||
          opt.text.toLowerCase().includes(valueStr)) {
        element.value = opt.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }

    // Tenta com termos parciais (ex: "sim" para "Sim, possuo")
    for (const opt of options) {
      if (valueStr.includes(opt.text.toLowerCase().trim().slice(0, 3)) ||
          opt.text.toLowerCase().includes(valueStr.slice(0, 3))) {
        element.value = opt.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }

    return false;
  }

  function fillCheckbox(element, value) {
    const shouldCheck = value === true || value === 'sim' || value === 'yes' || 
                        value === 'true' || value === '1' || value === 1;
    if (shouldCheck && !element.checked) {
      element.checked = true;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } else if (!shouldCheck && element.checked) {
      element.checked = false;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  function fillRadio(element, value) {
    // Para radio, encontrar o grupo e selecionar a opção correta
    const name = element.getAttribute('name');
    if (!name) return false;
    
    const radios = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`);
    const valueStr = String(value).toLowerCase().trim();
    
    for (const radio of radios) {
      const radioValue = (radio.value || '').toLowerCase().trim();
      const label = getLabelText(radio).toLowerCase().trim();
      
      if (radioValue === valueStr || label.includes(valueStr) || valueStr.includes(label)) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    
    return false;
  }

  // ─── LISTA TODOS OS CAMPOS (para preview) ──────────────────────
  function getFieldsPreview() {
    const fields = detectFields();
    return fields.map(f => ({
      key: f.bestMatch.key,
      label: f.bestMatch.label,
      elementType: f.element.tagName,
      confidence: f.bestMatch.weight,
      currentValue: f.element.value || ''
    }));
  }

  // ─── API PÚBLICA ─────────────────────────────────────────────────
  return {
    detectFields,
    fillField,
    getFieldsPreview,
    scoreElement
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FieldMatcher };
}
