/**
 * Tests for lib/field-dictionary.js
 *
 * field-dictionary.js uses an IIFE + conditional module.exports,
 * requiring no chrome mocks. Loaded via Node's native require().
 */
const { FIELD_DICTIONARY, FIELD_MAP } = require('../lib/field-dictionary.js');

describe('FIELD_DICTIONARY', () => {
  it('contains exactly 27 field entries', () => {
    expect(FIELD_DICTIONARY.length).toBe(27);
  });

  it('each entry has all required properties', () => {
    for (const entry of FIELD_DICTIONARY) {
      expect(entry).toHaveProperty('key');
      expect(entry).toHaveProperty('label');
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('priority');
      expect(entry).toHaveProperty('patterns');

      expect(typeof entry.key).toBe('string');
      expect(typeof entry.label).toBe('string');
      expect(typeof entry.type).toBe('string');
      expect(typeof entry.priority).toBe('number');
      expect(Array.isArray(entry.patterns)).toBe(true);
      expect(entry.patterns.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate keys', () => {
    const keys = FIELD_DICTIONARY.map(e => e.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('contains all expected profile fields', () => {
    const keys = FIELD_DICTIONARY.map(e => e.key);
    expect(keys).toEqual([
      // Personal data
      'nome', 'sobrenome', 'nomeCompleto', 'email', 'telefone',
      'cpf', 'dataNascimento', 'genero', 'raca', 'pcd',
      // Address
      'cep', 'endereco', 'cidade', 'estado', 'pais',
      // Social / Portfolio
      'linkedin', 'portfolio', 'github', 'twitter',
      // Job
      'pretensaoSalarial', 'disponibilidade',
      // Education
      'escolaridade', 'curso', 'instituicao',
      // Experience
      'resumoProfissional', 'comoSoube',
      // File
      'curriculo',
    ]);
  });

  it('the only checkbox field is pcd', () => {
    const checkboxFields = FIELD_DICTIONARY.filter(e => e.type === 'checkbox');
    expect(checkboxFields).toHaveLength(1);
    expect(checkboxFields[0].key).toBe('pcd');
  });
});

describe('FIELD_MAP', () => {
  it('maps every FIELD_DICTIONARY entry by key', () => {
    for (const entry of FIELD_DICTIONARY) {
      expect(FIELD_MAP[entry.key]).toBe(entry);
    }
  });

  it('has the same number of entries as FIELD_DICTIONARY', () => {
    expect(Object.keys(FIELD_MAP).length).toBe(FIELD_DICTIONARY.length);
  });

  it('returns undefined for unknown keys', () => {
    expect(FIELD_MAP.nonExistentKey).toBeUndefined();
    expect(FIELD_MAP['']).toBeUndefined();
  });

  it('all keys in FIELD_MAP correspond to a FIELD_DICTIONARY entry', () => {
    for (const key of Object.keys(FIELD_MAP)) {
      const match = FIELD_DICTIONARY.find(e => e.key === key);
      expect(match).toBeDefined();
      expect(FIELD_MAP[key]).toBe(match);
    }
  });
});
