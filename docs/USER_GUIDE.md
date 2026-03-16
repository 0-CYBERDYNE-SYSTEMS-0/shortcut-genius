# ShortcutGenius User Guide

Complete guide to using the ShortcutGenius IDE for building iOS Shortcuts with AI.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [The IDE Interface](#the-ide-interface)
3. [Learning from Existing Shortcuts](#learning-from-existing-shortcuts)
4. [Understanding iOS Actions](#understanding-ios-actions)
5. [Building Shortcuts with AI](#building-shortcuts-with-ai)
6. [Using the Conversational Agent](#using-the-conversational-agent)
7. [Web Research & Documentation](#web-research--documentation)
8. [Iterative Development Workflow](#iterative-development-workflow)
9. [Testing Shortcuts](#testing-shortcuts)
10. [Sharing & Gallery](#sharing--gallery)
11. [Model Selection](#model-selection)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Launch

When you first open ShortcutGenius at `http://localhost:4321`, you'll see:

1. **Welcome Screen** - Brief introduction to the IDE
2. **Provider Setup** - Configure your AI providers (OpenAI, Anthropic, OpenRouter)
3. **Sample Shortcuts** - Pre-loaded examples to explore

### Setting Up AI Providers

1. Click the **Settings** icon in the toolbar
2. Select **AI Providers**
3. Enter your API keys:
   - **OpenAI** - For GPT-4o, GPT-4o-mini
   - **Anthropic** - For Claude 3.5 Sonnet
   - **OpenRouter** - For 100+ models including DeepSeek, Llama, Mistral

Your keys are stored locally in `.local/shortcut-genius/` and never sent to our servers.

---

## The IDE Interface

The IDE uses a 3-column tabbed layout:

### Editor Tab

The main workspace for building shortcuts:

- **Monaco Editor** (Left) - Full-featured JSON editor with:
  - Syntax highlighting for iOS Shortcuts
  - Auto-completion for action types
  - Error highlighting
  - Format on save

- **Preview Pane** (Right) - Visual representation of your shortcut:
  - Action flow diagram
  - Parameter inspection
  - Icon and color preview

### AI Chat Tab

Conversational interface for AI assistance:

- **Message History** - Persistent conversation threads
- **Streaming Responses** - Real-time AI output
- **Context Awareness** - AI knows your current shortcut
- **Apply to Editor** - One-click apply AI-generated shortcuts

### Gallery Tab

Community and personal shortcut library:

- **Public Gallery** - Browse community shortcuts
- **My Shortcuts** - Your created shortcuts
- **Search** - Find shortcuts by name or tags
- **QR Codes** - Quick mobile import

---

## Learning from Existing Shortcuts

One of the most powerful ways to learn iOS Shortcuts is by importing and studying existing shortcuts. ShortcutGenius makes this process interactive and educational.

### Importing Shortcuts

You can import shortcuts from multiple sources:

#### 1. From the Public Gallery

1. Navigate to the **Gallery** tab
2. Browse or search for interesting shortcuts
3. Click **Import** on any shortcut
4. The shortcut loads in your Editor with full JSON structure visible

#### 2. From Your Device

1. Export a shortcut from your iPhone/iPad:
   - Open Shortcuts app → Select shortcut → Share → Copy iCloud Link
   - Or export as file and transfer to your computer
2. In ShortcutGenius, go to **File → Import**
3. Paste the iCloud link or upload the `.shortcut` file
4. The IDE automatically converts it to editable JSON

#### 3. From Online Communities

Import from popular shortcut sharing sites:
- RoutineHub
- ShareShortcuts
- Reddit r/shortcuts
- iCloud links from friends

### How Importing Helps You Learn

When you import a shortcut, ShortcutGenius provides:

#### Visual Action Breakdown

```json
{
  "name": "Morning Routine",
  "actions": [
    {
      "type": "get_location",
      "parameters": { "accuracy": "best" }
    },
    {
      "type": "get_weather",
      "parameters": {
        "location": "{location}",
        "forecast": "current"
      }
    },
    {
      "type": "notification",
      "parameters": {
        "title": "Good Morning!",
        "body": "It's {weather.temperature}° and {weather.condition}"
      }
    }
  ]
}
```

The Preview Pane visualizes this as:
```
📍 Get Current Location
    ↓
🌤️ Get Weather at Location
    ↓
🔔 Show Notification
```

#### Action Documentation on Hover

Hover over any action type in the Editor to see:
- **What it does** - Brief description
- **Parameters** - What inputs it accepts
- **Output** - What data it produces
- **Permissions** - What iOS permissions are needed
- **Related actions** - Similar actions you might use

#### Data Flow Visualization

The IDE shows how data flows between actions:

```
[Get Location] → outputs "location" object
                      ↓
              [Get Weather] ← uses "{location}" as input
                      ↓
              outputs "weather" object
                      ↓
              [Show Notification] ← uses "{weather.temperature}"
```

### Studying Imported Shortcuts

#### Step 1: Understand the Structure

Every shortcut has three key parts:

1. **Metadata** - Name, icon, color
2. **Actions** - The steps that execute
3. **Data Flow** - How information passes between actions

#### Step 2: Identify Action Patterns

Common patterns you'll discover:

**Input → Process → Output Pattern:**
```json
[
  { "type": "ask", "parameters": { "prompt": "Enter text" } },
  { "type": "text", "parameters": { "text": "You entered: {input}" } },
  { "type": "share", "parameters": {} }
]
```

**Conditional Logic Pattern:**
```json
[
  { "type": "get_time", "parameters": {} },
  {
    "type": "if",
    "parameters": {
      "condition": "{time.hour} > 12",
      "then": [{ "type": "text", "parameters": { "text": "Afternoon" } }],
      "else": [{ "type": "text", "parameters": { "text": "Morning" } }]
    }
  }
]
```

**API Integration Pattern:**
```json
[
  { "type": "url", "parameters": { "url": "https://api.example.com/data" } },
  { "type": "get_content", "parameters": { "format": "json" } },
  { "type": "text", "parameters": { "text": "Result: {content.value}" } }
]
```

#### Step 3: Experiment with Modifications

Once you understand a shortcut, try:

1. **Changing parameters** - Modify text, numbers, or options
2. **Adding actions** - Insert new steps using the AI chat
3. **Reordering** - Drag actions to change execution order
4. **Removing** - Delete actions to see what breaks

#### Step 4: Use the AI to Explain

Select any imported shortcut and ask the AI:

```
"Explain what this shortcut does step by step"
"What would happen if I removed the 'if' action?"
"How can I make this shortcut run faster?"
"What permissions does this shortcut need?"
```

---

## Understanding iOS Actions

iOS Shortcuts are built from **actions** - discrete units of functionality. Understanding the action library is key to building powerful shortcuts.

### Action Categories

The IDE organizes actions into categories:

| Category | Description | Example Actions |
|----------|-------------|-----------------|
| **Content** | Work with text, numbers, dates | `text`, `number`, `date`, `calculate` |
| **Scripting** | Control flow and logic | `if`, `repeat`, `wait`, `run_shortcut` |
| **Media** | Audio, video, images | `take_photo`, `play_sound`, `record_audio` |
| **Location** | GPS and maps | `get_location`, `get_directions`, `weather` |
| **Web** | URLs and APIs | `url`, `get_content`, `open_app` |
| **Device** | System settings | `set_volume`, `set_brightness`, `vibrate` |
| **Apps** | Interact with apps | `create_note`, `send_message`, `add_reminder` |
| **Files** | File operations | `get_file`, `save_file`, `create_folder` |
| **Health** | HealthKit data | `log_health`, `get_health`, `workout` |
| **Home** | HomeKit devices | `control_devices`, `get_device_state` |

### Action Anatomy

Every action has:

```json
{
  "type": "action_identifier",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**Example - Show Notification:**
```json
{
  "type": "is.workflow.actions.notification",
  "parameters": {
    "WFNotificationActionTitle": "Hello",
    "WFNotificationActionBody": "This is a test",
    "WFNotificationActionSound": true
  }
}
```

### Learning Actions Through the IDE

#### 1. Action Database

ShortcutGenius includes a comprehensive action database with 25+ documented actions:

```typescript
// Example action definition
{
  identifier: "is.workflow.actions.notification",
  name: "Show Notification",
  description: "Displays a notification with title and body",
  category: "notification",
  parameters: [
    {
      key: "WFNotificationActionTitle",
      type: "string",
      description: "Notification title",
      required: false,
      defaultValue: "Shortcut"
    },
    {
      key: "WFNotificationActionBody",
      type: "string",
      description: "Notification message",
      required: true
    }
  ],
  permissions: "notification",
  relatedActions: ["speak", "show_result"]
}
```

#### 2. Auto-Completion

As you type in the Monaco Editor:

- Type `"type": "` and see all available actions
- Type `"parameters": {` and see required/optional fields
- Get instant validation if parameters are incorrect

#### 3. Parameter Validation

The IDE validates parameters in real-time:

```json
// ❌ Invalid - missing required body
{
  "type": "notification",
  "parameters": {
    "title": "Hello"
  }
}

// ✅ Valid
{
  "type": "notification",
  "parameters": {
    "title": "Hello",
    "body": "World!"
  }
}
```

#### 4. Permission Indicators

Actions show permission requirements:

- 🔴 **Red dot** - Requires permission (camera, location, etc.)
- 🟡 **Yellow dot** - Optional permission
- 🟢 **Green dot** - No permission needed

Hover to see exactly what iOS permission is required.

### Common Action Patterns

#### Getting User Input

```json
[
  {
    "type": "ask",
    "parameters": {
      "prompt": "What's your name?",
      "inputType": "text"
    }
  },
  {
    "type": "text",
    "parameters": {
      "text": "Hello, {input}!"
    }
  }
]
```

#### Working with Variables

```json
[
  {
    "type": "get_time",
    "parameters": {}
  },
  {
    "type": "text",
    "parameters": {
      "text": "Current time: {time}"
    }
  }
]
```

#### Conditional Logic

```json
[
  {
    "type": "get_battery",
    "parameters": {}
  },
  {
    "type": "if",
    "parameters": {
      "condition": "{battery.level} < 20",
      "then": [
        {
          "type": "notification",
          "parameters": {
            "title": "Low Battery",
            "body": "Charge your device!"
          }
        }
      ],
      "else": [
        {
          "type": "notification",
          "parameters": {
            "title": "Battery OK",
            "body": "You have {battery.level}% remaining"
          }
        }
      ]
    }
  }
]
```

#### Looping

```json
[
  {
    "type": "repeat",
    "parameters": {
      "count": 5,
      "actions": [
        {
          "type": "notification",
          "parameters": {
            "body": "Iteration {index}"
          }
        },
        {
          "type": "wait",
          "parameters": { "seconds": 1 }
        }
      ]
    }
  }
]
```

---

## Building Shortcuts with AI

### Method 1: Natural Language Description

1. Switch to the **AI Chat** tab
2. Type your request:
   ```
   "Create a shortcut that checks the weather and sends me a notification if it's going to rain"
   ```
3. The AI will:
   - Search for weather API documentation
   - Create the shortcut structure
   - Validate against iOS compatibility
   - Present the result

4. Click **Apply to Editor** to load the shortcut

### Method 2: Iterative Refinement

Start with a basic description and refine:

```
User: "Create a timer shortcut"
AI: [Generates basic timer]

User: "Add a notification when the timer completes"
AI: [Adds notification action]

User: "Make it 5 minutes by default"
AI: [Sets default duration]
```

### Method 3: Import and Modify

1. Import an existing shortcut (File → Import)
2. Ask the AI to modify it:
   ```
   "Add a condition to only run this on weekdays"
   ```

---

## Using the Conversational Agent

The Agentic AI is the most powerful way to build shortcuts. Unlike simple text generation, it's a stateful system that researches, validates, and iterates.

### How the Agent Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Agentic Loop                             │
│                                                             │
│  1. READ scratchpad → What do I know?                       │
│           ↓                                                 │
│  2. REASON → What should I do next?                         │
│           ↓                                                 │
│  3. SELECT TOOL → web_search / create_action / validate     │
│           ↓                                                 │
│  4. EXECUTE → Perform the action                            │
│           ↓                                                 │
│  5. WRITE scratchpad → Store results                        │
│           ↓                                                 │
│  6. DECISION → Done? Or loop again?                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1. Researches Real APIs

When you mention external services, the agent automatically searches for real API documentation:

```
User: "Create a shortcut using Gemini for image generation"

Agent Actions:
→ Search: "Gemini image generation API documentation"
→ Extract: Endpoint URLs, authentication, parameters
→ Build: Shortcut with real API configuration
```

**Real Example:**

```
Iteration 1:
  scratchpad_write: "Need to find Gemini 2.5 Flash API docs"
  web_search: "gemini 2.5 flash image generation API documentation"

Iteration 2:
  scratchpad_write: "Found endpoint: https://generativelanguage.googleapis.com/..."
  web_extract: Get detailed API parameters

Iteration 3:
  scratchpad_write: "Needs API key in header, accepts image/prompt"
  create_shortcut_action: Create actions with REAL URLs

Iteration 4:
  validate_shortcut: Check for placeholders
  Result: "Valid! No placeholders found"

Iteration 5:
  finalize: Return completed shortcut
```

### 2. Validates Results

The agent validates shortcuts before presenting them:

- **Placeholder Detection** - Catches example.com, placeholder values
- **Parameter Validation** - Ensures required fields are present
- **iOS Compatibility** - Checks action availability

**Validation Checks:**

```typescript
// Placeholder detection
const placeholderPatterns = [
  'example.com',
  'api.example',
  'placeholder',
  'your-api-key',
  'your-endpoint',
  '{api_key}',
  '{endpoint}'
];

// Parameter validation
if (action.type === 'notification' && !action.parameters.body) {
  errors.push('Notification requires body parameter');
}
```

### 3. Iterates Until Perfect

If validation fails, the agent automatically retries:

```
Iteration 1: Create initial shortcut
Iteration 2: Validation finds placeholder URL
Iteration 3: Search for real API endpoint
Iteration 4: Update with real URL
Iteration 5: Validation passes → Finalize
```

**Maximum Iterations:** 15-20 (configurable)

**Confidence Threshold:** 90% (must be exceeded to finalize)

### Agent Tools

The agent has access to these tools:

| Tool | Purpose | When Used |
|------|---------|-----------|
| `scratchpad_write` | Store research findings | After web search, before creating actions |
| `scratchpad_read` | Retrieve stored information | At start of each iteration |
| `web_search` | Search for API documentation | When external APIs mentioned |
| `web_extract` | Extract content from documentation URLs | After finding relevant docs |
| `create_shortcut_action` | Build shortcut actions | After gathering all requirements |
| `validate_shortcut` | Check for errors | Before finalizing |
| `finalize` | Complete the shortcut | When confidence > 90% |

### Agent Memory (Scratchpad)

The scratchpad persists across iterations:

```json
{
  "searchQueries": ["gemini api docs", "gemini auth"],
  "findings": {
    "endpoint": "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
    "auth": "Bearer token in Authorization header",
    "params": ["prompt", "temperature", "maxOutputTokens"]
  },
  "currentShortcut": { ... },
  "confidence": 95
}
```

---

## Web Research & Documentation

One of ShortcutGenius's most powerful features is automatic web research. The AI doesn't just guess—it searches for real documentation.

### How Web Research Works

#### 1. Triggering Research

The agent automatically researches when you mention:

- **Service names** - "Gemini", "OpenAI", "Weather API"
- **API keywords** - "endpoint", "REST API", "HTTP request"
- **Integration requests** - "Connect to X service"

#### 2. Search Process

```
User: "Create a shortcut that gets weather from OpenWeatherMap"

Agent:
1. Detects external API mention
2. Calls web_search: "OpenWeatherMap API documentation endpoint"
3. Receives search results
4. Calls web_extract on most relevant URL
5. Extracts: endpoint URL, auth method, parameters
6. Stores in scratchpad
7. Creates shortcut with REAL API configuration
```

#### 3. Search Providers

The IDE supports multiple search providers:

| Provider | Best For | Setup |
|----------|----------|-------|
| **Tavily** | AI-optimized search | `TAVILY_API_KEY` |
| **Serper** | Google Search API | `SERPER_API_KEY` |
| **Brave** | Privacy-focused | `BRAVE_API_KEY` |
| **DuckDuckGo** | Free, no API key | Default |

#### 4. Research Example: Weather API

**User Request:**
```
"Create a shortcut that gets current weather and shows a notification"
```

**Agent Research:**
```
web_search: "free weather API no key required documentation"
→ Finds Open-Meteo API

web_extract: "https://open-meteo.com/en/docs"
→ Extracts:
   - Endpoint: https://api.open-meteo.com/v1/forecast
   - Parameters: latitude, longitude, current_weather
   - Response format: JSON with temperature, windspeed

scratchpad_write: {
  "api": "Open-Meteo",
  "endpoint": "https://api.open-meteo.com/v1/forecast",
  "params": ["latitude", "longitude", "current_weather=true"],
  "responsePath": "current_weather.temperature"
}
```

**Resulting Shortcut:**
```json
{
  "name": "Weather Notification",
  "actions": [
    { "type": "get_location", "parameters": {} },
    {
      "type": "url",
      "parameters": {
        "url": "https://api.open-meteo.com/v1/forecast?latitude={location.latitude}&longitude={location.longitude}&current_weather=true"
      }
    },
    { "type": "get_content", "parameters": { "format": "json" } },
    {
      "type": "notification",
      "parameters": {
        "title": "Current Weather",
        "body": "It's {content.current_weather.temperature}°C outside"
      }
    }
  ]
}
```

### Manual Web Search

You can also trigger searches manually:

```
"Search for the latest Twitter/X API documentation"
"Find the Stripe API reference for creating payments"
"Look up the OpenAI GPT-4 vision API parameters"
```

The agent will:
1. Perform the search
2. Show you the findings
3. Ask if you want to use them in a shortcut

---

## Iterative Development Workflow

Building great shortcuts is iterative. ShortcutGenius supports rapid iteration with testing and refinement.

### The Iteration Loop

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Design    │ → │    Build    │ → │    Test     │
│  (AI Chat)  │    │   (Editor)  │    │  (Runtime)  │
└─────────────┘    └─────────────┘    └──────┬──────┘
       ↑                                      │
       └────────────── Refine ←───────────────┘
```

### Step-by-Step Workflow

#### 1. Initial Design (AI Chat)

Start with a natural language description:

```
User: "I want a shortcut that tracks my water intake"

AI: "I'll create a water tracking shortcut that:
     1. Asks how much water you drank
     2. Logs it to Apple Health
     3. Shows your daily total
     4. Sends a reminder if you haven't logged in 2 hours"
```

#### 2. Review and Build (Editor)

The AI generates the initial shortcut:

```json
{
  "name": "Water Tracker",
  "actions": [
    {
      "type": "ask",
      "parameters": {
        "prompt": "How much water did you drink (in oz)?",
        "inputType": "number"
      }
    },
    {
      "type": "log_health",
      "parameters": {
        "type": "water",
        "value": "{input}",
        "unit": "oz"
      }
    },
    {
      "type": "notification",
      "parameters": {
        "title": "Water Logged",
        "body": "Logged {input} oz of water"
      }
    }
  ]
}
```

Review in the Editor:
- Check the action flow in Preview Pane
- Verify parameters
- Adjust as needed

#### 3. Test Runtime (Test Tab)

Click **Test Runtime**:

```
✓ Import successful
✓ Execution: 1.2s
✓ Output: "Water Logged"
⚠️ Warning: Health permission required
```

#### 4. Refine Based on Results

**If test passes:**
- Download the shortcut
- Install on your device

**If test fails:**
```
❌ Failed - Runtime Error
   Stage: run
   Action: log_health
   Error: Health data access denied
```

Share the error with the AI:
```
User: "The test failed with 'Health data access denied'"

AI: "The shortcut needs HealthKit permission. I'll add a check
     at the beginning to request permission before logging."
```

#### 5. Iterate

The AI updates the shortcut:

```json
{
  "actions": [
    {
      "type": "request_permission",
      "parameters": { "type": "health" }
    },
    // ... rest of actions
  ]
}
```

Test again → Refine → Repeat until perfect.

### Iteration Strategies

#### A/B Testing Variations

Create multiple versions and compare:

```
User: "Create two versions:
       Version A: Simple notification after logging
       Version B: Shows daily progress chart"
```

#### Incremental Complexity

Start simple, add features:

```
Iteration 1: Basic water logging
Iteration 2: Add daily total display
Iteration 3: Add reminder notifications
Iteration 4: Add weekly summary
Iteration 5: Add Siri integration
```

#### Error-Driven Improvement

Let real errors guide development:

```
Test 1: "URL malformed" → Fix URL construction
Test 2: "JSON parse error" → Fix response handling
Test 3: "Timeout" → Add error handling
Test 4: Success!
```

### Collaboration with AI

#### Asking for Explanations

```
"Why did you use 'get_content' instead of 'url'?"
"What does the '{input}' syntax mean?"
"How does the HealthKit permission work?"
```

#### Requesting Alternatives

```
"Show me 3 different ways to implement this"
"What's a simpler version of this shortcut?"
"How would you optimize this for speed?"
```

#### Debugging Together

```
User: "The shortcut runs but doesn't show the notification"

AI: "Let me check... The notification action looks correct.
     Let's add a 'text' action before it to debug:
     
     { 'type': 'text', 'parameters': { 'text': 'Debug: {variable}' } }
     
     Run the test again and tell me what the debug shows."
```

---

## Testing Shortcuts

### Prerequisites

Runtime testing requires macOS with Shortcuts app enabled.

### Running Tests

1. Build or load a shortcut in the Editor
2. Click the **Test** tab
3. Click **Test Runtime**

The system will:
1. Import the shortcut to Shortcuts app
2. Execute it
3. Capture output
4. Clean up (delete test shortcut)

### Test Results

Results show:

- **Success/Failure** - Overall test status
- **Execution Time** - How long the shortcut ran
- **Output** - Any text or JSON output
- **Errors** - Specific error messages with action context
- **Warnings** - Permission requirements, compatibility issues

### Interpreting Errors

```
❌ Failed - Runtime Error
   Stage: run
   Action Index: 2
   Action Type: GetWeather
   Error: Location permission denied

→ Fix: Enable location access in System Preferences
```

---

## Sharing & Gallery

### Sharing a Shortcut

1. Open your shortcut in the Editor
2. Click **Share** in the toolbar
3. Choose visibility:
   - **Public** - Appears in gallery
   - **Unlisted** - Only accessible via link
   - **Private** - Only you can access

4. Copy the share link or download the QR code

### Gallery Features

- **Browse** - Discover shortcuts by category
- **Search** - Find by name, description, or tags
- **Preview** - See shortcut details before downloading
- **Stats** - View download counts

### Importing from Gallery

1. Find a shortcut in the Gallery
2. Click **Import**
3. The shortcut loads in your Editor
4. Modify as needed

---

## Model Selection

### Choosing the Right Model

| Use Case | Recommended Model | Why |
|----------|------------------|-----|
| General shortcuts | GPT-4o | Balanced speed/quality |
| Complex logic | Claude 3.5 Sonnet | Excellent reasoning |
| Fast iteration | GPT-4o-mini | Quick responses |
| API integrations | DeepSeek | Good at code |
| Budget-conscious | Llama 3 | Free via OpenRouter |

### Model Categories

Models are categorized by capability:

- **Fast** - Quick responses, good for simple shortcuts
- **Balanced** - Good quality with reasonable speed
- **Reasoning** - Complex logic and multi-step shortcuts
- **Coding** - Best for API integrations

### Switching Models

1. Click the **Model** dropdown in the toolbar
2. Select a provider (OpenAI, Anthropic, OpenRouter)
3. Choose a specific model
4. New chats use the selected model

---

## Troubleshooting

### Common Issues

#### "No AI providers configured"

**Solution**: Add API keys in Settings → AI Providers

#### "Shortcut validation failed"

**Causes**:
- Invalid action type
- Missing required parameters
- Placeholder URLs

**Solution**: Check the Editor for error highlighting, or ask the AI to fix it

#### "Test failed - Import error"

**Causes**:
- Invalid shortcut format
- Missing required fields

**Solution**: Ensure shortcut has `name` and `actions` array

#### "Web search not returning results"

**Causes**:
- No search provider configured
- API key invalid

**Solution**: Add Tavily, Serper, or Brave API key in Settings

#### "Chat not loading"

**Causes**:
- Database not running
- Connection error

**Solution**: 
- Start PostgreSQL: `docker compose up -d`
- Or use memory mode: `CONVERSATION_STORE_MODE=memory npm run dev`

### Getting Help

1. **Check Documentation** - This guide and other docs in `/docs`
2. **Review Logs** - Check browser console and server logs
3. **Test API Keys** - Use Settings → Test Connection
4. **File an Issue** - Report bugs on GitHub (not for security issues)

### Performance Tips

- **Use caching** - AI responses are cached by default
- **Choose faster models** - GPT-4o-mini for quick iterations
- **Limit conversation history** - Long threads use more tokens
- **Close unused tabs** - Reduces memory usage

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + S` | Save shortcut |
| `Ctrl/Cmd + Enter` | Send chat message |
| `Shift + Enter` | New line in chat |
| `Ctrl/Cmd + 1` | Switch to Editor tab |
| `Ctrl/Cmd + 2` | Switch to AI Chat tab |
| `Ctrl/Cmd + 3` | Switch to Gallery tab |

---

## Next Steps

- Explore [example shortcuts](../examples/)
- Read the [API Reference](API_REFERENCE.md) for programmatic access
- Check out the [CLI Guide](CLI_GUIDE.md) for command-line usage
- Learn about [advanced features](FEATURES.md)
