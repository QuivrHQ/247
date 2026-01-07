# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

247 (The Vibe Company) - A system for web terminal access to Claude Code from anywhere. Consists of a Next.js dashboard (Vercel), local Node.js agents (one per Mac) with SQLite for local persistence, and Cloudflare Tunnels for secure exposure.

**Domain:** 247.thevibecompany.co

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
