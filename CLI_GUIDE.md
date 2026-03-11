# ShortcutGenius CLI Guide

## Current Status: ❌ No CLI Implemented

**Important:** The ShortcutGenius application is currently **web-based only**. There is no Command Line Interface (CLI) implemented yet.

---

## 📖 How to Use Currently

The application is a web application that you run locally:

### 1. Start the Web Server

```bash
cd shortcut-genius
npm install
cp .env.example .env
# Edit .env and add your API keys
npm run dev
```

### 2. Access the Web Interface

Open your browser and go to:
```
http://localhost:4321
```

### 3. Use the Application

- **Build Shortcuts:** Use the Editor tab
- **Analyze Shortcuts:** Click "Analyze" button
- **Test Shortcuts:** Click "Test" button (requires macOS)
- **Chat with AI:** Use the Chat tab
- **View Analysis:** Use the Analysis tab

---

## ❓ Why Is There No CLI?

The application was designed as a **web-based tool** for these reasons:

1. **Visual Interface** - Building shortcuts benefits from UI
2. **Real-time Feedback** - Web UI shows instant analysis results
3. **Model Selection** - Dropdown selectors are web-native
4. **File Uploads** - Easy to upload shortcut files via web
5. **Live Updates** - Streaming responses from AI agents
6. **Cross-Platform** - Works in any web browser

---

## 💡 Can We Add a CLI?

**Yes!** A CLI can be added if you need it. Here's what a CLI could do:

### Potential CLI Commands

```bash
# Build a shortcut from description
shortcut-genius build "Create a timer shortcut"

# Analyze an existing shortcut
shortcut-genius analyze my-shortcut.shortcut

# Convert shortcut format
shortcut-genius convert input.json --format plist

# Test a shortcut (macOS only)
shortcut-genius test my-shortcut.shortcut

# Run with specific model
shortcut-genius build "My shortcut" --model gpt-4o

# List available models
shortcut-genius models list

# Generate from JSON
shortcut-genius generate shortcut.json
```

### Use Cases for CLI

1. **Automation** - Script shortcut generation in CI/CD pipelines
2. **Batch Processing** - Process multiple shortcuts at once
3. **Headless Operation** - Run without web browser
4. **Terminal Lovers** - For users who prefer command line
5. **Remote Servers** - Generate shortcuts on headless servers
6. **Integration** - Use in other CLI tools or workflows

---

## 🚀 Would You Like a CLI Added?

If you need a CLI, I can create one that includes:

### Features
- ✅ Shortcut generation from text prompt
- ✅ Shortcut analysis (structure, compatibility, optimizations)
- ✅ Format conversion (JSON ↔ Plist ↔ .shortcut)
- ✅ Shortcut testing (macOS automation bridge)
- ✅ Model selection and configuration
- ✅ Provider management (API keys)
- ✅ Conversation management
- ✅ Batch processing
- ✅ Progress bars and status updates

### Command Structure

```bash
# Main command
shortcut-genius <command> [options]

# Build shortcut
shortcut-genius build <prompt> [options]
  -m, --model <name>      AI model to use
  -p, --provider <name>    Provider (openai, anthropic, glm, etc.)
  -o, --output <path>      Output file path
  -f, --format <type>      Format: json, plist, shortcut
  --sign                    Sign shortcut
  --no-sign                 Don't sign shortcut

# Analyze shortcut
shortcut-genius analyze <file> [options]
  -d, --detailed          Show detailed analysis
  -j, --json              Output as JSON
  -w, --warnings-only       Only show warnings

# Test shortcut
shortcut-genius test <file> [options]
  -v, --verbose            Show test output
  -s, --steps              Show test steps

# Convert format
shortcut-genius convert <input> --to <format> [options]
  -o, --output <path>      Output file path

# Models
shortcut-genius models list [options]
  -p, --provider <name>    Filter by provider

# Providers
shortcut-genius providers list
shortcut-genius providers configure <provider>
  -k, --key <api-key>      Set API key
  --test                    Test connection

# Config
shortcut-genius config get <key>
shortcut-genius config set <key> <value>
shortcut-genius config list
```

### Installation (if added)

The CLI would be installed via npm:

```bash
npm install -g shortcut-genius

# Or from local build
npm link
```

---

## 📝 Alternative: Use curl for CLI-like Access

While we don't have a full CLI, you can use the API directly with `curl`:

### Build Shortcut

```bash
curl -X POST http://localhost:4321/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "prompt": "Create a timer shortcut",
    "type": "generate"
  }'
```

### Analyze Shortcut

```bash
curl -X POST http://localhost:4321/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "prompt": "Analyze this shortcut",
    "type": "analyze"
  }'
```

### Build Shortcut File

```bash
curl -X POST http://localhost:4321/api/shortcuts/build \
  -H "Content-Type: application/json" \
  -d '{
    "shortcut": {
      "name": "My Shortcut",
      "actions": [...]
    },
    "format": "plist",
    "sign": true
  }' \
  --output my-shortcut.plist
```

---

## 🎯 What Should I Do?

### If You Want a CLI

Tell me what you need and I can create one!

**Options:**
1. **Full CLI** - Complete CLI with all commands
2. **Basic CLI** - Just build and analyze commands
3. **Conversion CLI** - Only format conversion
4. **Test CLI** - Just shortcut testing (requires macOS)

### If You're Using the Web Interface

You're already set up! Just follow the **Web Interface** instructions above.

### If You Want Headless Operation

Use the API with `curl` or write a simple script as shown in the **Alternative** section.

---

## 📞 Request CLI Feature

If you need a CLI, just ask! Tell me:

1. **Which commands do you need?** (build, analyze, test, convert, all)
2. **What's your use case?** (automation, batch processing, terminal preference, etc.)
3. **Any specific requirements?** (output format, progress bars, specific models)

I'll implement it for you! 🚀

---

## 🔮 Future Plans

A CLI is on the roadmap. The current focus is on:

1. ✅ Web UI stability
2. ✅ AI agent improvements
3. ✅ Multi-provider support
4. ✅ Shortcut testing system
5. ⏳ CLI implementation (coming soon)

---

**Last Updated:** 2025-01-07
**Status:** No CLI Currently Implemented
