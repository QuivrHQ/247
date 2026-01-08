# 247

**Access Claude Code from anywhere, 24/7.**

A CLI tool by [The Vibe Company](https://247.thevibecompany.co) that lets you run Claude Code remotely and access it from any device via a web dashboard.

## Installation

```bash
npm install -g 247-cli
```

### Prerequisites

- **Node.js 22+**
- **tmux** - Required for terminal session persistence
  - macOS: `brew install tmux`
  - Linux: `sudo apt install tmux`

## Quick Start

```bash
# Configure the agent
247 init

# Install as a system service (recommended)
247 service install --start

# Or run in foreground
247 start --foreground
```

## Commands

| Command                          | Description                      |
| -------------------------------- | -------------------------------- |
| `247 init`                       | Interactive configuration wizard |
| `247 start`                      | Start the agent (daemon mode)    |
| `247 start --foreground`         | Start in foreground              |
| `247 stop`                       | Stop the agent                   |
| `247 status`                     | Show agent status                |
| `247 logs [-f]`                  | View agent logs                  |
| `247 service install`            | Install system service           |
| `247 service uninstall`          | Remove system service            |
| `247 service start/stop/restart` | Control service                  |
| `247 hooks install`              | Install Claude Code hooks        |
| `247 update`                     | Update to latest version         |
| `247 doctor`                     | Diagnose issues                  |

## System Service

The agent can run as a system service that starts automatically on boot:

**macOS (launchd):**

```bash
247 service install --start
# Config: ~/Library/LaunchAgents/co.thevibecompany.247.plist
# Logs: ~/Library/Logs/247-agent/
```

**Linux (systemd):**

```bash
247 service install --start
# Config: ~/.config/systemd/user/247-agent.service
# Logs: journalctl --user -u 247-agent
```

## Configuration

Configuration is stored in `~/.247/config.json`:

```json
{
  "machine": {
    "id": "unique-machine-id",
    "name": "My Mac"
  },
  "agent": {
    "port": 4678
  },
  "projects": {
    "basePath": "~/Dev"
  }
}
```

## Claude Code Hooks

The agent includes hooks that notify when Claude Code sessions stop:

```bash
247 hooks install   # Install hooks
247 hooks status    # Check status
247 hooks update    # Update to latest
```

## Troubleshooting

```bash
247 doctor
```

## Links

- **Dashboard:** https://247.thevibecompany.co
- **GitHub:** https://github.com/The-Vibe-Company/247

## License

MIT - The Vibe Company
