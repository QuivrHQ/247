/**
 * E2E Test Environment Helper
 *
 * Creates isolated test environments for running real CLI commands
 * without affecting the user's actual configuration or system services.
 */
import { mkdtempSync, rmSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir, platform } from 'os';
import { spawn, execSync } from 'child_process';
import { resolve } from 'path';

export interface TestEnvironment {
  /** Isolated home directory for this test */
  home: string;
  /** Path to the CLI entry point */
  cliEntry: string;
  /** Clean up the test environment */
  cleanup: () => void;
  /** Run CLI command and return output */
  runCli: (args: string[], options?: RunCliOptions) => Promise<CliResult>;
  /** Check if a file exists in the test home */
  fileExists: (relativePath: string) => boolean;
  /** Read a file from test home */
  readFile: (relativePath: string) => string;
  /** Read and parse a JSON file from test home */
  readJson: <T = unknown>(relativePath: string) => T;
}

export interface RunCliOptions {
  /** Input to send to stdin (for interactive prompts) */
  input?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Environment variables to merge */
  env?: Record<string, string>;
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Create an isolated test environment.
 * Each test gets its own temporary home directory.
 */
export function createTestEnvironment(): TestEnvironment {
  // Create temp directory for this test
  const home = mkdtempSync(join(tmpdir(), '247-e2e-'));

  // Create expected directory structure for the platform
  const os = platform();
  if (os === 'darwin') {
    mkdirSync(join(home, 'Library', 'LaunchAgents'), { recursive: true });
    mkdirSync(join(home, 'Library', 'Logs'), { recursive: true });
  } else {
    mkdirSync(join(home, '.config', 'systemd', 'user'), { recursive: true });
    mkdirSync(join(home, '.local', 'log'), { recursive: true });
  }

  // Path to CLI - relative to this test file
  // tests/e2e/helpers/test-env.ts -> packages/cli/dist/index.js
  const cliRoot = resolve(__dirname, '..', '..', '..');
  const cliEntry = join(cliRoot, 'dist', 'index.js');

  const cleanup = () => {
    try {
      rmSync(home, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  };

  const runCli = async (args: string[], options: RunCliOptions = {}): Promise<CliResult> => {
    return new Promise((resolve) => {
      const timeout = options.timeout ?? 30000;
      let stdout = '';
      let stderr = '';

      const child = spawn('node', [cliEntry, ...args], {
        cwd: home,
        env: {
          ...process.env,
          AGENT_247_HOME: home,
          // Disable color output for easier parsing
          FORCE_COLOR: '0',
          NO_COLOR: '1',
          // Merge additional env vars
          ...options.env,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Send input if provided (for interactive prompts)
      if (options.input) {
        child.stdin.write(options.input);
        child.stdin.end();
      }

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        resolve({ stdout, stderr, exitCode: -1 });
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({ stdout, stderr: stderr + err.message, exitCode: -1 });
      });
    });
  };

  const fileExists = (relativePath: string): boolean => {
    return existsSync(join(home, relativePath));
  };

  const readFile = (relativePath: string): string => {
    return readFileSync(join(home, relativePath), 'utf-8');
  };

  const readJson = <T = unknown>(relativePath: string): T => {
    return JSON.parse(readFile(relativePath)) as T;
  };

  return {
    home,
    cliEntry,
    cleanup,
    runCli,
    fileExists,
    readFile,
    readJson,
  };
}

/**
 * Check if tmux is available (required for E2E tests that start the agent)
 */
export function checkTmuxAvailable(): boolean {
  try {
    execSync('tmux -V', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check Node version meets requirements
 */
export function checkNodeVersion(): boolean {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  return major >= 22;
}

/**
 * Get a free port for testing
 */
export async function getFreePort(): Promise<number> {
  const net = await import('net');
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error('Failed to get port'));
      }
    });
  });
}
