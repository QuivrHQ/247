import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs before importing the module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

describe('Version Module', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('compareSemver', () => {
    it('returns positive when a > b (major)', async () => {
      const { compareSemver } = await import('../../src/version.js');
      expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0);
    });

    it('returns positive when a > b (minor)', async () => {
      const { compareSemver } = await import('../../src/version.js');
      expect(compareSemver('1.2.0', '1.1.0')).toBeGreaterThan(0);
    });

    it('returns positive when a > b (patch)', async () => {
      const { compareSemver } = await import('../../src/version.js');
      expect(compareSemver('1.0.2', '1.0.1')).toBeGreaterThan(0);
    });

    it('returns negative when a < b', async () => {
      const { compareSemver } = await import('../../src/version.js');
      expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(compareSemver('1.0.0', '1.1.0')).toBeLessThan(0);
      expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
    });

    it('returns 0 when versions are equal', async () => {
      const { compareSemver } = await import('../../src/version.js');
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('0.1.0', '0.1.0')).toBe(0);
    });

    it('handles v prefix', async () => {
      const { compareSemver } = await import('../../src/version.js');
      expect(compareSemver('v1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('1.0.0', 'v1.0.0')).toBe(0);
      expect(compareSemver('v2.0.0', 'v1.0.0')).toBeGreaterThan(0);
    });

    it('handles partial versions', async () => {
      const { compareSemver } = await import('../../src/version.js');
      // Missing parts are treated as 0
      expect(compareSemver('1.0', '1.0.0')).toBe(0);
      expect(compareSemver('1', '1.0.0')).toBe(0);
    });

    it('handles large version numbers', async () => {
      const { compareSemver } = await import('../../src/version.js');
      expect(compareSemver('10.20.30', '10.20.29')).toBeGreaterThan(0);
      expect(compareSemver('100.0.0', '99.99.99')).toBeGreaterThan(0);
    });

    it('handles version 0.0.0', async () => {
      const { compareSemver } = await import('../../src/version.js');
      expect(compareSemver('0.0.0', '0.0.1')).toBeLessThan(0);
      expect(compareSemver('0.0.1', '0.0.0')).toBeGreaterThan(0);
      expect(compareSemver('0.0.0', '0.0.0')).toBe(0);
    });

    it('handles non-numeric characters gracefully', async () => {
      const { compareSemver } = await import('../../src/version.js');
      // Non-numeric parts become 0 via parseInt fallback
      expect(compareSemver('1.0.0-beta', '1.0.0')).toBe(0); // -beta is stripped
      expect(compareSemver('1.0.0', '1.0.0-alpha')).toBe(0);
    });

    it('handles empty string versions', async () => {
      const { compareSemver } = await import('../../src/version.js');
      expect(compareSemver('', '')).toBe(0);
      expect(compareSemver('1.0.0', '')).toBeGreaterThan(0);
      expect(compareSemver('', '1.0.0')).toBeLessThan(0);
    });

    it('compares major version first', async () => {
      const { compareSemver } = await import('../../src/version.js');
      // Major version takes precedence
      expect(compareSemver('2.0.0', '1.99.99')).toBeGreaterThan(0);
      expect(compareSemver('1.99.99', '2.0.0')).toBeLessThan(0);
    });

    it('compares minor version second', async () => {
      const { compareSemver } = await import('../../src/version.js');
      // Minor version takes precedence over patch
      expect(compareSemver('1.2.0', '1.1.99')).toBeGreaterThan(0);
      expect(compareSemver('1.1.99', '1.2.0')).toBeLessThan(0);
    });
  });

  describe('needsUpdate', () => {
    it('returns true when web version is newer', async () => {
      const { needsUpdate } = await import('../../src/version.js');
      expect(needsUpdate('0.1.0', '0.2.0')).toBe(true);
      expect(needsUpdate('0.1.0', '1.0.0')).toBe(true);
      expect(needsUpdate('0.1.0', '0.1.1')).toBe(true);
    });

    it('returns false when versions are equal', async () => {
      const { needsUpdate } = await import('../../src/version.js');
      expect(needsUpdate('0.1.0', '0.1.0')).toBe(false);
    });

    it('returns false when agent version is newer (no downgrade)', async () => {
      const { needsUpdate } = await import('../../src/version.js');
      expect(needsUpdate('0.2.0', '0.1.0')).toBe(false);
      expect(needsUpdate('1.0.0', '0.9.0')).toBe(false);
    });

    it('handles major version bump', async () => {
      const { needsUpdate } = await import('../../src/version.js');
      expect(needsUpdate('0.9.9', '1.0.0')).toBe(true);
      expect(needsUpdate('1.9.9', '2.0.0')).toBe(true);
    });

    it('handles minor version bump', async () => {
      const { needsUpdate } = await import('../../src/version.js');
      expect(needsUpdate('1.0.9', '1.1.0')).toBe(true);
    });

    it('handles version 0.0.0', async () => {
      const { needsUpdate } = await import('../../src/version.js');
      expect(needsUpdate('0.0.0', '0.0.1')).toBe(true);
      expect(needsUpdate('0.0.0', '0.1.0')).toBe(true);
      expect(needsUpdate('0.0.0', '1.0.0')).toBe(true);
      expect(needsUpdate('0.0.0', '0.0.0')).toBe(false);
    });

    it('works with v prefix', async () => {
      const { needsUpdate } = await import('../../src/version.js');
      expect(needsUpdate('v0.1.0', 'v0.2.0')).toBe(true);
      expect(needsUpdate('0.1.0', 'v0.2.0')).toBe(true);
      expect(needsUpdate('v0.1.0', '0.2.0')).toBe(true);
    });

    it('handles large version differences', async () => {
      const { needsUpdate } = await import('../../src/version.js');
      expect(needsUpdate('0.1.0', '10.0.0')).toBe(true);
      expect(needsUpdate('10.0.0', '0.1.0')).toBe(false);
    });
  });

  describe('getAgentVersion', () => {
    it('returns version from package.json', async () => {
      const { readFileSync } = await import('fs');
      const mockedReadFileSync = vi.mocked(readFileSync);

      mockedReadFileSync.mockReturnValue(JSON.stringify({ version: '1.2.3' }));

      const { getAgentVersion } = await import('../../src/version.js');
      const version = getAgentVersion();

      expect(version).toBe('1.2.3');
    });

    it('returns 0.0.0 when package.json is not found', async () => {
      const { readFileSync } = await import('fs');
      const mockedReadFileSync = vi.mocked(readFileSync);

      mockedReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const { getAgentVersion } = await import('../../src/version.js');
      const version = getAgentVersion();

      expect(version).toBe('0.0.0');
    });

    it('caches the version on subsequent calls', async () => {
      const { readFileSync } = await import('fs');
      const mockedReadFileSync = vi.mocked(readFileSync);

      mockedReadFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));

      const { getAgentVersion } = await import('../../src/version.js');

      // First call reads from file
      const version1 = getAgentVersion();
      expect(version1).toBe('1.0.0');

      // Change mock return value
      mockedReadFileSync.mockReturnValue(JSON.stringify({ version: '2.0.0' }));

      // Second call should return cached value
      const version2 = getAgentVersion();
      expect(version2).toBe('1.0.0');

      // readFileSync should only be called once (cached)
      // Note: may be called multiple times due to path fallbacks, but result is cached
    });

    it('returns 0.0.0 when package.json has no version field', async () => {
      const { readFileSync } = await import('fs');
      const mockedReadFileSync = vi.mocked(readFileSync);

      mockedReadFileSync.mockReturnValue(JSON.stringify({ name: 'test-package' }));

      const { getAgentVersion } = await import('../../src/version.js');
      const version = getAgentVersion();

      expect(version).toBe('0.0.0');
    });

    it('returns 0.0.0 when package.json is invalid JSON', async () => {
      const { readFileSync } = await import('fs');
      const mockedReadFileSync = vi.mocked(readFileSync);

      mockedReadFileSync.mockReturnValue('not valid json');

      const { getAgentVersion } = await import('../../src/version.js');
      const version = getAgentVersion();

      expect(version).toBe('0.0.0');
    });

    it('tries multiple paths to find package.json', async () => {
      const { readFileSync } = await import('fs');
      const mockedReadFileSync = vi.mocked(readFileSync);

      // First path fails, second succeeds
      let callCount = 0;
      mockedReadFileSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('ENOENT');
        }
        return JSON.stringify({ version: '2.0.0' });
      });

      const { getAgentVersion } = await import('../../src/version.js');
      const version = getAgentVersion();

      expect(version).toBe('2.0.0');
      expect(callCount).toBeGreaterThan(1);
    });
  });
});
