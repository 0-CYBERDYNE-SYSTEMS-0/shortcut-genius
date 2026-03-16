# ShortcutGenius CLI Guide

Complete command-line interface documentation for ShortcutGenius.

---

## Installation

### Global Installation

```bash
# From the project directory
npm link

# Verify installation
shortcut-genius --version
```

### Local Usage

```bash
# Without global installation
npx shortcut-genius <command>
```

---

## Quick Start

```bash
# Build a shortcut from text prompt
shortcut-genius build "Create a timer shortcut"

# Analyze an existing shortcut
shortcut-genius analyze my-shortcut.shortcut

# List available AI models
shortcut-genius models

# Test a shortcut on macOS
shortcut-genius test my-shortcut.shortcut
```

---

## Commands

### `build` - Build Shortcut from Prompt

Generate an iOS shortcut using AI from a natural language description.

```bash
shortcut-genius build <prompt> [options]
```

**Arguments:**
- `prompt` (required) - Description of the shortcut to create

**Options:**
- `-m, --model <name>` - AI model to use (default: from config or gpt-4o)
- `-p, --provider <name>` - AI provider (openai, anthropic, glm, minimax, kimi, opencode, codex)
- `-o, --output <path>` - Output file path (default: `<name>.shortcut`)
- `-f, --format <type>` - Format: json, plist, shortcut (default: shortcut)
- `--sign` - Sign shortcut file
- `--no-sign` - Don't sign shortcut
- `--debug` - Show debug information

**Examples:**

```bash
# Basic usage
shortcut-genius build "Create a timer shortcut"

# Specify model
shortcut-genius build "Weather widget with alerts" --model gpt-4o

# Specify provider and format
shortcut-genius build "Task automation" --provider anthropic --format plist

# Output to specific file
shortcut-genius build "Quick notes" --output ~/Shortcuts/notes.shortcut

# Sign the shortcut (macOS only)
shortcut-genius build "My shortcut" --sign
```

**Supported Models:**

| Provider | Example Models |
|----------|----------------|
| openai | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo |
| anthropic | claude-3-5-sonnet-20241022 |
| glm | glm/glm-4.7, glm/glm-4.6 |
| minimax | minimax-direct/MiniMax-M2.5 |
| kimi | kimi/kimi-k2-5 |
| opencode | opencode/default |
| codex | codex-1 (OAuth required) |

---

### `analyze` - Analyze Existing Shortcut

Analyze an existing shortcut for compatibility, optimizations, and issues.

```bash
shortcut-genius analyze <file> [options]
```

**Arguments:**
- `file` (required) - Shortcut file to analyze (.json, .plist, .shortcut)

**Options:**
- `-m, --model <name>` - AI model to use for analysis
- `-d, --detailed` - Show detailed analysis
- `-j, --json` - Output as JSON
- `-w, --warnings-only` - Only show warnings
- `--fix` - Suggest fixes for issues

**Examples:**

```bash
# Basic analysis
shortcut-genius analyze my-shortcut.shortcut

# Detailed analysis
shortcut-genius analyze shortcut.json --detailed

# Output as JSON
shortcut-genius analyze shortcut.plist --json > analysis.json

# Show only warnings
shortcut-genius analyze shortcut.json --warnings-only

# Get fix suggestions
shortcut-genius analyze shortcut.shortcut --fix
```

**Analysis Output:**

```
Shortcut Analysis
──────────────────────────────────────────

Basic Information:
  Name:     My Shortcut
  Actions:  5
  Icon:     ✓

iOS Compatibility:
  Version:   16.0+
  Score:     85

Issues:
  ⚠️ Missing description
  ⚠️ Uses deprecated action

Optimizations:
  1. Combine duplicate actions
     Reduces action count by 2
     Impact: medium

Security:
  ✓ No hardcoded secrets
  ✓ Safe URL patterns

Summary:
  Issues:        2
  Optimizations: 1
  Security:      2/2 ✓
```

---

### `convert` - Convert Shortcut Format

Convert shortcuts between different formats.

```bash
shortcut-genius convert <input> --to <format> [options]
```

**Arguments:**
- `input` (required) - Input shortcut file

**Options:**
- `-t, --to <format>` (required) - Target format: json, plist, shortcut
- `-o, --output <path>` - Output file path

**Examples:**

```bash
# Convert JSON to Plist
shortcut-genius convert input.json --to plist --output output.plist

# Convert Plist to Shortcut
shortcut-genius convert input.plist --to shortcut

# Convert Shortcut to JSON for editing
shortcut-genius convert input.shortcut --to json --output editable.json
```

---

### `test` - Test Shortcut (macOS)

Test a shortcut on macOS before installing on your device.

```bash
shortcut-genius test <file> [options]
```

**Arguments:**
- `file` (required) - Shortcut file to test

**Options:**
- `-v, --verbose` - Show test output
- `-s, --steps` - Show test steps

**Examples:**

```bash
# Basic test
shortcut-genius test my-shortcut.shortcut

# Verbose output
shortcut-genius test my-shortcut.shortcut --verbose

# Show execution steps
shortcut-genius test my-shortcut.shortcut --steps
```

**Requirements:**
- macOS with Shortcuts app
- Automation permissions enabled

---

### `models` - List AI Models

List available AI models from all configured providers.

