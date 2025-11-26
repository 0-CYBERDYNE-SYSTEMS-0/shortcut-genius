# Shortcut Genius - iOS Shortcuts Builder

## Overview
Advanced iOS Shortcuts creation tool for macOS that allows users to import, edit, and export shortcuts in multiple formats (plist, JSON, HTML) with proper signing. Features AI-assisted shortcut creation from natural language descriptions.

## Current State
- **Import/Export**: Supports plist (binary/XML), JSON, and HTML formats
- **Signing**: Uses macOS `shortcuts` CLI for proper signing
- **AI Integration**: Uses OpenAI/Anthropic/OpenRouter for shortcut generation
- **Action Database**: Extractable from Apple's WFActions.plist

## Quick Start (macOS)

### 1. Clone and Setup
```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Add your API keys to .env
```

### 2. Extract Action Database (Recommended)
```bash
# Extract authoritative actions from macOS
node scripts/extract-wfactions.js

# Merge with existing databases
node scripts/merge-action-databases.js
```

### 3. Run the Application
```bash
npm run dev
```

## Project Structure

```
├── client/                 # Frontend React application
│   └── src/
│       ├── components/     # UI components
│       ├── lib/           # Utilities and types
│       └── pages/         # Page components
├── server/                # Backend Express server
│   ├── plist-converter.ts # Plist import/export
│   ├── shortcut-builder.ts # Shortcut generation
│   ├── shortcut-signer.ts # macOS signing
│   └── routes.ts          # API endpoints
├── scripts/               # Setup and utility scripts
│   ├── extract-wfactions.js   # Extract Apple's action database
│   └── merge-action-databases.js # Consolidate databases
└── actions-database.json  # Authoritative action definitions
```

## API Endpoints

### Import/Export
- `POST /api/shortcuts/import` - Import .shortcut, .plist, .json files
- `POST /api/shortcuts/export` - Export to plist, json, html, binary formats
- `POST /api/shortcuts/build` - Build shortcut file

### Signing (macOS only)
- `GET /api/shortcuts/signing-info` - Check signing capability
- `POST /api/shortcuts/sign` - Sign shortcut file
- `POST /api/shortcuts/verify` - Verify signature

### AI Processing
- `POST /api/process` - Generate or analyze shortcuts with AI

## Architecture Decisions

### Action Database
- Single source of truth: `actions-database.json`
- Extracted from `/System/Library/PrivateFrameworks/WorkflowKit.framework/WFActions.plist`
- Merged with validated community contributions

### Format Conversion
- Internal format uses simplified `{ type, identifier, parameters }` structure
- Converts bidirectionally to Apple's `WFWorkflowAction*` format
- Supports both XML and binary plist

### Signing
- Real signing requires macOS with Shortcuts.app
- Uses `shortcuts sign --mode anyone` command
- Mock signing available for development on other platforms

## User Preferences
- Target platform: macOS local development
- Simple setup priority
- Authoritative action database from Apple sources

## Recent Changes
- Added WFActions.plist extraction script
- Implemented plist import/export with proper type conversion
- Added HTML export for web preview
- Fixed hardcoded paths to use relative/configurable paths
- Consolidated action databases into single source

## Environment Variables
See `.env.example` for full configuration options.

Required for AI features:
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY`

Optional:
- `TAVILY_API_KEY` - For web search capabilities
- `SIGNING_MODE` - Default: "anyone"
