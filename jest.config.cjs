/**
 * Jest configuration for testing Chrome Extension logic.
 *
 * - testEnvironment: 'node' — we test pure logic, not DOM
 * - setupFiles: loads chrome.* mocks before each test suite
 * - transform: {} — NO transformations; source files use IIFE + conditional
 *   module.exports which Node.js can load natively as CommonJS
 */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.js'],
  transform: {},
  testPathIgnorePatterns: ['./tests/setup.js'],
};
