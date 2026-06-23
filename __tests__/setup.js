/**
 * Global test setup — runs before each test file (before jest framework loads).
 *
 * Provides basic chrome.* stubs so modules that reference globalThis.chrome
 * don't throw ReferenceError. Individual test files override specific methods
 * with jest.fn() for finer control.
 *
 * NOTE: jest.fn() is NOT available in setupFiles, so we use plain functions here.
 */
globalThis.chrome = {
  storage: {
    local: {
      get: () => {},
      set: () => {},
    },
    sync: {
      get: () => {},
      set: () => {},
      remove: () => {},
    },
  },
  tabs: {
    query: () => {},
    sendMessage: () => {},
  },
  runtime: {
    onInstalled: { addListener: () => {} },
    onMessage: { addListener: () => {} },
  },
  commands: {
    onCommand: { addListener: () => {} },
  },
};
