import * as pty from '@homebridge/node-pty-prebuilt-multiarch';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import {
  generateInitScript,
  writeInitScript,
  cleanupInitScript,
  detectUserShell,
} from './lib/init-script.js';
import * as path from 'path';

/**
 * Get the path to the output file for a spawn session
 */
export function getSpawnOutputPath(sessionName: string): string {
  return path.join(os.tmpdir(), `247-spawn-${sessionName}.txt`);
}

/**
 * Read and cleanup spawn output file
 * Returns the content or undefined if file doesn't exist
 */
export function readAndCleanupSpawnOutput(sessionName: string): string | undefined {
  const outputPath = getSpawnOutputPath(sessionName);
  try {
    const content = fs.readFileSync(outputPath, 'utf-8');
    fs.unlinkSync(outputPath); // Cleanup
    return content;
  } catch {
    return undefined;
  }
}

const execAsync = promisify(exec);

export interface Terminal {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  onData(callback: (data: string) => void): void;
  onExit(callback: (info: { exitCode: number }) => void): void;
  kill(): void;
  detach(): void;
  captureHistory(lines?: number): Promise<string>;
  isExistingSession(): boolean;
  onReady(callback: () => void): void;
}

export interface CreateTerminalOptions {
  /** Custom environment variables to inject into the session */
  customEnvVars?: Record<string, string>;
  /** For spawned sessions - run this command directly instead of interactive shell */
  spawnCommand?: string;
}

