# Claude Code Remote Control - Project Plan

## Goal
Run Claude Code for extended periods with **web terminal access from anywhere** via Vercel + Neon DB + Cloudflare Tunnel.

**Key Features:**
- **Web Terminal**: xterm.js in browser - no SSH app needed
- **Access from anywhere**: Vercel dashboard + Cloudflare Tunnel
- **Multi-machine**: Choose which Mac to run Claude on
- **Neon DB**: Persist sessions, users, logs
- **Project whitelist**: Only show authorized projects
- **GitHub clone**: Clone repos on-demand

---

## Architecture: Cloud + Local Agents

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANYWHERE (Phone, Laptop, etc.)                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Vercel Dashboard                                          │ │
│  │  https://claude-remote.vercel.app                          │ │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────────────────┐ │ │
│  │  │ Machine  │ │ Project  │ │ 🖥 Web Terminal (xterm.js)  │ │ │
│  │  │ selector │ │ selector │ │ Full terminal in browser!   │ │ │
│  │  └──────────┘ └──────────┘ └─────────────────────────────┘ │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTPS/WSS
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Neon DB     │     │  Mac Mini     │     │  MacBook      │
│   (Postgres)  │     │  (home)       │     │  (office)     │
│               │     │               │     │               │
│  • machines   │     │  Agent :3847  │     │  Agent :3847  │
│  • sessions   │     │  ↓            │     │  ↓            │
│  • users      │     │  Cloudflare   │     │  Cloudflare   │
│  • logs       │     │  Tunnel       │     │  Tunnel       │
│               │     │  ↓            │     │  ↓            │
│               │     │  mac-mini.    │     │  macbook.     │
│               │     │  tunnel.com   │     │  tunnel.com   │
└───────────────┘     └───────────────┘     └───────────────┘
```

### Data Flow

```
1. User opens https://claude-remote.vercel.app
2. Dashboard fetches machines from Neon DB
3. User selects machine → connects to agent via Cloudflare Tunnel
4. Agent spawns tmux + Claude Code
5. WebSocket streams terminal output to xterm.js
6. User interacts directly in browser!
```

---

## What is "Ultrathink"?

**Ultrathink** = Claude Code magic word for maximum thinking budget (8x normal, up to 31,999 tokens).

```
"think" < "think hard" < "think harder" < "ultrathink"
```

Use for major architectural decisions. Costs ~5x more tokens.
- [Source](https://claudelog.com/faqs/what-is-ultrathink/)

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Dashboard | Next.js 15 + Vercel | Web UI, API routes |
| Terminal | xterm.js + @xterm/addon-attach | Browser terminal |
| Database | Neon (Postgres) + Drizzle ORM | Persist machines, sessions |
| Agent | Node.js + Express + node-pty | Local terminal server |
| Tunnel | Cloudflare Tunnel (cloudflared) | Expose agents to internet |
| Auth | NextAuth.js or Clerk | User authentication |
| WebSocket | ws (agent) + native (browser) | Terminal streaming |

---

## Project Structure

```
claude-remote-control/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
│
├── apps/
│   ├── web/                        # Vercel Dashboard (Next.js)
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── drizzle.config.ts
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # Machine selector
│   │   │   ├── terminal/[machineId]/
│   │   │   │   └── page.tsx        # xterm.js terminal
│   │   │   └── api/
│   │   │       ├── machines/route.ts
│   │   │       └── sessions/route.ts
│   │   ├── components/
│   │   │   ├── Terminal.tsx        # xterm.js wrapper
│   │   │   ├── MachineCard.tsx
│   │   │   └── ProjectSelector.tsx
│   │   └── lib/
│   │       ├── db.ts               # Drizzle + Neon
│   │       └── schema.ts           # DB schema
│   │
│   └── agent/                      # Runs on EACH Mac
│       ├── package.json
│       ├── config.json             # Machine config
│       └── src/
│           ├── index.ts            # Entry point
│           ├── server.ts           # Express + WebSocket
│           ├── terminal.ts         # node-pty + tmux
│           ├── github.ts           # Clone repos
│           └── register.ts         # Register with Neon DB
│
├── packages/
│   ├── shared/                     # Shared types
│   │   └── src/types.ts
│   │
│   └── hooks/                      # Claude Code plugin
│       ├── plugin.json
│       └── hooks/
│           └── stop.md
│
└── scripts/
    ├── setup-agent.sh              # Install agent + tunnel
    └── setup-tunnel.sh             # Configure Cloudflare Tunnel
