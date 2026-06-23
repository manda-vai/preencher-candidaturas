/**
 * field-dictionary.module.js
 * 
 * Wrapper ES module para lib/field-dictionary.js.
 * Carrega field-dictionary.js como módulo (define FIELD_DICTIONARY e FIELD_MAP
 * via globalThis) e re-exporta para uso em outros módulos (ex: background.js).
 * 
 * Uso:
 *   import { FIELD_DICTIONARY } from '../lib/field-dictionary.module.js';
 *   import { FIELD_DICTIONARY, FIELD_MAP } from '../lib/field-dictionary.module.js';
 */

// Side-effect: executa field-dictionary.js como módulo
import './field-dictionary.js';

// Re-exporta a partir do globalThis
export const FIELD_DICTIONARY = globalThis.FIELD_DICTIONARY;
export const FIELD_MAP = globalThis.FIELD_MAP;
