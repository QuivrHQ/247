import * as pty from '@homebridge/node-pty-prebuilt-multiarch';

export interface Terminal {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  onData(callback: (data: string) => void): void;
  onExit(callback: (info: { exitCode: number }) => void): void;
  kill(): void;
  detach(): void;
}

export function createTerminal(cwd: string, sessionName: string): Terminal {
  // Use tmux for session persistence
  // -A = attach if session exists, create if not
  // -s = session name
  // -c = working directory
  // -e = set environment variable (so Claude hooks can identify this session)
  const shell = pty.spawn('tmux', [
    'new-session',
    '-A',
    '-s', sessionName,
    '-c', cwd,
    '-e', `CLAUDE_TMUX_SESSION=${sessionName}`,
  ], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      PATH: `/opt/homebrew/bin:${process.env.PATH}`,
    } as { [key: string]: string },
  });

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
  };
}