```

---

## Database Schema (Neon + Drizzle)

```typescript
// apps/web/lib/schema.ts
import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const machines = pgTable('machines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tunnelUrl: text('tunnel_url').notNull(),      // e.g., mac-mini.tunnel.domain.com
  status: text('status').default('offline'),     // online, offline
  lastSeen: timestamp('last_seen'),
  config: jsonb('config'),                       // whitelist, allowedOrgs, etc.
  createdAt: timestamp('created_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  machineId: text('machine_id').references(() => machines.id),
  project: text('project'),
  status: text('status').default('running'),     // running, stopped, waiting
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
  tmuxSession: text('tmux_session'),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## Agent Configuration: `apps/agent/config.json`

```json
{
  "machine": {
    "id": "mac-mini-home",
    "name": "Mac Mini (home)"
  },
  "tunnel": {
    "domain": "mac-mini.your-domain.com"
  },
  "projects": {
    "basePath": "~/Dev",
    "whitelist": [
      "claude-remote-control",
      "ClaudIn",
      "SecondBrain"
    ]
  },
  "github": {
    "enabled": true,
    "clonePath": "~/Dev",
    "allowedOrgs": ["anthropics", "your-org"]
  },
  "dashboard": {
    "apiUrl": "https://claude-remote.vercel.app/api",
    "apiKey": "your-api-key"
  }
}
```

---

## Implementation Steps

### Step 1: Neon DB Setup

```bash
# 1. Create Neon account: https://neon.tech
# 2. Create new project "claude-remote"
# 3. Copy connection string

# In apps/web/.env.local:
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

### Step 2: Vercel Dashboard Setup

```bash
# Create Next.js app
pnpm create next-app@latest apps/web --typescript --tailwind --app

# Add dependencies
cd apps/web
pnpm add @neondatabase/serverless drizzle-orm
pnpm add -D drizzle-kit
pnpm add xterm @xterm/addon-fit @xterm/addon-web-links

# Deploy to Vercel
vercel link
vercel env add DATABASE_URL
vercel deploy
```

### Step 3: Cloudflare Tunnel Setup (on each Mac)

```bash
# Install cloudflared
brew install cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel for this machine
cloudflared tunnel create mac-mini

# Configure tunnel (creates ~/.cloudflared/config.yml)
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL_ID>
credentials-file: /Users/$(whoami)/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: mac-mini.your-domain.com
    service: http://localhost:3847
  - hostname: mac-mini-ws.your-domain.com
    service: ws://localhost:3847
  - service: http_status:404
EOF

# Add DNS record
cloudflared tunnel route dns mac-mini mac-mini.your-domain.com

# Run tunnel (or install as service)
cloudflared tunnel run mac-mini

# Install as launchd service (auto-start)
sudo cloudflared service install
```

### Step 4: Agent with WebSocket Terminal

`apps/agent/src/server.ts`:

```typescript
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import * as pty from 'node-pty';
import { exec } from 'child_process';
import { promisify } from 'util';
import config from '../config.json';

const execAsync = promisify(exec);
const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/terminal' });

// WebSocket terminal handler
wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const project = url.searchParams.get('project');
  const sessionName = url.searchParams.get('session');

  if (!project || !config.projects.whitelist.includes(project)) {
    ws.close(1008, 'Project not whitelisted');
    return;
  }

  const projectPath = `${config.projects.basePath}/${project}`.replace('~', process.env.HOME!);

  // Spawn pty with tmux
  const shell = pty.spawn('tmux', [
    'new-session', '-A', '-s', sessionName || `claude-${Date.now()}`
  ], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: projectPath,
    env: process.env as { [key: string]: string },
  });

  // Send output to WebSocket
  shell.onData((data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });

  // Receive input from WebSocket
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'input') {
      shell.write(msg.data);
    } else if (msg.type === 'resize') {
      shell.resize(msg.cols, msg.rows);
    } else if (msg.type === 'start-claude') {
      shell.write('claude\r');
    }
  });

  ws.on('close', () => {
    // Don't kill tmux - keep session alive
    console.log('Client disconnected, tmux session preserved');
  });
});

// REST API endpoints
app.get('/api/info', (req, res) => {
  res.json({ machine: config.machine, status: 'online' });
});

