/**
 * Tests for lib/storage.js
 *
 * storage.js uses an IIFE and references chrome.storage inside async functions.
 * We mock chrome.* at the top level (before requiring storage.js) so that
 * the module loads cleanly, then control mock implementations per test.
 */

// ── Chrome mocks (jest.fn available at top level) ─────────────────────
const mockLocalGet = jest.fn();
const mockLocalSet = jest.fn();
const mockSyncGet = jest.fn();
const mockSyncSet = jest.fn();
const mockSyncRemove = jest.fn();

globalThis.chrome = {
  storage: {
    local: { get: mockLocalGet, set: mockLocalSet },
    sync: { get: mockSyncGet, set: mockSyncSet, remove: mockSyncRemove },
  },
  tabs: { query: jest.fn(), sendMessage: jest.fn() },
  runtime: {
    onInstalled: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
  },
  commands: { onCommand: { addListener: jest.fn() } },
};

// Load storage.js AFTER setting up chrome mocks
const { STORAGE } = require('../lib/storage.js');

// ── Tests ──────────────────────────────────────────────────────────────
describe('STORAGE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getProfiles ─────────────────────────────────────────────────────
  describe('getProfiles', () => {
    it('returns profiles array from chrome.storage.local', async () => {
      const profiles = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
      mockLocalGet.mockResolvedValue({ profiles });

      const result = await STORAGE.getProfiles();

      expect(result).toEqual(profiles);
      expect(mockLocalGet).toHaveBeenCalledTimes(1);
      expect(mockLocalGet).toHaveBeenCalledWith('profiles');
    });

    it('returns empty array when no profiles key exists', async () => {
      mockLocalGet.mockResolvedValue({});

      const result = await STORAGE.getProfiles();
      expect(result).toEqual([]);
    });

    it('returns empty array when profiles is null', async () => {
      mockLocalGet.mockResolvedValue({ profiles: null });

      const result = await STORAGE.getProfiles();
      expect(result).toEqual([]);
    });
  });

  // ── saveProfiles ────────────────────────────────────────────────────
  describe('saveProfiles', () => {
    it('saves profiles to chrome.storage.local', async () => {
      const profiles = [{ id: '1', name: 'Saved Profile' }];
      mockLocalSet.mockResolvedValue(undefined);

      await STORAGE.saveProfiles(profiles);

      expect(mockLocalSet).toHaveBeenCalledTimes(1);
      expect(mockLocalSet).toHaveBeenCalledWith({ profiles });
    });
  });

  // ── getActiveProfileId ──────────────────────────────────────────────
  describe('getActiveProfileId', () => {
    it('returns activeProfileId from chrome.storage.sync', async () => {
      mockSyncGet.mockResolvedValue({ activeProfileId: 'abc123' });

      const result = await STORAGE.getActiveProfileId();

      expect(result).toBe('abc123');
      expect(mockSyncGet).toHaveBeenCalledWith('activeProfileId');
    });

    it('returns null when no activeProfileId is set', async () => {
      mockSyncGet.mockResolvedValue({});

      const result = await STORAGE.getActiveProfileId();
      expect(result).toBeNull();
    });
  });

  // ── setActiveProfileId ──────────────────────────────────────────────
  describe('setActiveProfileId', () => {
    it('saves active profile id to chrome.storage.sync', async () => {
      mockSyncSet.mockResolvedValue(undefined);

      await STORAGE.setActiveProfileId('prof_xyz');

      expect(mockSyncSet).toHaveBeenCalledWith({ activeProfileId: 'prof_xyz' });
    });
  });

  // ── getActiveProfile ────────────────────────────────────────────────
  describe('getActiveProfile', () => {
    it('returns the profile whose id matches activeProfileId', async () => {
      const profiles = [
        { id: 'prof_a', name: 'Alice' },
        { id: 'prof_b', name: 'Bob' },
      ];
      mockLocalGet.mockResolvedValue({ profiles });
      mockSyncGet.mockResolvedValue({ activeProfileId: 'prof_b' });

      const result = await STORAGE.getActiveProfile();

      expect(result).toEqual({ id: 'prof_b', name: 'Bob' });
    });

    it('returns the first profile when no active id is set', async () => {
      const profiles = [
        { id: 'prof_a', name: 'Alice' },
        { id: 'prof_b', name: 'Bob' },
      ];
      mockLocalGet.mockResolvedValue({ profiles });
      mockSyncGet.mockResolvedValue({}); // no active profile set

      const result = await STORAGE.getActiveProfile();
      expect(result).toEqual({ id: 'prof_a', name: 'Alice' });
    });

    it('returns null when there are no profiles', async () => {
      mockLocalGet.mockResolvedValue({});
      mockSyncGet.mockResolvedValue({});

      const result = await STORAGE.getActiveProfile();
      expect(result).toBeNull();
    });

    it('returns null when profiles array is empty', async () => {
      mockLocalGet.mockResolvedValue({ profiles: [] });
      mockSyncGet.mockResolvedValue({ activeProfileId: 'nonexistent' });

      const result = await STORAGE.getActiveProfile();
      expect(result).toBeNull();
    });

    it('falls back to first profile when activeProfileId matches none', async () => {
      const profiles = [{ id: 'prof_a', name: 'Alice' }];
      mockLocalGet.mockResolvedValue({ profiles });
      mockSyncGet.mockResolvedValue({ activeProfileId: 'prof_z' });

      const result = await STORAGE.getActiveProfile();
      expect(result).toEqual({ id: 'prof_a', name: 'Alice' });
    });

    it('calls both local.get and sync.get exactly once each', async () => {
      mockLocalGet.mockResolvedValue({ profiles: [{ id: 'p1' }] });
      mockSyncGet.mockResolvedValue({ activeProfileId: 'p1' });

      await STORAGE.getActiveProfile();

      expect(mockLocalGet).toHaveBeenCalledTimes(1);
      expect(mockSyncGet).toHaveBeenCalledTimes(1);
      expect(mockLocalGet).toHaveBeenCalledWith('profiles');
      expect(mockSyncGet).toHaveBeenCalledWith('activeProfileId');
    });
  });

  // ─── saveProfile ────────────────────────────────────────────────────
  describe('saveProfile', () => {
    it('updates an existing profile (matching id)', async () => {
      const existing = [
        { id: 'p1', name: 'Old Name' },
        { id: 'p2', name: 'Other' },
      ];
      mockLocalGet.mockResolvedValue({ profiles: existing });
      mockLocalSet.mockResolvedValue(undefined);

      const updated = { id: 'p1', name: 'New Name' };
      const result = await STORAGE.saveProfile(updated);

      expect(result).toEqual(updated);
      expect(mockLocalSet).toHaveBeenCalledWith({
        profiles: [
          { id: 'p1', name: 'New Name' },
          { id: 'p2', name: 'Other' },
        ],
      });
    });

    it('appends a new profile when id does not exist', async () => {
      mockLocalGet.mockResolvedValue({ profiles: [{ id: 'p1', name: 'Existing' }] });
      mockLocalSet.mockResolvedValue(undefined);

      const newProfile = { id: 'p2', name: 'New Profile' };
      const result = await STORAGE.saveProfile(newProfile);

      expect(result).toEqual(newProfile);
      expect(mockLocalSet).toHaveBeenCalledWith({
        profiles: [
          { id: 'p1', name: 'Existing' },
          { id: 'p2', name: 'New Profile' },
        ],
      });
    });

    it('adds to empty profiles list', async () => {
      mockLocalGet.mockResolvedValue({});
      mockLocalSet.mockResolvedValue(undefined);

      const profile = { id: 'first', name: 'First' };
      const result = await STORAGE.saveProfile(profile);

      expect(result).toEqual(profile);
      expect(mockLocalSet).toHaveBeenCalledWith({
        profiles: [{ id: 'first', name: 'First' }],
      });
    });
  });

  // ─── deleteProfile ──────────────────────────────────────────────────
  describe('deleteProfile', () => {
    it('removes a profile and updates activeId if deleted was active', async () => {
      const profiles = [
        { id: 'p1', name: 'Alpha' },
        { id: 'p2', name: 'Beta' },
      ];
      mockLocalGet.mockResolvedValue({ profiles });
      mockLocalSet.mockResolvedValue(undefined);
      mockSyncGet.mockResolvedValue({ activeProfileId: 'p1' });
      mockSyncSet.mockResolvedValue(undefined);

      await STORAGE.deleteProfile('p1');

      expect(mockLocalSet).toHaveBeenCalledWith({
        profiles: [{ id: 'p2', name: 'Beta' }],
      });
      // active profile changed to first remaining
      expect(mockSyncSet).toHaveBeenCalledWith({ activeProfileId: 'p2' });
    });

    it('sets activeProfileId to null when last profile deleted', async () => {
      mockLocalGet.mockResolvedValue({ profiles: [{ id: 'p1', name: 'Solo' }] });
      mockLocalSet.mockResolvedValue(undefined);
      mockSyncGet.mockResolvedValue({ activeProfileId: 'p1' });
      mockSyncSet.mockResolvedValue(undefined);

      await STORAGE.deleteProfile('p1');

      expect(mockLocalSet).toHaveBeenCalledWith({ profiles: [] });
      expect(mockSyncSet).toHaveBeenCalledWith({ activeProfileId: null });
    });
  });

  // ─── getSettings ────────────────────────────────────────────────────
  describe('getSettings', () => {
    it('returns settings from chrome.storage.sync', async () => {
      const settings = { autoFill: true, fillDelay: 100 };
      mockSyncGet.mockResolvedValue({ settings });

      const result = await STORAGE.getSettings();
      expect(result).toEqual(settings);
    });

    it('returns defaults when no settings saved', async () => {
      mockSyncGet.mockResolvedValue({});

      const result = await STORAGE.getSettings();
      expect(result).toEqual({
        autoFill: false,
        showFloatingButton: true,
        fillDelay: 50,
        confirmBeforeFill: true,
      });
    });
  });

  // ─── saveSettings ───────────────────────────────────────────────────
  describe('saveSettings', () => {
    it('saves settings to chrome.storage.sync', async () => {
      const settings = { autoFill: true, fillDelay: 200 };
      mockSyncSet.mockResolvedValue(undefined);

      await STORAGE.saveSettings(settings);

      expect(mockSyncSet).toHaveBeenCalledWith({ settings });
    });
  });
});