```bash
shortcut-genius models [options]
```

**Options:**
- `-p, --provider <name>` - Filter by provider
- `-j, --json` - Output as JSON

**Examples:**

```bash
# List all models
shortcut-genius models

# Filter by provider
shortcut-genius models --provider openai

# Output as JSON
shortcut-genius models --json > models.json
```

**Sample Output:**

```
Available AI Models
────────────────────────────────────────

┌─ OPENAI ─────────────────────────────────────────────────────────────┐
│
│  gpt-4o                             GPT-4o                    balanced
│    Max tokens: 128,000
│    Context: 128,000
│  gpt-4o-mini                        GPT-4o Mini                 fast
│    Max tokens: 128,000
│
└───────────────────────────────────────────────────────────────────────┘

┌─ ANTHROPIC ──────────────────────────────────────────────────────────┐
│
│  claude-3-5-sonnet-20241022          Claude 3.5 Sonnet         reasoning
│    Max tokens: 8,192
│    Context: 200,000
│
└───────────────────────────────────────────────────────────────────────┘
```

---

### `providers` - Manage API Providers

Configure and manage AI provider API keys.

```bash
shortcut-genius providers <command>
```

**Commands:**
- `list` - List configured providers
- `configure <provider>` - Configure a provider

**Options for configure:**
- `-k, --key <api-key>` - Set API key
- `--test` - Test connection

**Examples:**

```bash
# List providers
shortcut-genius providers list

# Configure OpenAI
shortcut-genius providers configure openai --key sk-...

# Configure and test
shortcut-genius providers configure anthropic --key sk-ant-... --test
```

---

### `config` - Manage Configuration

View and edit CLI configuration.

```bash
shortcut-genius config <command>
```

**Commands:**
- `get <key>` - Get configuration value
- `set <key> <value>` - Set configuration value
- `list` - List all configuration

**Examples:**

```bash
# List config
shortcut-genius config list

# Get default model
shortcut-genius config get defaultModel

# Set default model
shortcut-genius config set defaultModel gpt-4o

# Set default provider
shortcut-genius config set defaultProvider openai
```

---

## Configuration File

Configuration is stored in `~/.config/shortcut-genius/config.json`:

```json
{
  "defaultModel": "gpt-4o",
  "defaultProvider": "openai",
  "defaultFormat": "shortcut",
  "autoSign": false,
  "serverUrl": "http://localhost:4321"
}
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SHORTCUT_GENIUS_SERVER` | Server URL (default: http://localhost:4321) |
| `SHORTCUT_GENIUS_MODEL` | Default model |
| `SHORTCUT_GENIUS_PROVIDER` | Default provider |

---

## Batch Processing

### Process Multiple Shortcuts

```bash
#!/bin/bash

# Build multiple shortcuts
for name in "timer" "weather" "alarm"; do
  shortcut-genius build "Create a ${name} shortcut" \
    --output "${name}.shortcut"
done
```

### Analyze Directory

```bash
#!/bin/bash

# Analyze all shortcuts in directory
for file in *.shortcut; do
  echo "Analyzing $file..."
  shortcut-genius analyze "$file" --json > "${file%.shortcut}.analysis.json"
done
```

### Convert All Files

```bash
#!/bin/bash

# Convert all JSON to shortcuts
for file in *.json; do
  shortcut-genius convert "$file" --to shortcut \
    --output "${file%.json}.shortcut"
done
```

---

## CI/CD Integration

### GitHub Actions Example

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
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      
      - name: Wait for server
        run: sleep 5
      
      - name: Build shortcuts
        run: |
          shortcut-genius build "Timer shortcut" \
            --output build/timer.shortcut
          shortcut-genius build "Weather shortcut" \
            --output build/weather.shortcut
      
      - name: Test shortcuts
        run: |
          shortcut-genius test build/timer.shortcut
          shortcut-genius test build/weather.shortcut
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v2
        with:
          name: shortcuts
          path: build/*.shortcut
```

---

## Troubleshooting

### "Server not found"

Make sure the ShortcutGenius server is running:

```bash
npm run dev
# or
shortcut-genius server start
```

### "API key not configured"

Configure your provider:

```bash
shortcut-genius providers configure openai --key your-key
```

### "Test failed - not on macOS"

Runtime testing requires macOS. Use `analyze` instead:

```bash
shortcut-genius analyze my-shortcut.shortcut
```

---

## Tips and Tricks

### Use Shell Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc
alias sg='shortcut-genius'
alias sgb='shortcut-genius build'
alias sga='shortcut-genius analyze'
alias sgt='shortcut-genius test'
```

### Pipe Output

```bash
# Get just the action count
shortcut-genius analyze shortcut.json --json | jq '.actions | length'

# Check if shortcut is valid
shortcut-genius analyze shortcut.shortcut --json | jq '.valid'
```

### Makefile Integration

```makefile
.PHONY: build test clean

SHORTCUTS = timer weather alarm

build:
	@for shortcut in $(SHORTCUTS); do \
		shortcut-genius build "Create a $$shortcut shortcut" \
			--output build/$$shortcut.shortcut; \
	done

test:
	@for shortcut in $(SHORTCUTS); do \
		shortcut-genius test build/$$shortcut.shortcut; \
	done

clean:
	rm -rf build/
```
