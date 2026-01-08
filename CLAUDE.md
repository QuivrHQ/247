# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

247 (Quivr) - A system for web terminal access to Claude Code from anywhere. Consists of a Next.js dashboard (Vercel), local Node.js agents (one per Mac) with SQLite for local persistence, and Cloudflare Tunnels for secure exposure..

**Domain:** 247.quivr.com

## Development Commands

```bash
# Install dependencies
pnpm install

# Start all dev servers (web + agent)
pnpm dev

# Start individual services
pnpm dev:web          # Dashboard at http://localhost:3001
pnpm dev:agent        # Agent at ws://localhost:4678

# Build and check
pnpm build            # Build all packages
pnpm typecheck        # TypeScript type checking
pnpm lint             # Lint all packages

```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud (Vercel)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  apps/web (Next.js 15)                               │   │
│  │  - Dashboard UI with xterm.js terminal               │   │
│  │  - Stateless: uses localStorage for agent URL        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                    Cloudflare Tunnel
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Local Mac                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  apps/agent (Express + WebSocket)                    │   │
│  │  - node-pty for terminal spawning                    │   │
│  │  - tmux for session persistence                      │   │
│  │  - SQLite for local session/status persistence       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  packages/hooks (Claude Code Plugin)                 │   │
│  │  - Notifies agent when Claude Code stops             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

| Package | Purpose |
|---------|---------|
| `apps/web` | Next.js 15 dashboard (stateless, localStorage only) |
| `apps/agent` | Express server, WebSocket terminal, node-pty |
| `packages/shared` | TypeScript types shared between web and agent |
| `packages/hooks` | Claude Code plugin for stop notifications |

## Important Rules

- **Always use a local database** - Never use cloud/remote databases (Neon, Supabase, PlanetScale, etc.). Prefer SQLite or other local solutions managed by the agent for all persistence needs.
- **Always run tests** - Run `pnpm test` before committing any changes. All tests must pass.
- **Always add relevant tests** - When adding or modifying features, write corresponding unit/integration tests. No code change without appropriate test coverage.

## Testing Rules

- **Always add tests for new code** - Every new feature, function, or component must have corresponding tests
- **Never delete tests without confirmation** - Ask before removing any existing tests
- **Minimum 80% coverage** - New code should aim for 80%+ test coverage
- **Test existing patterns** - Check existing tests in `tests/` directories for patterns and helpers
- **Mock external dependencies** - Use vitest mocks for external modules, browser APIs, and network calls

### Test Commands

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter 247-agent test
pnpm --filter 247-cli test
pnpm --filter 247-web test
pnpm --filter 247-shared test

# Run tests with coverage
pnpm --filter 247-agent test -- --coverage
pnpm --filter 247-cli test -- --coverage
pnpm --filter 247-web test -- --coverage

# Run tests in watch mode
pnpm --filter 247-agent test -- --watch
```

### Test File Structure.

```
apps/agent/tests/
├── unit/           # Unit tests for individual modules
│   ├── db/         # Database module tests
│   └── ...
└── integration/    # Integration tests for API contracts

packages/cli/tests/
├── unit/           # Unit tests for commands and utilities
│   ├── commands/   # Command-specific tests
│   └── ...
└── integration/    # Workflow integration tests

apps/web/tests/
├── setup.ts        # Test setup with browser mocks
└── unit/           # Unit tests for components and utilities
    ├── components/ # Component logic tests
    └── lib/        # Library function tests
```

### What to Test

- **Agent**: Database operations, API endpoints, WebSocket protocol, config validation
- **CLI**: Command behavior, prerequisites checks, path utilities, service management
- **Web**: Notification logic, session sorting/filtering, time formatting, type guards
- **Shared**: Type definitions, protocol message validation, contract compliance

## Key Technical Decisions

- **pnpm workspaces + Turbo** for monorepo orchestration
- **@homebridge/node-pty-prebuilt-multiarch** for ARM64 Mac compatibility
- **tmux** sessions for terminal persistence across browser disconnects
- **SQLite** (better-sqlite3) for agent-side persistence
- **xterm.js** for browser terminal rendering

## Environment Setup

**apps/agent/config.json:**
```json
{
  "machine": { "id": "unique-id", "name": "Display Name" },
  "tunnel": { "domain": "your.tunnel.domain" },
  "projects": {
    "basePath": "~/Dev",
    "whitelist": ["project1", "project2"]
  },
  "dashboard": {
    "apiUrl": "https://your-dashboard.vercel.app/api",
    "apiKey": "same-shared-secret"
  }
}
```

## WebSocket Protocol

Terminal communication via `ws://agent:4678/terminal?project=X&session=Y`:
- `{ type: 'input', data: string }` - keyboard input
- `{ type: 'resize', cols, rows }` - terminal resize
- `{ type: 'start-claude' }` - launch Claude Code
- Binary data for terminal output

## Mobile Touch Scroll in tmux

### Alternate Buffer Detection

Les apps fullscreen (Claude Code, vim, htop) utilisent le **alternate screen buffer** qui n'a PAS de scrollback.
Dans ce cas, `term.scrollLines()` ne fait rien car `baseY` est toujours 0.

**Solution**: Détecter le buffer alternatif et envoyer des escape sequences mouse wheel à tmux:

```typescript
const isAlternateBuffer = term.buffer.active.type === 'alternate';

if (isAlternateBuffer) {
  // Envoyer wheel events au PTY - tmux intercepte et entre en copy-mode
  // SGR mouse encoding: CSI < button ; x ; y M
  // Button 64 = wheel UP (voir ancien), Button 65 = wheel DOWN (voir récent)
  const wheelUp = '\x1b[<64;1;1M';
  const wheelDown = '\x1b[<65;1;1M';
}
```

### Natural Scroll Direction (IMPORTANT)

Mobile utilise le "natural scroll" (style iOS/Android):
- **Swipe UP** (doigt monte, deltaY < 0) → contenu monte → voir contenu **RÉCENT** → envoyer wheel DOWN (65)
- **Swipe DOWN** (doigt descend, deltaY > 0) → contenu descend → voir contenu **ANCIEN** → envoyer wheel UP (64)

**Ne pas confondre**: La direction du swipe est OPPOSÉE à la direction du wheel event!

```typescript
// Natural scroll mapping
const wheelEvent = deltaY < 0
  ? '\x1b[<65;1;1M'  // Swipe UP → wheel DOWN (see newer)
  : '\x1b[<64;1;1M'; // Swipe DOWN → wheel UP (see older)
```

### Performance Tips

- Envoyer UN SEUL événement par touchmove (pas de boucle)
- Seuil minimum de 10px pour éviter les micro-mouvements
- `touchmove` est déjà appelé fréquemment par le navigateur
