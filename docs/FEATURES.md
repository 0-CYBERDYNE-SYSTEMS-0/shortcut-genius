# ShortcutGenius Features

A comprehensive guide to ShortcutGenius capabilities, from action learning to AI-powered development.

---

## Table of Contents

1. [Learning from Shortcuts](#learning-from-shortcuts)
2. [Action Library](#action-library)
3. [AI-Powered Development](#ai-powered-development)
4. [Web Research Capabilities](#web-research-capabilities)
5. [Iterative Testing](#iterative-testing)
6. [Integration Ecosystem](#integration-ecosystem)

---

## Learning from Shortcuts

### Import and Learn Workflow

ShortcutGenius transforms shortcut discovery into an educational experience:

#### Import Sources

| Source | How to Import | What You Learn |
|--------|---------------|----------------|
| **Public Gallery** | Click "Import" on any shortcut | Community best practices |
| **iCloud Links** | Paste link in File → Import | Real-world implementations |
| **Shortcut Files** | Upload `.shortcut` files | Device-exported shortcuts |
| **Online Communities** | Import from RoutineHub, Reddit | Diverse use cases |

#### Interactive Learning Features

**1. Visual Action Flow**

When you import a shortcut, the IDE visualizes the execution flow:

```
Imported: "Morning Routine"

📍 Get Current Location
    ↓
🌤️ Get Weather at Location
    ↓ (weather data)
📊 Calculate Commute Time
    ↓
🔔 Show Morning Briefing
    ↓
🎵 Play Morning Playlist
```

**2. Parameter Inspection**

Click any action to see:
- What parameters are used
- What values are passed
- How variables flow between actions

**3. Modification Playground**

Try changes safely:
- Modify parameters and see instant preview
- Add/remove actions with AI assistance
- Test variations without breaking the original

**4. AI Explanation**

Ask the AI to explain any imported shortcut:

```
User: "Explain what this shortcut does"
AI: "This morning routine shortcut:
    1. Gets your current GPS location
    2. Fetches weather for that location
    3. Calculates commute time based on traffic
    4. Shows a notification with weather + commute info
    5. Starts your morning playlist
    
    The data flows: Location → Weather API → 
    Commute Calculator → Notification"
```

### Building Your Action Vocabulary

As you import and study shortcuts, you'll build intuition for:

**Common Patterns:**
- Input → Process → Output
- Trigger → Condition → Action
- API Request → Parse → Display

**Data Types:**
- Text, Numbers, Dates, Locations
- Images, Audio, Files
- JSON objects from APIs

**Control Flow:**
- If/Else conditions
- Repeat loops
- Error handling

---

## Action Library

### Understanding iOS Actions

iOS Shortcuts are composed of **actions** - discrete units of functionality. ShortcutGenius provides comprehensive tools for learning and using actions.

### Action Categories

| Category | Actions | Use Cases |
|----------|---------|-----------|
| **Content** | Text, Number, Date, Calculate | Data manipulation |
| **Scripting** | If, Repeat, Wait, Run Shortcut | Control flow |
| **Media** | Take Photo, Play Sound, Record | Audio/Visual |
| **Location** | Get Location, Weather, Directions | GPS services |
| **Web** | URL, Get Content, Open App | Internet/APIs |
| **Device** | Volume, Brightness, Vibrate | System control |
| **Apps** | Notes, Messages, Calendar | App integration |
| **Files** | Get File, Save File, Create Folder | File management |
| **Health** | Log Health, Get Health, Workout | HealthKit |
| **Home** | Control Devices, Get Device State | HomeKit |

### Action Anatomy

Every action follows this structure:

```json
{
  "type": "action.identifier",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**Real Example - Show Notification:**
```json
{
  "type": "is.workflow.actions.notification",
  "parameters": {
    "WFNotificationActionTitle": "Hello",
    "WFNotificationActionBody": "This is your notification",
    "WFNotificationActionSound": true
  }
}
```

### Learning Actions Through the IDE

#### 1. Action Database

ShortcutGenius includes a database of 25+ documented actions:

```typescript
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

#### 2. IntelliSense in Editor

The Monaco Editor provides:
- Auto-completion for action types
- Parameter suggestions
- Real-time validation
- Error highlighting

#### 3. Permission Indicators

Each action shows required permissions:
- 🔴 Requires permission (camera, location, etc.)
- 🟡 Optional permission
- 🟢 No permission needed

### Common Action Patterns

#### Input Collection
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

#### API Integration
```json
[
  {
    "type": "url",
    "parameters": {
      "url": "https://api.example.com/data"
    }
  },
  {
    "type": "get_content",
    "parameters": { "format": "json" }
  },
  {
    "type": "text",
    "parameters": {
      "text": "Result: {content.value}"
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

---

## AI-Powered Development

### The Conversational Agent

ShortcutGenius features a stateful AI agent that goes beyond simple text generation.

### Agent Architecture

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

### Agent Capabilities

#### 1. Web Research

When you mention external services, the agent automatically searches for real API documentation.

**Example:**
```
User: "Create a shortcut using Gemini for image generation"

Agent:
1. Detects external API mention
2. Searches: "Gemini image generation API documentation"
3. Extracts: Endpoint URL, auth method, parameters
4. Creates shortcut with REAL API configuration
5. Validates no placeholders exist
6. Returns working shortcut
```

#### 2. Multi-Turn Iteration

The agent iterates up to 15-20 times to perfect shortcuts:

```
Iteration 1: Create initial shortcut
Iteration 2: Validation finds placeholder URL
Iteration 3: Search for real API endpoint
Iteration 4: Update with real URL
Iteration 5: Validation passes → Finalize
```

#### 3. Validation & Quality Assurance

Before finalizing, the agent validates:
- **Placeholder Detection** - Catches example.com, placeholder values
- **Parameter Validation** - Ensures required fields are present
- **iOS Compatibility** - Checks action availability
- **Confidence Scoring** - Only finalizes when >90% confident

### Agent Tools

| Tool | Purpose |
|------|---------|
| `web_search` | Search for API documentation |
| `web_extract` | Extract content from documentation URLs |
| `scratchpad_write` | Store research findings |
| `scratchpad_read` | Retrieve stored information |
| `create_shortcut_action` | Build shortcut actions |
| `validate_shortcut` | Check for errors |
| `finalize` | Complete the shortcut |

### Prompt Engineering Tips

#### Be Specific
```
Good: "Create a shortcut that sends my location to my emergency contact via Messages"
Bad: "Make a location shortcut"
```

#### Mention APIs Explicitly
```
Good: "Using the OpenWeatherMap API, create a weather shortcut"
Bad: "Create a weather shortcut"
```

#### Specify Output Format
```
Good: "Create a shortcut that outputs JSON with temperature and humidity"
Bad: "Create a weather data shortcut"
```

#### Include Error Handling
```
Good: "Create a shortcut with error handling if the API fails"
Bad: "Create an API shortcut"
```

---

## Web Research Capabilities

### Automatic Documentation Search

The AI doesn't guess API parameters—it searches for real documentation.

### How It Works

#### 1. Detection

The agent detects when research is needed:
- Service names (Gemini, OpenAI, Stripe)
- API keywords (endpoint, REST, HTTP)
- Integration requests

#### 2. Search Execution

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

| Provider | Best For | Setup |
|----------|----------|-------|
| **Tavily** | AI-optimized search | `TAVILY_API_KEY` |
| **Serper** | Google Search API | `SERPER_API_KEY` |
| **Brave** | Privacy-focused | `BRAVE_API_KEY` |
| **DuckDuckGo** | Free, no API key | Default |

### Research Example

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

**Result:**
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

---

## Iterative Testing

### The Development Loop

```
Design → Build → Test → Refine → Repeat
```

### Runtime Testing (macOS)

Test shortcuts on real hardware before installing on your device.

#### Test Process

1. **Import** - Load shortcut into macOS Shortcuts app
2. **Execute** - Run the shortcut
3. **Capture** - Record output and errors
4. **Cleanup** - Remove test shortcut

#### Test Results

```json
{
  "success": true,
  "executionTime": 1250,
  "actionCount": 3,
  "output": "Timer completed",
  "errors": [],
  "warnings": ["Requires notification permission"]
}
```

### Iteration Strategies

#### Error-Driven Development

Let real errors guide improvements:

```
Test 1: "URL malformed" → Fix URL construction
Test 2: "JSON parse error" → Fix response handling
Test 3: "Timeout" → Add error handling
Test 4: Success!
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

#### A/B Testing

Create variations and compare:

```
User: "Create two versions:
       Version A: Simple notification after logging
       Version B: Shows daily progress chart"
```

### Collaboration with AI

#### Debugging Together

```
User: "The shortcut runs but doesn't show the notification"

AI: "Let me check... The notification action looks correct.
     Let's add a 'text' action before it to debug:
     
     { 'type': 'text', 'parameters': { 'text': 'Debug: {variable}' } }
     
     Run the test again and tell me what the debug shows."
```

#### Requesting Alternatives

```
"Show me 3 different ways to implement this"
"What's a simpler version of this shortcut?"
"How would you optimize this for speed?"
```

---

## Integration Ecosystem

### AI Model Support

Choose from 100+ models via multiple providers:

| Provider | Models | Best For |
|----------|--------|----------|
| OpenAI | GPT-4o, GPT-4o-mini | General purpose |
| Anthropic | Claude 3.5 Sonnet | Complex reasoning |
| OpenRouter | 100+ models | Variety, experimentation |
| Zai | GLM-4.7, GLM-4.6 | Chinese language |
| MiniMax | MiniMax-M2.5 | Long context |
| Moonshot | Kimi K2.5 | Coding tasks |

### Web Search Providers

| Provider | Type | Setup |
|----------|------|-------|
| Tavily | AI Search | API Key |
| Serper | Google Search | API Key |
| Brave | Privacy Search | API Key |
| DuckDuckGo | Anonymous | None |

### Database Options

| Option | Use Case | Setup |
|--------|----------|-------|
| PostgreSQL | Production | `DATABASE_URL` |
| Memory | Development | `CONVERSATION_STORE_MODE=memory` |
| None | Simple | `NO_STORAGE_MODE=true` |

### Export Formats

| Format | Extension | Use Case |
|--------|-----------|----------|
| iOS Shortcut | `.shortcut` | Install on device |
| Plist | `.plist` | Edit in other tools |
| JSON | `.json` | Version control, sharing |

---

## Feature Summary

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Import & Learn** | Import shortcuts from any source | Learn from community |
| **Action Database** | 25+ documented actions | Understand capabilities |
| **Visual Flow** | See action execution flow | Debug and optimize |
| **AI Agent** | Stateful multi-turn agent | Complex shortcut building |
| **Web Research** | Auto API documentation search | Real integrations |
| **Runtime Testing** | Test on macOS before device | Catch errors early |
| **Iterative Refinement** | AI-assisted debugging | Perfect shortcuts |
| **Multi-Model** | 100+ AI models | Choose best for task |
| **Sharing** | Gallery, QR codes, exports | Community collaboration |
