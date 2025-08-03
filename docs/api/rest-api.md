# 🔌 REST API Documentation

ShortcutGenius provides a powerful REST API for integrating shortcut generation and analysis into your applications.

## Base URL
```
http://localhost:5000/api
```

## Authentication
Currently, the API operates without authentication in development. Production deployments should implement proper authentication.

## Endpoints

### POST /process

Generate or analyze iOS shortcuts using AI.

#### Request

```http
POST /api/process
Content-Type: application/json
```

```json
{
  "model": "gpt-4o" | "claude-3-5-sonnet-20241022",
  "prompt": "string",
  "type": "generate" | "analyze"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | AI model to use |
| `prompt` | string | Yes | Generation prompt or shortcut to analyze |
| `type` | string | Yes | Operation type |

#### Response

**Success (200)**
```json
{
  "content": "string",
  "localAnalysis": {
    "patterns": [...],
    "dependencies": [...],
    "optimizations": [...],
    "security": [...],
    "permissions": [...]
  }
}
```

**Error (400/422/500)**
```json
{
  "error": "string"
}
```

## Usage Examples

### Generate a Shortcut

```javascript
const response = await fetch('/api/process', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    prompt: 'Create a shortcut that shows good morning notification',
    type: 'generate'
  })
});

const result = await response.json();
console.log(result.content); // Generated shortcut JSON
```

### Analyze a Shortcut

```javascript
const shortcutJSON = {
  "name": "Weather Alert",
  "actions": [
    {
      "type": "weather",
      "parameters": { "location": "current" }
    },
    {
      "type": "notification",
      "parameters": {
        "title": "Weather Update",
        "body": "[Weather Result]"
      }
    }
  ]
};

const response = await fetch('/api/process', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    prompt: JSON.stringify(shortcutJSON),
    type: 'analyze'
  })
});

const analysis = await response.json();
console.log(analysis.localAnalysis);
```

## Response Schemas

### Generation Response
```typescript
interface GenerationResponse {
  content: string; // JSON string of generated shortcut
}
```

### Analysis Response
```typescript
interface AnalysisResponse {
  content: string; // AI analysis as JSON string
  localAnalysis: {
    patterns: Pattern[];
    dependencies: Dependency[];
    optimizations: Optimization[];
    security: SecurityIssue[];
    permissions: Permission[];
  };
}

interface Pattern {
  type: string;
  frequency: number;
  context: string;
}

interface Dependency {
  action: string;
  dependencies: string[];
  dependents: string[];
}

interface Optimization {
  type: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface SecurityIssue {
  type: string;
  risk: 'high' | 'medium' | 'low';
  description: string;
}

interface Permission {
  permission: string;
  required: boolean;
  reason: string;
}
```

## Error Handling

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Missing required fields` | Missing model or prompt |
| 400 | `Invalid model specified` | Unsupported AI model |
| 422 | `Invalid shortcut generated` | Generated content is malformed |
| 422 | `Invalid analysis generated` | Analysis response is malformed |
| 500 | `OpenAI API Error` | Error from OpenAI service |
| 500 | `Claude API Error` | Error from Anthropic service |

### Error Response Format
```json
{
  "error": "Detailed error message"
}
```

## Rate Limiting

Currently no rate limiting is implemented. Consider implementing rate limiting for production use:

- **Development**: No limits
- **Production**: Recommended 100 requests/minute per IP

## Model Capabilities

### GPT-4o
- **Strengths**: Fast generation, good at complex logic
- **Best for**: Quick shortcut generation, simple analysis
- **Response time**: ~1.1s average

### Claude 3.5 Sonnet
- **Strengths**: Detailed analysis, security insights
- **Best for**: In-depth analysis, security auditing  
- **Response time**: ~1.3s average

## SDK Examples

### JavaScript/Node.js
```javascript
class ShortcutGeniusClient {
  constructor(baseUrl = 'http://localhost:5000/api') {
    this.baseUrl = baseUrl;
  }

  async generate(prompt, model = 'gpt-4o') {
    const response = await fetch(`${this.baseUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, type: 'generate' })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }

  async analyze(shortcut, model = 'claude-3-5-sonnet-20241022') {
    const prompt = typeof shortcut === 'object' 
      ? JSON.stringify(shortcut) 
      : shortcut;
      
    const response = await fetch(`${this.baseUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, type: 'analyze' })
    });
    
    return response.json();
  }
}

// Usage
const client = new ShortcutGeniusClient();
const shortcut = await client.generate('Create a timer shortcut');
const analysis = await client.analyze(shortcut.content);
```

### Python
```python
import requests
import json

class ShortcutGeniusClient:
    def __init__(self, base_url="http://localhost:5000/api"):
        self.base_url = base_url
    
    def generate(self, prompt, model="gpt-4o"):
        response = requests.post(f"{self.base_url}/process", json={
            "model": model,
            "prompt": prompt,
            "type": "generate"
        })
        response.raise_for_status()
        return response.json()
    
    def analyze(self, shortcut, model="claude-3-5-sonnet-20241022"):
        prompt = json.dumps(shortcut) if isinstance(shortcut, dict) else shortcut
        response = requests.post(f"{self.base_url}/process", json={
            "model": model,
            "prompt": prompt,
            "type": "analyze"
        })
        return response.json()

# Usage
client = ShortcutGeniusClient()
shortcut = client.generate("Create a weather shortcut")
analysis = client.analyze(shortcut["content"])
```

---

For more examples and advanced usage, check out our [examples directory](../examples/).