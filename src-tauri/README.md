# ShortcutGenius Desktop App (Tauri)

ShortcutGenius is available as a native desktop application for macOS, Windows, and Linux powered by [Tauri v2](https://tauri.app).

The desktop app wraps the existing React frontend and Node.js/Express backend in a native window. The backend runs locally as a managed subprocess, so all AI features and API calls work the same as the web version.

---

## Architecture

```
┌─────────────────────────────────┐
│         Tauri Shell (Rust)      │
│  ┌───────────────────────────┐  │
│  │    WebView (Chromium)     │  │
│  │  React + Monaco Editor   │  │
│  └──────────┬────────────────┘  │
│             │  HTTP             │
│  ┌──────────▼────────────────┐  │
│  │  Express API Server       │  │
│  │  (Node.js sidecar)        │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

- **WebView** connects to the Express server at `http://localhost:PORT`
- All relative API calls (`/api/…`) work unchanged
- In **development** mode the Tauri webview connects to the running `npm run dev` server
- In **production** mode Tauri spawns `node server/index.js` automatically and kills it on window close

---

## Prerequisites

### All platforms
- **Node.js 20+** and **npm**
- **Rust** toolchain via [rustup](https://rustup.rs)

### Linux (Ubuntu / Debian)
```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libssl-dev \
  librsvg2-dev \
  patchelf
```

### macOS
```bash
xcode-select --install
```

### Windows
- [Microsoft Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (included in Windows 11 / auto-installed on Windows 10)

---

## Development

Open **two terminals**:

**Terminal 1 – start the dev server** (Express + Vite HMR):
```bash
npm run dev
```

**Terminal 2 – launch the Tauri desktop window**:
```bash
npm run tauri:dev
```

> `tauri:dev` connects to the already-running dev server on `localhost:4321`.  
> Hot-module reloading (HMR) works automatically inside the Tauri window.

---

## Production Build

Build the frontend and bundle the server:
```bash
npm run build
```

Then build the native desktop installer:
```bash
npm run tauri:build
```

Outputs are placed in `src-tauri/target/release/bundle/`:
| Platform | Format |
|----------|--------|
| macOS    | `.dmg` / `.app` |
| Windows  | `.msi` / `.exe` (NSIS) |
| Linux    | `.deb` / `.AppImage` / `.rpm` |

### Bundling the server with the desktop app

To include the bundled Express server inside the installer, add the following to
`src-tauri/tauri.conf.json` **after** running `npm run build` (so `dist/index.js` exists):

```json
"bundle": {
  "resources": {
    "../dist/index.js": "server/index.js"
  }
}
```

The Tauri Rust backend (`src-tauri/src/lib.rs`) will then find `server/index.js` inside
the app's resource directory and spawn it automatically.

---

## Environment Variables

Create a `.env` file in the project root with your API keys before launching:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
DATABASE_URL=postgresql://...
PORT=4321
```

---

## Key Files

| Path | Description |
|------|-------------|
| `src-tauri/src/lib.rs` | Rust app entry – server lifecycle management |
| `src-tauri/src/main.rs` | Binary entry point |
| `src-tauri/tauri.conf.json` | Tauri configuration |
| `src-tauri/capabilities/default.json` | Permission set |
| `src-tauri/Cargo.toml` | Rust dependencies |
| `src-tauri/icons/` | App icons (generated from `generated-icon.png`) |
