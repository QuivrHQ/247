import * as pty from '@homebridge/node-pty-prebuilt-multiarch';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';

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
}

export function createTerminal(
  cwd: string,
  sessionName: string,
  customEnvVars: Record<string, string> = {}
): Terminal {
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
    console.log(`[Terminal] Custom env vars for injection: ${Object.keys(customEnvVars).join(', ')}`);
  }

  // Use tmux for session persistence
  // For existing sessions: use attach-session (more reliable)
  // For new sessions: use new-session with -A flag
  // Note: We DON'T use -e flags here because they pollute tmux's global environment
  const tmuxArgs = existingSession
    ? ['attach-session', '-t', sessionName]
    : ['new-session', '-A', '-s', sessionName, '-c', cwd];

  console.log(`[Terminal] Spawning: tmux ${tmuxArgs.join(' ')}`);

  const shell = pty.spawn('tmux', tmuxArgs, {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd,
    env: {
      ...process.env,
      // Note: customEnvVars are NOT included here to avoid polluting the pty environment
      // They will be injected per-session using tmux send-keys
      TERM: 'xterm-256color',
      CLAUDE_TMUX_SESSION: sessionName, // Always set for hook detection
      PATH: `/opt/homebrew/bin:${process.env.PATH}`,
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
    console.log(`[Terminal] Shell exited: code=${exitCode}, signal=${signal}, session='${sessionName}'`);
  });

  // Configure tmux options and inject environment variables
  if (!existingSession) {
    setTimeout(() => {
      exec(`tmux set-option -t "${sessionName}" history-limit 10000`);
      exec(`tmux set-option -t "${sessionName}" mouse on`);

      // ALWAYS inject CLAUDE_TMUX_SESSION into the shell for hook detection
      // This is critical for hooks to identify which session they belong to
      const baseExport = `export CLAUDE_TMUX_SESSION="${sessionName}"`;

      // Add custom environment variables if present
      const allExports = Object.keys(customEnvVars).length > 0
        ? `${baseExport}; ${Object.entries(customEnvVars)
            .map(([key, value]) => `export ${key}="${value.replace(/"/g, '\\"')}"`)
            .join('; ')}`
        : baseExport;

      console.log(`[Terminal] Injecting CLAUDE_TMUX_SESSION and ${Object.keys(customEnvVars).length} custom vars into session '${sessionName}'`);
      exec(`tmux send-keys -t "${sessionName}" "${allExports}" C-m`);
    }, 100);
  } else {
    // For existing sessions, just ensure mouse is enabled
    // CLAUDE_TMUX_SESSION was already injected when the session was created
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