app.get('/api/projects', (req, res) => {
  res.json(config.projects.whitelist);
});

app.get('/api/sessions', async (req, res) => {
  try {
    const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}"');
    res.json(stdout.trim().split('\n').filter(Boolean));
  } catch {
    res.json([]);
  }
});

app.post('/api/github/clone', async (req, res) => {
  const { repoUrl } = req.body;
  const match = repoUrl.match(/github\.com[/:]([^/]+)/);
  const org = match?.[1];

  if (!config.github.allowedOrgs.includes(org) && !config.github.allowedOrgs.includes('*')) {
    return res.status(403).json({ error: `Org '${org}' not allowed` });
  }

  const repoName = repoUrl.split('/').pop()?.replace('.git', '');
  const targetPath = `${config.github.clonePath}/${repoName}`.replace('~', process.env.HOME!);

  await execAsync(`git clone ${repoUrl} ${targetPath}`);
  res.json({ cloned: repoName, path: targetPath });
});

// Register with dashboard on startup
async function registerWithDashboard() {
  try {
    await fetch(`${config.dashboard.apiUrl}/machines/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.dashboard.apiKey}`
      },
      body: JSON.stringify({
        id: config.machine.id,
        name: config.machine.name,
        tunnelUrl: config.tunnel.domain,
        config: {
          projects: config.projects.whitelist,
          github: config.github
        }
      })
    });
    console.log('Registered with dashboard');
  } catch (err) {
    console.error('Failed to register:', err);
  }
}

server.listen(3847, () => {
  console.log('Agent running on :3847');
  registerWithDashboard();

  // Heartbeat every 30s
  setInterval(registerWithDashboard, 30000);
});
```

### Step 5: Claude Code Hook (~5 min)

Create `~/.claude/plugins/remote-notify/plugin.json`:
```json
{
  "name": "remote-notify",
  "version": "1.0.0",
  "description": "Push notifications when Claude stops",
  "hooks": [
    { "event": "Stop", "path": "hooks/stop.md" }
  ]
}
```

Create `~/.claude/plugins/remote-notify/hooks/stop.md`:
```markdown
---
event: Stop
timeout: 5000
---

Notify the remote control server that Claude has stopped.

\`\`\`bash
curl -s -X POST "http://localhost:3847/api/hooks/stop" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Claude stopped - check session"}' || true
\`\`\`
```

### Step 6: xterm.js Terminal Component

`apps/web/components/Terminal.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import 'xterm/css/xterm.css';

interface TerminalProps {
  machineUrl: string;
  project: string;
  sessionName?: string;
}

export function Terminal({ machineUrl, project, sessionName }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const xtermRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, monospace',
      theme: {
        background: '#1a1a2e',
        foreground: '#eee',
        cursor: '#f97316',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = term;

    // Connect WebSocket to agent
    const wsUrl = `wss://${machineUrl}/terminal?project=${project}&session=${sessionName || ''}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      term.write('\r\n\x1b[32mConnected to ' + machineUrl + '\x1b[0m\r\n\r\n');
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      setConnected(false);
      term.write('\r\n\x1b[31mDisconnected\x1b[0m\r\n');
    };

    // Send input to agent
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: term.cols,
          rows: term.rows
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [machineUrl, project, sessionName]);

  const startClaude = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start-claude' }));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-2 bg-gray-800">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-300">{project}</span>
        <button
          onClick={startClaude}
          className="px-3 py-1 bg-orange-500 text-white rounded text-sm"
        >
          ▶ Start Claude
        </button>
      </div>
      <div ref={terminalRef} className="flex-1 bg-[#1a1a2e]" />
    </div>
  );
}
```

### Step 7: Dashboard Home Page

`apps/web/app/page.tsx`:

```tsx
import { db } from '@/lib/db';
import { machines } from '@/lib/schema';
import Link from 'next/link';

