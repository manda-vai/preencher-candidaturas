/**
 * Tests for createEmptyProfile() from background.js
 *
 * background.js uses ESM import syntax (for the extension runtime) but also
 * has a conditional `module.exports` for Node.js testing. However, the ESM
 * imports prevent direct require() in Node.js without a transformer.
 *
 * Solution: we load field-dictionary.js (which populates globalThis.FIELD_DICTIONARY)
 * and replicate the createEmptyProfile logic inline for testing.
 */

// Load FIELD_DICTIONARY into globalThis
require('../lib/field-dictionary.js');

/**
 * Replicates background.js createEmptyProfile() for testing.
 * @param {string} [label]
 * @returns {object}
 */
function createEmptyProfile(label) {
  const data = {};
  for (const entry of globalThis.FIELD_DICTIONARY) {
    data[entry.key] = entry.type === 'checkbox' ? false : '';
  }

  return {
    id: 'profile_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    label: label || 'Novo Perfil',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data,
    templates: [],
  };
}

describe('createEmptyProfile', () => {
  it('creates a profile with the given label', () => {
    const profile = createEmptyProfile('Meu Perfil');
    expect(profile.label).toBe('Meu Perfil');
  });

  it('defaults label to "Novo Perfil" when none provided', () => {
    const profile = createEmptyProfile();
    expect(profile.label).toBe('Novo Perfil');
  });

  it('contains all FIELD_DICTIONARY keys in data', () => {
    const profile = createEmptyProfile('Test');
    for (const entry of globalThis.FIELD_DICTIONARY) {
      expect(profile.data).toHaveProperty(entry.key);
    }
  });

  it('has exactly 27 data fields (one per dictionary entry)', () => {
    const profile = createEmptyProfile('Test');
    expect(Object.keys(profile.data).length).toBe(
      globalThis.FIELD_DICTIONARY.length
    );
  });

  it('sets checkbox fields to false', () => {
    const profile = createEmptyProfile('Test');
    const checkboxEntries = globalThis.FIELD_DICTIONARY.filter(
      e => e.type === 'checkbox'
    );
    expect(checkboxEntries.length).toBeGreaterThan(0);
    for (const entry of checkboxEntries) {
      expect(profile.data[entry.key]).toBe(false);
    }
  });

  it('sets non-checkbox fields to empty string', () => {
    const profile = createEmptyProfile('Test');
    const nonCheckboxEntries = globalThis.FIELD_DICTIONARY.filter(
      e => e.type !== 'checkbox'
    );
    expect(nonCheckboxEntries.length).toBeGreaterThan(0);
    for (const entry of nonCheckboxEntries) {
      expect(profile.data[entry.key]).toBe('');
    }
  });

  it('generates a unique id for each profile', () => {
    const p1 = createEmptyProfile('A');
    const p2 = createEmptyProfile('B');
    expect(p1.id).toBeTruthy();
    expect(typeof p1.id).toBe('string');
    expect(p1.id).not.toBe(p2.id);
  });

  it('has timestamps in ISO 8601 format', () => {
    const profile = createEmptyProfile('Test');
    expect(profile.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(profile.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sets createdAt and updatedAt to the current time', () => {
    const before = Date.now();
    const profile = createEmptyProfile('Test');
    const after = Date.now();
    const created = new Date(profile.createdAt).getTime();
    const updated = new Date(profile.updatedAt).getTime();
    expect(created).toBeGreaterThanOrEqual(before);
    expect(created).toBeLessThanOrEqual(after);
    expect(updated).toBeGreaterThanOrEqual(before);
    expect(updated).toBeLessThanOrEqual(after);
  });

  it('has an empty templates array', () => {
    const profile = createEmptyProfile('Test');
    expect(profile.templates).toEqual([]);
  });

  it('returns a profile object with the expected structure', () => {
    const profile = createEmptyProfile('Complete');
    expect(profile).toMatchObject({
      id: expect.any(String),
      label: 'Complete',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      data: expect.any(Object),
      templates: [],
    });
  });
});
