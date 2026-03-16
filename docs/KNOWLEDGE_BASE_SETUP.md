# Knowledge Base Setup Guide

This guide helps you set up the iOS Shortcuts Knowledge Base feature for personalized few-shot prompting in ShortcutGenius.

## Overview

The Knowledge Base feature allows you to:
- Import your personal iOS Shortcuts as examples
- Use your shortcuts as context for AI generation
- Get more relevant, personalized shortcut suggestions
- Learn from your existing patterns and integrations

## Prerequisites

1. **macOS** with Shortcuts app installed
2. **iOS device** with shortcuts synced via iCloud
3. **ios-shortcuts skill** installed
4. **ShortcutGenius** running locally

## Step 1: Export Your Shortcuts

### Option A: Export Single Shortcut with Full Actions

```bash
ios-shortcuts export "Shortcut Name" --full --output my-shortcut-full.json
```

**What this exports:**
- Complete action sequences (all identifiers and parameters)
- Variable definitions and usage
- Control flow structures (if/else, loops)
- Third-party integrations (API configs, URLs, etc.)

### Option B: Export All Shortcuts

Currently, export all shortcuts with full action data by exporting each individually:

```bash
# List all shortcuts
ios-shortcuts list --json > shortcuts-list.json

# Then export each shortcut you want
ios-shortcuts export "Shortcut 1" --full --output shortcut1.json
ios-shortcuts export "Shortcut 2" --full --output shortcut2.json
# ... etc
```

### Export Examples

```bash
# Export complex shortcut for reference
ios-shortcuts export "Farm Friend MAC" --full --output farm-friend-full.json

# Export third-party integration shortcut
ios-shortcuts export "Ask Perplexity" --full --output perplexity-integration.json

# Export simple shortcut
ios-shortcuts export "Simple Timer" --full --output timer-full.json
```

## Step 2: Upload to ShortcutGenius

### Upload via Web UI

1. Open ShortcutGenius in your browser
2. Navigate to **Knowledge Base** tab
3. Click **"+ Upload Shortcuts"** button
4. Select the exported JSON file
5. Review the preview
6. Click **"Upload"** to import

### What Gets Imported

- **Action sequences** - Complete flow of your shortcut
- **Parameters** - All configurations (URLs, timeouts, etc.)
- **Variables** - Variable definitions and how they're used
- **Third-party apps** - Which apps are integrated (Perplexity, Grok, Claude, etc.)
- **Complexity score** - Calculated automatically
- **Usage stats** - Run counts from your database

## Step 3: Configure Settings

### Enable Knowledge Base

1. Go to **Settings** (⚙️ icon)
2. Find **"Knowledge Base"** section
3. Toggle **"Use Personal Examples"** to enable

### Configure Example Selection

1. **Max Examples**: Set how many examples AI should reference (3-5 recommended)
2. **Complexity Preference**:
   - `Auto` - AI chooses based on request
   - `Simple` - Reference simple shortcuts (<10 actions)
   - `Medium` - Reference medium shortcuts (10-30 actions)
   - `Complex` - Reference complex shortcuts (30+ actions)
3. **Require Examples Only**: Only use shortcuts flagged as good examples

## Step 4: Manage Your Knowledge Base

### Tag Shortcuts

1. Navigate to **Knowledge Base** tab
2. Click on a shortcut
3. Add tags (e.g., "API integration", "automation", "workflow")
4. Tags help with filtering and selection

### Flag Good Examples

1. Find shortcuts that represent your best practices
2. Click the **⭐** button to mark as example
3. Optionally set quality score (1-10)
4. These shortcuts will be prioritized by AI

### Remove Shortcuts

1. Click the **🗑️** button on a shortcut
2. Confirm deletion
3. Shortcut removed from knowledge base

## Best Practices

### Quality Over Quantity

- Import 10-20 high-quality shortcuts vs. 100 random ones
- Focus on shortcuts that work well and follow your patterns
- Remove outdated or broken shortcuts

### Tag Strategically

Use tags to organize shortcuts:
- **By purpose:** "automation", "api", "ui", "data-processing"
- **By complexity:** "simple", "medium", "complex"
- **By app:** "perplexity", "grok", "claude", "bear"

