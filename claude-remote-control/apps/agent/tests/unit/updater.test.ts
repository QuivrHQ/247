import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';

// Mock dependencies before importing
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    unref: vi.fn(),
    pid: 12345,
  })),
}));

vi.mock('../../src/logger.js', () => ({
  logger: {
    main: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

vi.mock('../../src/status.js', () => ({
  statusSubscribers: new Set(),
}));

describe('Updater Module', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Reset process.exit mock
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('isUpdateInProgress', () => {
    it('returns false initially', async () => {
      const { isUpdateInProgress } = await import('../../src/updater.js');
      expect(isUpdateInProgress()).toBe(false);
    });
  });

  describe('triggerUpdate', () => {
    it('creates update script with correct content', async () => {
      vi.useFakeTimers();
      const { writeFileSync } = await import('fs');
      const mockedWriteFileSync = vi.mocked(writeFileSync);

      const { triggerUpdate } = await import('../../src/updater.js');
      triggerUpdate('1.2.3');

      expect(mockedWriteFileSync).toHaveBeenCalledWith(
        '/tmp/247-update.sh',
        expect.stringContaining('npm install -g 247-cli@1.2.3'),
        { mode: 0o755 }
      );

      // Advance timer to trigger process.exit
      vi.advanceTimersByTime(1100);
    });

    it('includes hooks update in script', async () => {
      vi.useFakeTimers();
      const { writeFileSync } = await import('fs');
      const mockedWriteFileSync = vi.mocked(writeFileSync);

      const { triggerUpdate } = await import('../../src/updater.js');
      triggerUpdate('2.0.0');

      const scriptContent = mockedWriteFileSync.mock.calls[0][1] as string;
      expect(scriptContent).toContain('247 hooks update');

      vi.advanceTimersByTime(1100);
    });

    it('spawns detached process', async () => {
      vi.useFakeTimers();
      const { spawn } = await import('child_process');
      const mockedSpawn = vi.mocked(spawn);

      const { triggerUpdate } = await import('../../src/updater.js');
      triggerUpdate('1.0.0');

      expect(mockedSpawn).toHaveBeenCalledWith(
        'bash',
        ['/tmp/247-update.sh'],
        expect.objectContaining({
          detached: true,
          stdio: 'ignore',
        })
      );

      vi.advanceTimersByTime(1100);
    });

    it('sets PATH in spawn environment', async () => {
      vi.useFakeTimers();
      const { spawn } = await import('child_process');
      const mockedSpawn = vi.mocked(spawn);

      const { triggerUpdate } = await import('../../src/updater.js');
      triggerUpdate('1.0.0');

      const spawnOptions = mockedSpawn.mock.calls[0][2] as { env: Record<string, string> };
      expect(spawnOptions.env.PATH).toContain('/opt/homebrew/bin');
      expect(spawnOptions.env.PATH).toContain('/usr/local/bin');

      vi.advanceTimersByTime(1100);
    });

    it('exits process after delay', async () => {
      vi.useFakeTimers();
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      const { triggerUpdate } = await import('../../src/updater.js');
      triggerUpdate('1.0.0');

      expect(exitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1100);

      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('logs update trigger', async () => {
      vi.useFakeTimers();
      const { logger } = await import('../../src/logger.js');

      const { triggerUpdate } = await import('../../src/updater.js');
      triggerUpdate('3.0.0');

      expect(logger.main.info).toHaveBeenCalledWith(
        { targetVersion: '3.0.0' },
        'Auto-update triggered'
      );

      vi.advanceTimersByTime(1100);
    });
  });

  describe('broadcast to subscribers', () => {
    it('sends update-pending message to all subscribers', async () => {
      vi.useFakeTimers();

      // Get the mocked statusSubscribers
      const { statusSubscribers } = await import('../../src/status.js');

      // Create mock WebSocket
      const mockWs = {
        readyState: WebSocket.OPEN,
        send: vi.fn(),
      } as unknown as WebSocket;

      statusSubscribers.add(mockWs);

      const { triggerUpdate } = await import('../../src/updater.js');
      triggerUpdate('2.5.0');

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"update-pending"')
      );
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"targetVersion":"2.5.0"')
      );

      vi.advanceTimersByTime(1100);

      // Cleanup
      statusSubscribers.delete(mockWs);
    });

    it('skips closed WebSocket connections', async () => {
      vi.useFakeTimers();

      const { statusSubscribers } = await import('../../src/status.js');

      const closedWs = {
        readyState: WebSocket.CLOSED,
        send: vi.fn(),
      } as unknown as WebSocket;

      statusSubscribers.add(closedWs);

      const { triggerUpdate } = await import('../../src/updater.js');
      triggerUpdate('1.0.0');

      expect(closedWs.send).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1100);

      statusSubscribers.delete(closedWs);
    });
  });

  describe('platform-specific restart commands', () => {
    it('uses launchctl on darwin', async () => {
      vi.useFakeTimers();
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const { writeFileSync } = await import('fs');
      const mockedWriteFileSync = vi.mocked(writeFileSync);

      // Need to re-import to pick up new platform
      vi.resetModules();
      const { triggerUpdate } = await import('../../src/updater.js');
      triggerUpdate('1.0.0');

      const scriptContent = mockedWriteFileSync.mock.calls[0][1] as string;
      expect(scriptContent).toContain('launchctl kickstart');

      vi.advanceTimersByTime(1100);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('uses systemctl on linux', async () => {
      vi.useFakeTimers();
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const { writeFileSync } = await import('fs');
      const mockedWriteFileSync = vi.mocked(writeFileSync);

      vi.resetModules();
      const { triggerUpdate } = await import('../../src/updater.js');
      triggerUpdate('1.0.0');

      const scriptContent = mockedWriteFileSync.mock.calls[0][1] as string;
      expect(scriptContent).toContain('systemctl --user restart');

      vi.advanceTimersByTime(1100);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('error handling', () => {
    it('handles writeFileSync error', async () => {
      vi.useFakeTimers();
      const { writeFileSync } = await import('fs');
      const mockedWriteFileSync = vi.mocked(writeFileSync);
      mockedWriteFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const { logger } = await import('../../src/logger.js');

      vi.resetModules();
      const { triggerUpdate, isUpdateInProgress } = await import('../../src/updater.js');
      triggerUpdate('1.0.0');

      expect(logger.main.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Failed to write update script'
      );

      // Update should not be in progress after error
      expect(isUpdateInProgress()).toBe(false);
    });
  });
});
