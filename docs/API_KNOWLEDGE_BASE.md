# Knowledge Base API Documentation

REST API for managing iOS Shortcuts knowledge base for personalized few-shot prompting.

## Base URL

```
http://localhost:4321/api/knowledge-base
```

## Authentication

All endpoints require authentication via session. User ID is extracted from the authenticated session.

## Endpoints

### POST /upload

Upload iOS Shortcuts to knowledge base.

**Request Body:**

```json
[
  {
    "shortcut_name": "My Shortcut",
    "workflow_id": "abc-123-def",
    "actions": [
      {
        "index": 1,
        "identifier": "is.workflow.actions.gettext",
        "parameters": {
          "WFTextActionText": "Hello World"
        }
      }
    ],
    "action_count": 1,
    "run_count": 10,
    "trigger_count": 0,
    "complexity_score": 5,
    "app_bundle_identifier": null,
    "source": "ShortcutSourceFilePersonal",
    "third_party_integrations": [],
    "is_example": false,
    "tags": ["simple", "test"]
  }
]
```

**Response:**

```json
{
  "success": true,
  "imported": 1,
  "shortcuts": [...],
  "message": "Successfully imported 1 shortcuts"
}
```

**Error Response:**

```json
{
  "error": "Validation failed",
  "errors": [
    "Shortcut 1: Missing shortcut_name",
    "Shortcut 2: Invalid action_count"
  ]
}
```

### GET /

List user's knowledge base shortcuts with optional filters.

**Query Parameters:**

- `tags` (optional, string or array): Filter by tags. Multiple tags comma-separated.
- `complexity_min` (optional, number): Minimum complexity score.
- `complexity_max` (optional, number): Maximum complexity score.
- `is_example` (optional, boolean): Only return flagged examples.

**Examples:**

```
GET /api/knowledge-base
GET /api/knowledge-base?tags=api,automation
GET /api/knowledge-base?complexity_min=10&complexity_max=30
GET /api/knowledge-base?is_example=true
GET /api/knowledge-base?tags=api&complexity_min=5&is_example=true
```

**Response:**

```json
{
  "success": true,
  "count": 5,
  "shortcuts": [
    {
      "id": 1,
      "user_id": 1,
      "shortcut_name": "My Shortcut",
      "actions": [...],
      "complexity_score": 5,
      "is_example": true,
      "tags": ["api"],
      "created_at": "2026-03-16T10:00:00Z"
    }
  ]
}
```

### GET /stats

Get statistics about user's knowledge base.

**Response:**

```json
{
  "success": true,
  "stats": {
    "total_shortcuts": 42,
    "total_actions": 847,
    "example_count": 8,
    "complexity_distribution": {
      "simple": 15,
      "medium": 20,
      "complex": 7
    },
    "third_party_apps": [
      {
        "app": "ai.perplexity.app",
        "count": 12
      },
      {
        "app": "com.anthropic.claude",
        "count": 5
      }
    ]
  }
}
```

### GET /:id

Get a specific shortcut by ID.

**Response:**

```json
{
  "success": true,
  "shortcut": {
    "id": 1,
    "shortcut_name": "My Shortcut",
    "actions": [...],
    "parameters": {...},
    "variables": {...},
    "complexity_score": 5,
    "is_example": true
  }
}
```

**Error Response:**

```json
{
  "error": "Not found",
  "message": "Shortcut with ID 999 not found"
}
```

### DELETE /:id

Delete a shortcut from knowledge base.

**Response:**

```json
{
  "success": true,
  "message": "Shortcut deleted successfully"
}
```

### PUT /:id/flag

Update shortcut example flag and quality score.

**Request Body:**

```json
{
  "is_example": true,
  "quality_score": 8
}
```

**Response:**

```json
{
  "success": true,
  "message": "Shortcut updated successfully",
  "shortcut": {...}
}
```

### POST /select

Select relevant examples based on user request.

**Request Body:**

```json
{
  "userRequest": "Create a shortcut that calls Perplexity API",
  "preferredComplexity": "auto",
  "maxExamples": 5,
  "requireExampleFlag": false
}
```

**Response:**

```json
{
  "success": true,
  "selection": {
    "examples": [
      {
        "name": "Ask Perplexity",
        "actions": [...],
        "complexity": 12,
        "category": "API Integration"
      }
    ],
    "total_shortcuts": 42,
    "selection_criteria": {...},
    "scores": [...]
  }
}
```

## Data Structures

### ShortcutKnowledgeBase

| Field | Type | Description |
|--------|------|-------------|
| id | number | Primary key |
| user_id | number | Owner ID |
| shortcut_name | string | Shortcut name |
| workflow_id | string | Unique workflow identifier |
| action_count | number | Total number of actions |
| run_count | number | Times shortcut was run |
| complexity_score | number | Calculated complexity (1-100) |
| app_bundle_identifier | string | Associated app |
| actions | array | Complete action array with parameters |
| action_sequence | string | Simplified action identifier list |
| parameters | object | All parameter configurations |
| variables | object | Variable definitions |
| third_party_integrations | array | Third-party app bundle IDs |
| is_example | boolean | Flagged as good example |
| tags | array | User-added tags |
| quality_score | number | User-rated quality (1-10) |
| created_at | timestamp | Import timestamp |
| updated_at | timestamp | Last update timestamp |

## Error Codes

| Status | Code | Description |
|--------|-------|-------------|
| 401 | AUTHENTICATION_REQUIRED | User not authenticated |
| 400 | INVALID_INPUT | Invalid request data |
| 403 | FORBIDDEN | No permission for this resource |
| 404 | NOT_FOUND | Resource not found |
| 500 | INTERNAL_ERROR | Server error |

## Rate Limiting

No rate limiting currently implemented. Requests are processed in order received.

## Webhooks

No webhooks currently supported.

## Examples

### Upload Shortcuts

```bash
curl -X POST http://localhost:4321/api/knowledge-base/upload \
  -H "Content-Type: application/json" \
  -d @my-shortcuts.json
```

### List Shortcuts with Filters

```bash
curl "http://localhost:4321/api/knowledge-base?tags=api&complexity_min=5&is_example=true"
```

### Flag Example

```bash
curl -X PUT http://localhost:4321/api/knowledge-base/123/flag \
  -H "Content-Type: application/json" \
  -d '{"is_example": true, "quality_score": 9}'
```

### Select Examples

```bash
curl -X POST http://localhost:4321/api/knowledge-base/select \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": "Create a Perplexity API shortcut",
    "preferredComplexity": "medium",
    "maxExamples": 3
  }'
```

## Versioning

Current API version: **v1.0.0**

Changes are documented in CHANGELOG.md.