### Regular Updates

- After creating new shortcuts, export and add to knowledge base
- Update tags as you discover patterns
- Flag new examples as you improve your shortcuts

### Third-Party Integrations

When exporting shortcuts with API integrations:
- **Security:** Check that no API keys are in exported data
- **Endpoints:** Document which API endpoints your shortcuts use
- **Patterns:** Note common integration patterns for reuse

## How It Works

### AI Selection Process

When you request a new shortcut, AI:

1. **Analyzes your request** for complexity and keywords
2. **Searches your knowledge base** for relevant examples
3. **Scores shortcuts** based on:
   - Complexity match (±20% of your preference)
   - Action type overlap
   - Third-party app overlap
   - Flagged as example (bonus points)
   - Usage frequency (bonus points)
4. **Selects top N examples** (based on your Max Examples setting)
5. **Injects examples into context** as few-shot learning
6. **Generates new shortcut** based on patterns from examples

### Example Prompt

```
USER: Create a shortcut that calls Perplexity API with my messages

AI CONTEXT:
USER'S SHORTCUT KNOWLEDGE BASE:
3 shortcuts available for reference.

TOP EXAMPLE SHORTCUTS (similar complexity to current task):
- Ask Perplexity (12 actions)
  Category: API Integration
  Actions: is.workflow.actions.gettext → is.workflow.actions.url → is.workflow.actions.base64encode → is.workflow.actions.setvariable
- Farm Friend MAC (67 actions)
  Category: Complex Automation
  Actions: is.workflow.actions.getcurrentlocation → ...

When generating shortcuts, reference these examples for:
- Similar action patterns and flow
- Parameter values and configurations
- Variable naming and usage
- Complexity and structure guidance
- Integration patterns with external services

AI RESPONSE:
Based on your Ask Perplexity example, here's a new Perplexity API shortcut...
```

## Troubleshooting

### Export Issues

**Problem:** "Shortcut not found"
- **Solution:** Check exact shortcut name (case-sensitive)
- Use `ios-shortcuts list` to see available shortcuts

**Problem:** "Full JSON output requires parsing ZDATA blobs"
- **Solution:** Add `--full` flag to export command

**Problem:** Python/plistlib errors
- **Solution:** Ensure Python 3+ and plistlib are installed
- `pip3 install plistlib` (usually included with Python)

### Upload Issues

**Problem:** "Invalid JSON format"
- **Solution:** Ensure file was exported with `--full` flag
- Check JSON structure should be array of shortcuts

**Problem:** "Validation failed"
- **Solution:** Check each shortcut has required fields:
  - `shortcut_name` (string)
  - `actions` (array)
  - `action_count` (number)
  - `complexity_score` (number)

### AI Not Using Examples

**Problem:** AI generates shortcuts without referencing knowledge base
- **Solution:**
  1. Check that Knowledge Base is enabled in settings
  2. Verify shortcuts are uploaded (check Knowledge Base tab)
  3. Ensure at least one shortcut is flagged as example
  4. Check Max Examples setting (try 3-5)

## Advanced Usage

### Batch Import

For importing multiple shortcuts, create a combined JSON:

```bash
# Export multiple shortcuts
ios-shortcuts export "Shortcut 1" --full --output s1.json
ios-shortcuts export "Shortcut 2" --full --output s2.json
ios-shortcuts export "Shortcut 3" --full --output s3.json

# Combine using jq (JSON processor)
jq -s '.[inputs]' s1.json s2.json s3.json > combined.json

# Upload combined file
```

### API Integration

Direct API upload (for automation):

```bash
curl -X POST http://localhost:4321/api/knowledge-base/upload \
  -H "Content-Type: application/json" \
  -d @combined.json
```

### Selection API

Test example selection manually:

```bash
curl -X POST http://localhost:4321/api/knowledge-base/select \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": "Create a shortcut for Perplexity API",
    "preferredComplexity": "auto",
    "maxExamples": 5
  }'
```

## Support

For issues or questions:
1. Check ShortcutGenius logs for errors
2. Review exported JSON for valid structure
3. Test shortcuts in Shortcuts app before exporting
4. Start with small subset of shortcuts (3-5) to test

Happy shortcut building! 🚀