export function createTerminal(
  cwd: string,
  sessionName: string,
  options: CreateTerminalOptions | Record<string, string> = {}
): Terminal {
  // Support both old signature (customEnvVars object) and new options object
  const { customEnvVars = {}, spawnCommand } =
    'customEnvVars' in options || 'spawnCommand' in options
      ? (options as CreateTerminalOptions)
      : { customEnvVars: options as Record<string, string>, spawnCommand: undefined };
  // Check if session already exists before spawning
  let existingSession = false;
  try {
    execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`);
    existingSession = true;
    console.log(`[Terminal] Session '${sessionName}' exists, will attach`);
  } catch {
    existingSession = false;
    console.log(`[Terminal] Session '${sessionName}' does not exist, will create`);
  }

  if (Object.keys(customEnvVars).length > 0) {
    console.log(
      `[Terminal] Custom env vars for injection: ${Object.keys(customEnvVars).join(', ')}`
    );
  }

  // Use tmux for session persistence
  // For existing sessions: use attach-session (more reliable)
  // For new sessions: use new-session with init script for clean setup
  let tmuxArgs: string[];
  let initScriptPath: string | null = null;

  // Detect test/CI environment for animation skipping
  const isTestEnv = !!(process.env.VITEST || process.env.CI || process.env.JEST_WORKER_ID);

  if (existingSession) {
    tmuxArgs = ['attach-session', '-t', sessionName];
  } else if (spawnCommand) {
    // Spawn mode: run command directly without init script (for claude -p)
    console.log(`[Terminal] Spawn mode: running command directly`);

    // Build environment variables for tmux -e flags
    const envFlags: string[] = [
      '-e',
      `CLAUDE_TMUX_SESSION=${sessionName}`,
      '-e',
      `TERM=xterm-256color`,
    ];

    // Add custom env vars
    for (const [key, value] of Object.entries(customEnvVars)) {
      if (value && value.trim() !== '') {
        envFlags.push('-e', `${key}=${value}`);
      }
    }

    // Wrap command with tee to capture output to file
    // Use PIPESTATUS to preserve the exit code from the actual command
    const outputPath = getSpawnOutputPath(sessionName);
    const wrappedCommand = `bash -c '${spawnCommand.replace(/'/g, "'\\''")} 2>&1 | tee "${outputPath}"; exit \${PIPESTATUS[0]}'`;

    // Run command with output capture - file will be read in onExit handler
    tmuxArgs = ['new-session', '-s', sessionName, '-c', cwd, ...envFlags, wrappedCommand];
  } else {
    // Extract project name from cwd (last directory component)
    const projectName = path.basename(cwd) || 'unknown';

    // Detect user's preferred shell for the interactive session
    const userShell = detectUserShell();

    // Generate and write init script for new sessions
    // The init script is always sourced by bash (via --init-file)
    // So we generate it for bash, and it ends with `exec ${userShell} -i`
    // to switch to the user's preferred interactive shell
    const scriptContent = generateInitScript({
      sessionName,
      projectName,
      customEnvVars,
      shell: 'bash', // Always bash since bash sources the init-file
      targetShell: userShell, // User's preferred shell for interactive session
    });
    initScriptPath = writeInitScript(sessionName, scriptContent);
    console.log(
      `[Terminal] Init script written to: ${initScriptPath} (target shell: ${userShell})`
    );

    // Spawn tmux with bash running the init script
    // The script sets up env vars, tmux config, then runs `exec ${userShell} -i`
    // Use -e to pass environment variable for animation skipping in tests
    tmuxArgs = [
      'new-session',
      '-s',
      sessionName,
      '-c',
      cwd,
      ...(isTestEnv ? ['-e', '_247_SKIP_ANIMATION=1'] : []),
      `bash --init-file ${initScriptPath}`,
    ];
  }

  console.log(`[Terminal] Spawning: tmux ${tmuxArgs.join(' ')}`);

  const shell = pty.spawn('tmux', tmuxArgs, {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      CLAUDE_TMUX_SESSION: sessionName, // Also set at PTY level for hook detection
      PATH: `/opt/homebrew/bin:${process.env.PATH}`,
      // Ensure UTF-8 encoding for proper accent/unicode support
      LANG: process.env.LANG || 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
      // Suppress macOS bash deprecation warning
      BASH_SILENCE_DEPRECATION_WARNING: '1',
      // Pass CI/test detection to init script for animation skipping
      ...(isTestEnv ? { _247_SKIP_ANIMATION: '1' } : {}),
    } as { [key: string]: string },
  });

  // Debug: log any immediate output or errors
  let initialOutput = '';
  const debugHandler = (data: string) => {
    initialOutput += data;
    if (initialOutput.length < 500) {
      console.log(`[Terminal] Initial output: ${data.substring(0, 100)}`);
    }
  };
  shell.onData(debugHandler);

  // Remove debug handler after 2 seconds to prevent memory leak
  setTimeout(() => {
    (shell as any).removeListener('data', debugHandler);
  }, 2000);

  // Debug: log when shell exits
  shell.onExit(({ exitCode, signal }) => {
    console.log(
      `[Terminal] Shell exited: code=${exitCode}, signal=${signal}, session='${sessionName}'`
    );
  });

  // Track terminal readiness state for onReady callback
  // Existing sessions and spawn mode are ready immediately
  let isReady = existingSession || !!spawnCommand;
  const readyCallbacks: (() => void)[] = [];

  const fireReadyCallbacks = () => {
    console.log(
      `[Terminal] fireReadyCallbacks: firing ${readyCallbacks.length} callbacks for '${sessionName}'`
    );
    isReady = true;
    readyCallbacks.forEach((cb) => cb());
    readyCallbacks.length = 0; // Clear the array
  };

  // Handle session initialization and readiness
  if (spawnCommand) {
    // Spawn mode: command runs directly, ready immediately
    console.log(`[Terminal] Spawn session '${sessionName}' ready (direct command)`);
    // Enable mouse for tmux
    setTimeout(() => {
      exec(`tmux set-option -t "${sessionName}" mouse on`);
    }, 100);
  } else if (!existingSession) {
    // For new sessions, the init script handles env vars and tmux config
    // Fire ready callbacks once shell is likely initialized
    setTimeout(() => {
      console.log(`[Terminal] New session '${sessionName}' ready (init script executed)`);
      fireReadyCallbacks();
    }, 150);

    // Cleanup init script after shell has started (give it time to read the file)
    if (initScriptPath) {
      setTimeout(() => {
        cleanupInitScript(sessionName);
        console.log(`[Terminal] Init script cleaned up for '${sessionName}'`);
      }, 5000);
    }
  } else {
    // For existing sessions, just ensure mouse is enabled
    // isReady is already true for existing sessions (set above)
    setTimeout(() => {
      exec(`tmux set-option -t "${sessionName}" mouse on`);
    }, 100);
  }

  return {
    write: (data) => shell.write(data),
    resize: (cols, rows) => shell.resize(cols, rows),
    onData: (callback) => shell.onData(callback),
    onExit: (callback) => shell.onExit(callback),
    kill: () => shell.kill(),
    detach: () => {
      // Send tmux detach command (Ctrl+B, d)
      shell.write('\x02d');
    },
    isExistingSession: () => existingSession,
    onReady: (callback: () => void) => {
      if (isReady) {
        console.log(
          `[Terminal] onReady: already ready, calling callback immediately for '${sessionName}'`
        );
        callback();
      } else {
        console.log(`[Terminal] onReady: not ready yet, queuing callback for '${sessionName}'`);
        readyCallbacks.push(callback);
      }
    },
    captureHistory: async (lines = 10000): Promise<string> => {
      try {
        // Capture scrollback buffer from tmux
        // -p = print to stdout
        // -S -N = start from N lines back (negative = from start of history)
        // -J = preserve trailing spaces for proper formatting
        const { stdout } = await execAsync(
          `tmux capture-pane -t "${sessionName}" -p -S -${lines} -J 2>/dev/null`
        );
        return stdout;
      } catch {
        return '';
      }
    },
  };
}