export default async function Home() {
  const allMachines = await db.select().from(machines);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🤖 Claude Remote</h1>

      <section className="mb-8">
        <h2 className="text-xl mb-4">🖥 Machines</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allMachines.map((machine) => (
            <Link
              key={machine.id}
              href={`/terminal/${machine.id}`}
              className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
            >
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${
                  machine.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="font-medium">{machine.name}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {machine.tunnelUrl}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
```

### Step 8: Terminal Page

`apps/web/app/terminal/[machineId]/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Terminal } from '@/components/Terminal';

export default function TerminalPage({ params }: { params: { machineId: string } }) {
  const [machine, setMachine] = useState<any>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');

  useEffect(() => {
    // Fetch machine info
    fetch(`/api/machines/${params.machineId}`)
      .then(r => r.json())
      .then(setMachine);
  }, [params.machineId]);

  useEffect(() => {
    if (machine?.tunnelUrl) {
      // Fetch projects from agent
      fetch(`https://${machine.tunnelUrl}/api/projects`)
        .then(r => r.json())
        .then((p) => {
          setProjects(p);
          if (p.length > 0) setSelectedProject(p[0]);
        });
    }
  }, [machine]);

  if (!machine) return <div>Loading...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <header className="p-4 bg-gray-800 flex items-center gap-4">
        <h1 className="text-xl font-bold text-white">{machine.name}</h1>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="bg-gray-700 text-white px-3 py-1 rounded"
        >
          {projects.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </header>

      {selectedProject && (
        <Terminal
          machineUrl={machine.tunnelUrl}
          project={selectedProject}
        />
      )}
    </div>
  );
}
```

### Step 9: Daily Usage

```
📱 From anywhere:

1. Open https://claude-remote.vercel.app
2. Select machine (online status shown)
3. Select project from dropdown
4. Full terminal in browser!
5. Click "▶ Start Claude" to launch Claude Code
6. Interact directly - no SSH needed!

Session persists even if you close browser (tmux)
```

---

## Files to Create

### Vercel Dashboard (`apps/web/`)

| File | Purpose |
|------|---------|
| `app/page.tsx` | Home page - machine list from Neon |
| `app/terminal/[machineId]/page.tsx` | Terminal page with xterm.js |
| `components/Terminal.tsx` | xterm.js WebSocket terminal |
| `lib/db.ts` | Drizzle + Neon connection |
| `lib/schema.ts` | Database schema |
| `app/api/machines/route.ts` | Machine CRUD API |
| `app/api/machines/register/route.ts` | Agent registration endpoint |

### Agent (`apps/agent/`) - Install on each Mac

| File | Purpose |
|------|---------|
| `config.json` | Machine config, whitelist, tunnel domain |
| `src/server.ts` | Express + WebSocket + node-pty |
| `~/.cloudflared/config.yml` | Cloudflare Tunnel config |
| `~/.claude/plugins/remote-notify/` | Claude Code hook plugin |

### Shared

| File | Purpose |
|------|---------|
| `packages/shared/types.ts` | Shared TypeScript types |
| `~/.tmux.conf` | Mouse support, scrollback |

---

## Workflow Summary

```
📱 From anywhere (phone, laptop, café):
   ↓
🌐 Open https://claude-remote.vercel.app
   ↓
🔐 Login (NextAuth/Clerk)
   ↓
🖥 See all machines with online/offline status
   ↓
👆 Click machine → opens terminal page
   ↓
📂 Select project from dropdown
   ↓
🖥 Full xterm.js terminal in browser!
   ↓
▶️  Click "Start Claude" → launches Claude Code
   ↓
⌨️  Type directly in browser - no SSH app needed!
   ↓
🔄 Close browser → session persists in tmux
   ↓
📱 Reconnect later from any device
```

---

## Security Model

| Feature | Protection |
|---------|------------|
| Dashboard | NextAuth/Clerk authentication |
| Agent API | API key validation |
| Projects | Whitelist per machine |
| GitHub | Allowed orgs only |
| Tunnel | Cloudflare Tunnel (encrypted, no open ports) |
| Database | Neon (TLS, connection pooling) |

---

## Services Required

| Service | Purpose | Cost |
|---------|---------|------|
| **Vercel** | Dashboard hosting | Free tier |
| **Neon** | Postgres database | Free tier (0.5GB) |
| **Cloudflare** | Tunnel + DNS | Free |
| **Domain** | Custom domain (optional) | ~$10/year |

---

## Key Resources

- [xterm.js](https://xtermjs.org/) - Terminal for the web
- [Neon + Vercel](https://vercel.com/marketplace/neon) - Serverless Postgres
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) - Secure tunnels
- [node-pty](https://github.com/microsoft/node-pty) - Pseudo terminals for Node
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM

---

## Plan File Location

Saved at: `/Users/stan/.claude/plans/agile-stargazing-kahn.md`

Also copied to: `~/Dev/BrainStorming/PLAN-claude-remote.md`
