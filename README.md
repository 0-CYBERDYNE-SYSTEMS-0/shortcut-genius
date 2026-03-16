# ShortcutGenius

<p align="center">
  <img src="generated-icon.png" alt="ShortcutGenius Logo" width="120" height="120">
</p>

<p align="center">
  <strong>AI-Powered IDE for iOS Shortcuts</strong><br>
  Build, analyze, test, and share iOS Shortcuts with conversational AI
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
</p>

---

## Features

### Conversational AI Interface
Chat naturally with AI to build shortcuts. No coding required—just describe what you want.

```
User: "Create a shortcut that sends my location to my emergency contact"
AI: "I'll create a shortcut that gets your current location and sends it via Messages..."
```

### Agentic Architecture
Our stateful AI agent doesn't just generate code—it researches real APIs, validates results, and iterates until perfect:

- **Web Search Integration** - Automatically searches for real API documentation
- **Multi-Turn Reasoning** - Iterates up to 15-20 times to refine shortcuts
- **Zero Placeholder Policy** - Validates against example.com and placeholder URLs
- **Confidence Scoring** - Only finalizes when confidence exceeds 90%

### 100+ AI Models
Choose from the best models via OpenRouter, or use direct integrations:

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o-mini, GPT-4-turbo |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus |
| OpenRouter | 100+ models (DeepSeek, Llama, Mistral, etc.) |
| Zai | GLM-4.7, GLM-4.6 |
| MiniMax | MiniMax-M2.5, MiniMax-M2.1 |
| Moonshot | Kimi K2.5 |

### Runtime Testing (macOS)
Test shortcuts before downloading:
- Import and execute on macOS Shortcuts app
- Capture real output and errors
- Validate action-by-action
- Auto-cleanup after testing

### Visual IDE
- **Monaco Editor** - Full-featured JSON editor with syntax highlighting
- **Live Preview** - See your shortcut visualized as you edit
- **3-Column Layout** - Editor, AI Chat, and Gallery tabs
- **Responsive Design** - Works on desktop, tablet, and mobile

### Sharing & Gallery
- **QR Code Generation** - Share shortcuts instantly
- **Public Gallery** - Browse community shortcuts
- **Download Tracking** - See shortcut popularity
- **Signed Shortcuts** - macOS code signing support

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- macOS (for runtime testing feature)
- API keys for AI providers (OpenAI, Anthropic, or OpenRouter)

### Installation

```bash
# Clone the repository
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius.git
cd shortcut-genius

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your API keys
```

### Configuration

Edit `.env` with your API keys:

```bash
# Required: At least one AI provider
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
OPENROUTER_API_KEY=your_openrouter_key

# Optional: For persistent conversations
DATABASE_URL=postgresql://user:pass@localhost:5432/shortcutgenius

# Optional: Web search enhancement
TAVILY_API_KEY=your_tavily_key
```

### Start the Application

```bash
# Development mode
npm run dev

# Open browser to http://localhost:4321
```

For persistent conversations, start PostgreSQL:

```bash
docker compose up -d
npm run db:push
```

Or use in-memory storage:

```bash
CONVERSATION_STORE_MODE=memory npm run dev
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](docs/USER_GUIDE.md) | Complete guide to using the IDE |
| [CLI Guide](docs/CLI_GUIDE.md) | Command-line interface documentation |
| [API Reference](docs/API_REFERENCE.md) | REST API documentation |
| [Features](docs/FEATURES.md) | Detailed feature documentation |
| [Architecture](AGENTIC-ARCHITECTURE.md) | Technical architecture overview |
| [Chat Integration](CHAT_INTEGRATION.md) | Chat system documentation |
| [Testing Guide](docs/shortcut-testing-guide.md) | Runtime testing documentation |
| [Security](SECURITY.md) | Security review and best practices |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Editor    │  │  AI Chat    │  │      Gallery        │  │
│  │   (Monaco)  │  │  (Streaming)│  │   (Community)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Backend (Express)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Agentic   │  │   Model     │  │   Web Search        │  │
│  │   Builder   │  │   Router    │  │   (Tavily/etc)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Shortcut  │  │   Circuit   │  │   Sharing           │  │
│  │   Builder   │  │   Breaker   │  │   System            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **AgenticShortcutBuilder** - Stateful AI agent with scratchpad and tool calling
- **ModelRouter** - Intelligent model selection based on task complexity
- **CircuitBreaker** - API resilience with automatic recovery
- **WebSearchTool** - Real-time API documentation retrieval
- **ShortcutTester** - macOS automation bridge for runtime testing

---

## CLI Usage

ShortcutGenius includes a full-featured CLI:

```bash
# Build a shortcut from text prompt
shortcut-genius build "Create a timer shortcut"

# Analyze an existing shortcut
shortcut-genius analyze my-shortcut.shortcut --detailed

# List available AI models
shortcut-genius models

# Test shortcut on macOS
shortcut-genius test my-shortcut.shortcut
```

See [CLI Guide](docs/CLI_GUIDE.md) for complete documentation.

---

## Example Shortcuts

Check the [`examples/`](examples/) directory for sample shortcuts:

- **Timer & Alarms** - Various timer implementations
- **API Integrations** - Weather, news, and service integrations
- **Automation** - File processing, notifications, workflows
- **Utilities** - Text processing, calculations, converters

---

## Development

```bash
# Run tests
npm test

# Build for production
npm run build

# Verify shortcut flow
npm run verify:shortcut-flow

# Start production server
npm start
```

---

## Security

> **⚠️ IMPORTANT**: This tool is designed for **local development**. It is not intended for public deployment without implementing proper security measures (authentication, rate limiting, input validation).

- No hardcoded secrets in code
- API keys stored locally in `.local/shortcut-genius/`
- Comprehensive security audit completed (see [SECURITY.md](SECURITY.md))
- Security score: 76/100 (acceptable for local tool)

For security vulnerabilities, please follow [SECURITY.md](SECURITY.md) instead of opening public issues.

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- Public PRs are welcome
- All changes are maintainer-reviewed
- Follow the code of conduct in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [OpenAI](https://openai.com/) for GPT models
- [Anthropic](https://anthropic.com/) for Claude models
- [OpenRouter](https://openrouter.ai/) for unified model access
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor

---

<p align="center">
  Built with ❤️ for the iOS Shortcuts community
</p>
