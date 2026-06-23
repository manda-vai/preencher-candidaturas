/**
 * storage.module.js
 * 
 * Wrapper ES module para lib/storage.js.
 * Carrega storage.js como módulo (a definição de STORAGE via IIFE + globalThis)
 * e re-exporta para uso em outros módulos (ex: background.js).
 * 
 * Uso:
 *   import { STORAGE } from '../lib/storage.module.js';
 */

// Side-effect: executa storage.js como módulo, definindo globalThis.STORAGE
import './storage.js';

// Re-exporta a partir do globalThis (definido por storage.js)
export const STORAGE = globalThis.STORAGE;
