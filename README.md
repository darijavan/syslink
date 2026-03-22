# SysLink

A VS Code extension and local TypeScript daemon that enable AI agents to securely interact with tools and applications on the host system. The extension spawns a local daemon process and communicates with it over **newline-delimited JSON stdio**, providing a foundation for OS-level automation (mouse, keyboard, app control, and more).

---

## Table of Contents

- [Repository structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Development](#development)
- [Packages](#packages)
  - [packages/shared](#packagesshared)
  - [packages/daemon](#packagesdaemon)
  - [packages/extension](#packagesextension)
- [Communication protocol](#communication-protocol)
- [Adding a new action](#adding-a-new-action)
- [Linting](#linting)
- [Running the extension](#running-the-extension)

---

## Repository structure

```
syslink/
├── packages/
│   ├── shared/        # Zod-validated protocol types + logger utility
│   ├── daemon/        # Node.js TypeScript daemon (stdin → dispatch → stdout)
│   └── extension/     # VS Code extension (spawn, command dispatch, OutputChannel)
├── eslint.config.mjs  # ESLint 9 flat config (TypeScript + Prettier)
├── tsconfig.base.json # Shared TypeScript compiler options
├── pnpm-workspace.yaml
└── package.json
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 24 |
| pnpm | 10 |

Install dependencies from the workspace root:

```bash
pnpm install
```

---

## Getting started

```bash
# Build all packages (shared → daemon → extension)
pnpm build

# Watch all packages in parallel during development
pnpm dev
```

---

## Development

Open the repository in VS Code. The workspace includes a pre-configured launch profile:

- **Run Extension** (`.vscode/launch.json`) — opens an Extension Development Host with SysLink loaded. Press <kbd>F5</kbd> to start.

Build output lands in each package's `dist/` directory (git-ignored).

---

## Packages

### packages/shared

Shared protocol types and utilities consumed by both `daemon` and `extension`.

| Export | Description |
|--------|-------------|
| `DaemonRequest` / `DaemonRequestSchema` | Zod schema + TypeScript type for requests sent from the extension to the daemon |
| `DaemonResponse` / `DaemonResponseSchema` | Zod schema + TypeScript type for responses sent from the daemon to the extension |
| `logger` | Timestamped logger that writes to **stderr** to keep the JSON stream on stdout clean |

**DaemonRequest fields**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique request identifier — used to correlate responses |
| `action` | `string` | Action to perform (e.g. `"ping"`) |
| `payload` | `unknown` (optional) | Action-specific input data |

**DaemonResponse fields**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Matches the `id` from the originating request |
| `status` | `"ok" \| "error"` | Whether the action succeeded |
| `message` | `string` (optional) | Human-readable message (e.g. `"pong"`) |
| `data` | `unknown` (optional) | Action-specific response data |

---

### packages/daemon

A long-running Node.js process that reads newline-delimited JSON from **stdin**, dispatches each request to the appropriate handler, and writes newline-delimited JSON to **stdout**.

**Handler registry** (`src/handlers.ts`) — add new entries here to support additional actions:

```ts
const handlers: Record<string, Handler> = {
  ping: (request) => ({ id: request.id, status: 'ok', message: 'pong' }),
  // Add more handlers here
};
```

**Built-in actions**

| Action | Response |
|--------|----------|
| `ping` | `{ status: "ok", message: "pong" }` |

Error cases:
- **Unknown action** → `{ status: "error", message: "Unknown action: \"<action>\"" }`
- **Malformed JSON / invalid schema** → `{ id: "unknown", status: "error", message: "Invalid or malformed request" }`

---

### packages/extension

The VS Code extension that spawns and communicates with the daemon.

**Commands** (accessible via the Command Palette `Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Title | Description |
|---------|-------|-------------|
| `aiAgent.startDaemon` | SysLink: Start Daemon | Spawns the local daemon process |
| `aiAgent.sendTestCommand` | SysLink: Send Test Command (Ping) | Sends a `ping` request and logs the response to the **SysLink** output channel |

**DaemonClient** (`src/daemon-client.ts`) — manages the full subprocess lifecycle:

- Spawns `node dist/index.js` from the `daemon` package
- Buffers stdout and parses complete newline-delimited JSON responses
- Forwards daemon stderr (log lines) to the VS Code output channel
- **Auto-restarts** on unexpected exit (2 s delay)
- Sets an `intentionalShutdown` flag in `stop()` to prevent restart race conditions during VS Code deactivation

---

## Communication protocol

Messages are **newline-delimited JSON** (`NDJSON`) over stdio:

```
extension  ──stdin──►  daemon
extension  ◄──stdout──  daemon
daemon log  ──stderr──►  extension output channel
```

**Example exchange:**

```jsonc
// Extension → Daemon (stdin)
{"id":"1","action":"ping"}

// Daemon → Extension (stdout)
{"id":"1","status":"ok","message":"pong"}
```

---

## Adding a new action

1. **Define the handler** in `packages/daemon/src/handlers.ts`:

   ```ts
   import { registerHandler } from './handlers';

   registerHandler('myAction', (request) => ({
     id: request.id,
     status: 'ok',
     data: { result: 'hello' },
   }));
   ```

   Or add it directly to the `handlers` map:

   ```ts
   const handlers: Record<string, Handler> = {
     ping: ...,
     myAction: (request) => ({ id: request.id, status: 'ok', data: { result: 'hello' } }),
   };
   ```

2. **Send the request** from the extension using `DaemonClient.send()`:

   ```ts
   client.send('myAction', { someInput: 42 });
   ```

3. Rebuild: `pnpm build`

---

## Linting

ESLint 9 (flat config) is configured at the workspace root.

```bash
# Check for lint errors
pnpm lint

# Auto-fix fixable issues
pnpm lint:fix
```

**Configuration** (`eslint.config.mjs`):
- `@typescript-eslint/recommended` applied to all `packages/*/src/**/*.ts` files
- `@typescript-eslint/no-floating-promises` enforced as an error
- `eslint-config-prettier` disables rules that conflict with Prettier (`.prettierrc`)

---

## Running the extension

1. Build all packages:
   ```bash
   pnpm build
   ```
2. Open VS Code at the repository root and press <kbd>F5</kbd>, or run:
   ```bash
   pnpm start:extension
   ```
3. In the Extension Development Host window, open the Command Palette and run:
   - **SysLink: Start Daemon** — starts the daemon subprocess
   - **SysLink: Send Test Command (Ping)** — sends a ping and shows the response in the **SysLink** output channel
