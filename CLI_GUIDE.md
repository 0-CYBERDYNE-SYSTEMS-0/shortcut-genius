# ShortcutGenius CLI Guide

## Current Status: ✅ CLI Implemented!

**Great news:** A comprehensive CLI has been implemented for ShortcutGenius!

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

## 🔧 Installation

### Prerequisites

- Node.js 18+ installed
- ShortcutGenius source code
- npm installed

### Install Steps

1. **Install dependencies:**
```bash
cd shortcut-genius
npm install
```

2. **Link CLI globally:**
```bash
npm link
```

3. **Verify installation:**
```bash
shortcut-genius --version
```

### Unlink

To remove global symlink:
```bash
npm unlink -g shortcut-genius
```

## 🎯 Use Cases

The CLI is perfect for:

### 1. **Automation Scripts**
Generate shortcuts as part of CI/CD pipelines or automated workflows:
```bash
#!/bin/bash
for shortcut in "timer" "weather" "alarm"; do
  shortcut-genius build "Create a ${shortcut} shortcut" \
    --output ${shortcut}.shortcut \
    --sign
done
```

### 2. **Batch Processing**
Process multiple shortcuts at once:
```bash
#!/bin/bash
for file in *.json; do
  shortcut-genius analyze "$file" --json > "${file%.json}-analysis.json"
  shortcut-genius convert "$file" --to shortcut
done
```

### 3. **Headless Operation**
Run on servers without UI:
```bash
# On remote server
npm run dev &
# Then use CLI
shortcut-genius build "Server monitoring shortcut"
```

### 4. **Terminal Preference**
For users who love command line and hate mouse clicks:
```bash
# Much faster than web UI
shortcut-genius build "Quick notes shortcut" --model gpt-4o-mini
```

### 5. **Integration with Other Tools**
Use in shell scripts, Makefiles, or other CLI tools:
```bash
# In Makefile
build-shortcuts:
  shortcut-genius build "My shortcut" -o build/shortcut.shortcut

# In shell script
if shortcut-genius test shortcut.shortcut; then
  echo "✓ Tests passed"
else
  echo "✗ Tests failed"
  exit 1
fi
```

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

## 💡 Tips and Tricks

### 1. Fast Model Switching

Set different models via environment variable:
```bash
SHORTCUT_GENIUS_MODEL=claude-3-5-sonnet-20241022 \
shortcut-genius build "Create shortcut"
```

### 2. Batch Processing Script

Process a directory of shortcuts:
```bash
#!/bin/bash
for file in shortcuts/*.json; do
  base="${file%.json}"
  echo "Processing $file..."
  
  # Analyze
  shortcut-genius analyze "$file" --detailed \
    > "${base}-analysis.txt"
  
  # Convert
  shortcut-genius convert "$file" --to plist \
    -o "${base}.plist"
  
  echo "✓ Completed $base"
done
```

### 3. Automated Testing

Test all shortcuts in a directory:
```bash
#!/bin/bash
passed=0
failed=0

for file in tests/*.shortcut; do
  echo "Testing $file..."
  
  if shortcut-genius test "$file" --steps; then
    ((passed++))
  else
    ((failed++))
    echo "✗ Failed: $file"
  fi
done

echo ""
echo "Results: $passed passed, $failed failed"
```

### 4. CI/CD Integration

Use in GitHub Actions or other CI:
```yaml
name: Build Shortcuts
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Start server
        run: npm run dev &
      - name: Build shortcuts
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          shortcut-genius build "Timer shortcut" \
            --output build/timer.shortcut \
            --sign
```

### 5. Makefile Integration

Create shortcuts with `make`:
```makefile
# Makefile
.PHONY: build test clean

build:
  @echo "Building shortcuts..."
  shortcut-genius build "Timer" -o build/timer.shortcut
  shortcut-genius build "Weather" -o build/weather.shortcut

test:
  @echo "Testing shortcuts..."
  shortcut-genius test build/timer.shortcut
  shortcut-genius test build/weather.shortcut

clean:
  rm -rf build/
```

**Last Updated:** 2025-01-07
**Status:** No CLI Currently Implemented
