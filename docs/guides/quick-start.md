# 🚀 Quick Start Guide

Get up and running with ShortcutGenius in less than 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- API keys for OpenAI and/or Anthropic

## Installation

### 1. Clone & Setup
```bash
git clone https://github.com/scrimwiggins/shortcut-genius.git
cd shortcut-genius
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
DATABASE_URL=postgresql://user:pass@localhost:5432/shortcut_genius
```

### 3. Database Setup
```bash
npm run db:push
```

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:5000` and you're ready to go! 🎉

## Your First Shortcut

### Using Natural Language Generation

1. **Open the Application**
   - Navigate to `http://localhost:5000` in your browser

2. **Choose Your AI Model**
   - Select either GPT-4o or Claude 3.5 Sonnet from the model dropdown

3. **Generate a Shortcut**
   - Click the "Generate" button in the toolbar
   - Enter a description like: *"Create a shortcut that shows the weather and sends it via text message"*
   - Click "Generate Shortcut"

4. **Review & Edit**
   - The generated shortcut appears in the Monaco editor
   - Use the preview pane to see the visual representation
   - Edit the JSON directly if needed

5. **Analyze & Optimize**
   - Toggle the analysis pane to see insights
   - Review security recommendations
   - Apply suggested optimizations

6. **Export Your Shortcut**
   - Click "Export" to download the `.shortcut` file
   - Import it into iOS Shortcuts app

## Understanding the Interface

### Three-Pane Layout

| Pane | Purpose | Features |
|------|---------|----------|
| **Editor** | JSON editing | Monaco editor, syntax highlighting, validation |
| **Preview** | Visual representation | Action cards, parameter display |
| **Analysis** | AI insights | Patterns, security, optimizations |

### Toolbar Functions

- **Model Selector**: Choose between GPT-4o and Claude 3.5 Sonnet
- **Import**: Load existing shortcut files
- **Export**: Save shortcuts as `.shortcut` files
- **Generate**: Create shortcuts from natural language
- **Analyze**: Get AI-powered analysis
- **Toggle Analysis**: Show/hide analysis pane

## Example Shortcuts

### Morning Routine
```json
{
  "name": "Good Morning",
  "actions": [
    {
      "type": "set_do_not_disturb",
      "parameters": { "enabled": false }
    },
    {
      "type": "weather",
      "parameters": { "location": "current" }
    },
    {
      "type": "notification",
      "parameters": {
        "title": "Good Morning!",
        "body": "Weather: [Weather Result]"
      }
    }
  ]
}
```

### Productivity Focus
```json
{
  "name": "Focus Mode",
  "actions": [
    {
      "type": "set_do_not_disturb",
      "parameters": { "enabled": true, "duration": 3600 }
    },
    {
      "type": "set_volume",
      "parameters": { "level": 0.3 }
    },
    {
      "type": "notification",
      "parameters": {
        "title": "Focus Mode Active",
        "body": "Distractions blocked for 1 hour"
      }
    }
  ]
}
```

## Next Steps

### Explore Advanced Features
- [Creating Complex Shortcuts](creating-shortcuts.md)
- [Understanding AI Analysis](analysis.md)
- [Security Best Practices](../examples/security.md)

### Join the Community
- ⭐ Star the [GitHub repository](https://github.com/scrimwiggins/shortcut-genius)
- 💬 Join our [Discord server](https://discord.gg/shortcutgenius)
- 🐛 Report issues or suggest features

### Need Help?
- Check the [FAQ](faq.md)
- Browse [examples](../examples/)
- Contact support via Discord

---

Ready to become a shortcut genius? Let's build something amazing! 🔥