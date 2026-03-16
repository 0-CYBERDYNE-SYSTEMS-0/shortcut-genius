# ShortcutGenius API Reference

Complete REST API documentation for ShortcutGenius.

---

## Base URL

```
http://localhost:4321/api
```

## Authentication

Most endpoints do not require authentication (designed for local use). API keys are configured server-side in `.env`.

---

## AI Processing

### Generate Shortcut

Generate a shortcut using AI.

```http
POST /api/process
```

**Request Body:**

```json
{
  "model": "gpt-4o",
  "prompt": "Create a timer shortcut with notification",
  "type": "generate",
  "reasoningOptions": {
    "enabled": true,
    "level": "medium"
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | AI model ID |
| `prompt` | string | Yes | Description of shortcut to create |
| `type` | string | Yes | `"generate"` or `"analyze"` |
| `reasoningOptions` | object | No | Reasoning token settings |

**Response:**

```json
{
  "shortcut": {
    "name": "Timer with Notification",
    "actions": [...],
    "icon": "timer",
    "color": "#FF9500"
  },
  "analysis": {
    "compatibility": {...},
    "optimizations": [...]
  }
}
```

### Agentic Generation

Use the stateful agent for complex shortcuts with web search.

```http
POST /api/agentic/generate
```

**Request Body:**

```json
{
  "prompt": "Create a shortcut using Gemini for image generation",
  "model": "anthropic/claude-3.5-sonnet",
  "maxIterations": 15
}
```

**Response:**

```json
{
  "shortcut": {...},
  "metadata": {
    "mode": "agentic",
    "iterations": 5,
    "searchesPerformed": 2,
    "confidence": 95,
    "summary": "Created shortcut that integrates with Gemini API..."
  }
}
```

---

## Shortcut Building

### Build Shortcut File

Convert JSON shortcut to `.shortcut` or `.plist` format.

```http
POST /api/shortcuts/build
```

**Request Body:**

```json
{
  "shortcut": {
    "name": "My Shortcut",
    "actions": [...]
  },
  "format": "shortcut",
  "sign": true
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shortcut` | object | Yes | Shortcut JSON structure |
| `format` | string | No | `"shortcut"`, `"plist"`, or `"json"` (default: `"shortcut"`) |
| `sign` | boolean | No | Sign the shortcut file (default: `false`) |

**Response:** Binary file or JSON:

```json
{
  "content": "<base64-encoded-file>",
  "filename": "My-Shortcut.shortcut",
  "format": "shortcut"
}
```

### Check Signing Capability

```http
GET /api/shortcuts/signing-info
```

**Response:**

```json
{
  "canSign": true,
  "platform": "darwin",
  "version": "14.0"
}
```

### Sign Shortcut

```http
POST /api/shortcuts/sign
```

**Request Body:**

```json
{
  "shortcutData": "<base64-encoded-shortcut>",
  "format": "shortcut"
}
```

---

## Shortcut Testing

### Check Test Capability

```http
GET /api/shortcuts/test/capability
```

**Response:**

```json
{
  "available": true,
  "platform": "darwin",
  "version": "14.0",
  "permissions": ["automation", "shortcuts"]
}
```

### Run Runtime Test

```http
POST /api/shortcuts/test/runtime
```

**Request Body:**

```json
{
  "shortcut": {
    "name": "Test Shortcut",
    "actions": [...]
  },
  "timeout": 30000
}
```

**Response:**

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

### Cleanup Test Shortcuts

```http
POST /api/shortcuts/test/cleanup
```

**Response:**

```json
{
  "cleaned": 5,
  "errors": []
}
```

---

## Sharing

### Create Share

```http
POST /api/shortcuts/share
```

**Request Body:**

```json
{
  "shortcut": {...},
  "visibility": "public",
  "tags": ["productivity", "timer"]
}
```

**Response:**

```json
{
  "id": "abc123",
  "url": "http://localhost:4321/share/abc123",
  "qrUrl": "/api/qr/abc123"
}
```

### Get Share

```http
GET /api/shortcuts/share/:id
```

**Response:**

```json
{
  "id": "abc123",
  "name": "Timer Shortcut",
  "shortcut": {...},
  "metadata": {
    "createdAt": "2024-01-15T10:30:00Z",
    "downloads": 42
  }
}
```

### Download Shared Shortcut

```http
GET /api/shortcuts/download/:id
```

Returns the `.shortcut` file directly.

### Get QR Code

```http
GET /api/qr/:id
```

Returns PNG image.

### List Public Shortcuts

```http
GET /api/shortcuts/public?page=1&limit=20
```

**Response:**

```json
{
  "shortcuts": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### Search Shortcuts

```http
GET /api/shortcuts/search?q=timer&tags=productivity
```

---

## Models

### List OpenRouter Models

```http
GET /api/models/openrouter
```

**Response:**

```json
{
  "models": [
    {
      "id": "anthropic/claude-3.5-sonnet",
      "name": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "capabilities": {
        "maxTokens": 8192,
        "contextWindow": 200000
      }
    }
  ]
}
```

### Search Models

```http
GET /api/models/openrouter/search?q=claude
```

### Get Model Details

```http
GET /api/models/openrouter/:modelId
```

---

## Web Search

### Perform Search

```http
POST /api/search
```

**Request Body:**

```json
{
  "query": "iOS Shortcuts API documentation",
  "searchType": "api_docs"
}
```

**Response:**

```json
{
  "results": [
    {
      "title": "Shortcuts API Documentation",
      "url": "https://developer.apple.com/...",
      "snippet": "..."
    }
  ]
}
```

### Extract URL Content

```http
POST /api/test/extract
```

**Request Body:**

```json
{
  "url": "https://api.example.com/docs"
}
```

### Crawl Website

```http
POST /api/test/crawl
```

**Request Body:**

```json
{
  "url": "https://api.example.com",
  "maxPages": 5
}
```

---

## Conversations

### Create Conversation

```http
POST /api/conversations/create
```

**Request Body:**

```json
{
  "title": "Timer Shortcut Project"
}
```

**Response:**

```json
{
  "id": "conv_123",
  "title": "Timer Shortcut Project",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Get Conversation

```http
GET /api/conversations/:id
```

### List Conversations

```http
GET /api/conversations
```

### Send Message

```http
POST /api/conversations/:id/messages
```

**Request Body:**

```json
{
  "content": "Add a notification to my shortcut",
  "model": "gpt-4o"
}
```

### Stream Conversation

```http
GET /api/conversations/:id/stream
```

Returns Server-Sent Events (SSE) with real-time updates.

### Delete Conversation

```http
DELETE /api/conversations/:id
```

---

## System

### Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "circuitBreakers": {
    "openai": "CLOSED",
    "anthropic": "CLOSED"
  }
}
```

### Get Stats

```http
GET /api/stats
```

**Response:**

```json
{
  "models": {
    "requests": 150,
    "cacheHits": 45
  },
  "shortcuts": {
    "created": 89,
    "shared": 23
  }
}
```

### Reinitialize Services

```http
POST /api/reinit
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid shortcut format",
    "details": {
      "field": "actions",
      "issue": "Missing required field"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `AI_ERROR` | 502 | AI provider error |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

Currently no rate limiting is implemented (designed for local use). For production deployment, implement rate limiting at the reverse proxy level.

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Generate shortcut
const response = await fetch('http://localhost:4321/api/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-4o',
    prompt: 'Create a timer shortcut',
    type: 'generate'
  })
});

const data = await response.json();
console.log(data.shortcut);
```

### cURL

```bash
# Generate shortcut
curl -X POST http://localhost:4321/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "prompt": "Create a timer shortcut",
    "type": "generate"
  }'

# Build shortcut file
curl -X POST http://localhost:4321/api/shortcuts/build \
  -H "Content-Type: application/json" \
  -d '{
    "shortcut": {"name": "Timer", "actions": []},
    "format": "shortcut"
  }' \
  --output timer.shortcut
```

### Python

```python
import requests

# Generate shortcut
response = requests.post('http://localhost:4321/api/process', json={
    'model': 'gpt-4o',
    'prompt': 'Create a timer shortcut',
    'type': 'generate'
})

data = response.json()
print(data['shortcut'])
```
