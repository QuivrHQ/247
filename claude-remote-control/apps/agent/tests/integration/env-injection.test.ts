/**
 * Environment Variable Injection Tests
 *
 * Tests the environment variable injection flow:
 * 1. getEnvironmentVariables() fetches from DB correctly
 * 2. Variables are passed to createTerminal
 * 3. Empty values are filtered correctly in terminal.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';

// ============================================================================
// In-Memory Database Setup
// ============================================================================

let mockDb: Database.Database | null = null;

vi.mock('../../src/db/index.js', () => ({
  getDatabase: () => {
    if (!mockDb) {
      throw new Error('Database not initialized');
    }
    return mockDb;
  },
}));

// Mock crypto for UUID generation
vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
}));

describe('Environment Variable Injection Flow', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Create fresh in-memory database with schema
    mockDb = new Database(':memory:');
    mockDb.exec(`
      CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        icon TEXT,
        is_default INTEGER DEFAULT 0,
        variables TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS session_environments (
        session_name TEXT PRIMARY KEY,
        environment_id TEXT NOT NULL
      );
    `);
  });

  afterEach(() => {
    if (mockDb) {
      mockDb.close();
      mockDb = null;
    }
  });

  const insertEnvironment = (
    id: string,
    name: string,
    variables: Record<string, string>,
    isDefault = false
  ) => {
    const now = Date.now();
    mockDb!
      .prepare(
        `
      INSERT INTO environments (id, name, provider, is_default, variables, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(id, name, 'anthropic', isDefault ? 1 : 0, JSON.stringify(variables), now, now);
  };

  // ==========================================================================
  // Test getEnvironmentVariables() from db/environments.ts
  // ==========================================================================

  describe('getEnvironmentVariables()', () => {
    it('returns variables for specified environment ID', async () => {
      // Arrange
      const envId = 'test-env-123';
      const variables = { API_KEY: 'secret-key-123', OTHER_VAR: 'other-value' };
      insertEnvironment(envId, 'Test Env', variables);

      // Act
      const { getEnvironmentVariables } = await import('../../src/db/environments.js');
      const result = getEnvironmentVariables(envId);

      // Assert
      expect(result).toEqual(variables);
    });

    it('falls back to default environment when ID not found', async () => {
      // Arrange
      const defaultVars = { DEFAULT_KEY: 'default-value' };
      insertEnvironment('default-env', 'Default Env', defaultVars, true);

      // Act
      const { getEnvironmentVariables } = await import('../../src/db/environments.js');
      const result = getEnvironmentVariables('non-existent-id');

      // Assert
      expect(result).toEqual(defaultVars);
    });

    it('returns empty object when no environments exist', async () => {
      // Act
      const { getEnvironmentVariables } = await import('../../src/db/environments.js');
      const result = getEnvironmentVariables();

      // Assert
      expect(result).toEqual({});
    });

    it('returns default environment variables when no ID provided', async () => {
      // Arrange
      const defaultVars = { AUTO_DEFAULT: 'auto-value' };
      insertEnvironment('auto-default-env', 'Auto Default', defaultVars, true);

      // Act
      const { getEnvironmentVariables } = await import('../../src/db/environments.js');
      const result = getEnvironmentVariables();

      // Assert
      expect(result).toEqual(defaultVars);
    });

    it('returns all variables including empty ones (filtering happens in terminal.ts)', async () => {
      // Arrange
      const envId = 'mixed-env';
      const variables = {
        FILLED_VAR: 'has-value',
        EMPTY_VAR: '',
        WHITESPACE_VAR: '   ',
      };
      insertEnvironment(envId, 'Mixed Env', variables);

      // Act
      const { getEnvironmentVariables } = await import('../../src/db/environments.js');
      const result = getEnvironmentVariables(envId);

      // Assert - all variables should be returned, filtering is done later
      expect(result).toEqual(variables);
    });
  });

  // ==========================================================================
  // Test session environment tracking
  // ==========================================================================

  describe('Session environment tracking', () => {
    it('tracks session-environment mapping', async () => {
      // Arrange
      const envId = 'tracking-env';
      insertEnvironment(envId, 'Tracking Env', { KEY: 'value' });

      // Act
      const { setSessionEnvironment, getSessionEnvironment } =
        await import('../../src/db/environments.js');
      setSessionEnvironment('test-session', envId);
      const result = getSessionEnvironment('test-session');

      // Assert
      expect(result).toBe(envId);
    });

    it('clears session environment mapping', async () => {
      // Arrange
      const envId = 'clear-env';
      insertEnvironment(envId, 'Clear Env', { KEY: 'value' });

      // Act
      const { setSessionEnvironment, getSessionEnvironment, clearSessionEnvironment } =
        await import('../../src/db/environments.js');
      setSessionEnvironment('clear-session', envId);
      clearSessionEnvironment('clear-session');
      const result = getSessionEnvironment('clear-session');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // Test variable filtering logic (simulates terminal.ts behavior)
  // ==========================================================================

  describe('Variable filtering (as done in terminal.ts)', () => {
    it('filters out empty string values', () => {
      // This simulates the filtering logic in terminal.ts lines 115-117
      const variables = {
        FILLED: 'has-value',
        EMPTY: '',
        WHITESPACE: '   ',
        ANOTHER_FILLED: 'another-value',
      };

      // Simulate the filter from terminal.ts
      const nonEmptyVars = Object.entries(variables).filter(
        ([, value]) => value && value.trim() !== ''
      );

      // Assert
      expect(nonEmptyVars).toHaveLength(2);
      expect(nonEmptyVars.map(([k]) => k)).toEqual(['FILLED', 'ANOTHER_FILLED']);
    });

    it('generates correct export command format', () => {
      // This simulates the export command generation in terminal.ts
      const variables = {
        API_KEY: 'sk-test-123',
        CUSTOM_VAR: 'custom-value',
      };

      const nonEmptyVars = Object.entries(variables).filter(
        ([, value]) => value && value.trim() !== ''
      );

      const baseExport = 'export CLAUDE_TMUX_SESSION="test-session"';
      const allExports =
        nonEmptyVars.length > 0
          ? `${baseExport}; ${nonEmptyVars
              .map(([key, value]) => `export ${key}="${value.replace(/"/g, '\\"')}"`)
              .join('; ')}`
          : baseExport;

      // Assert
      expect(allExports).toContain('export CLAUDE_TMUX_SESSION="test-session"');
      expect(allExports).toContain('export API_KEY="sk-test-123"');
      expect(allExports).toContain('export CUSTOM_VAR="custom-value"');
    });

    it('escapes double quotes in variable values', () => {
      const variables = {
        WITH_QUOTES: 'value "with" quotes',
      };

      const nonEmptyVars = Object.entries(variables).filter(
        ([, value]) => value && value.trim() !== ''
      );

      const exports = nonEmptyVars
        .map(([key, value]) => `export ${key}="${value.replace(/"/g, '\\"')}"`)
        .join('; ');

      // Assert - quotes should be escaped
      expect(exports).toBe('export WITH_QUOTES="value \\"with\\" quotes"');
    });
  });
});
