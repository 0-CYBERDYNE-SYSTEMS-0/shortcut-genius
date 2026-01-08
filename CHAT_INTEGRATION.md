# Chat Integration Documentation

## Overview

The chat integration brings a conversational AI interface to ShortcutGenius, allowing users to interact with AI assistants to create, analyze, and optimize iOS shortcuts through natural conversation.

## Features

### 🎯 Core Features
- **Conversational AI Interface**: Natural language chat with AI assistants
- **Context-Aware Conversations**: AI understands the current shortcut context
- **Real-Time Streaming**: Live responses with progress indicators
- **Conversation History**: Persistent conversation management
- **Cross-Platform**: Works on mobile, tablet, and desktop layouts

### 🤖 AI Capabilities
- **Shortcut Creation**: Generate shortcuts from natural language descriptions
- **Analysis & Optimization**: Get suggestions for improving existing shortcuts
- **Interactive Refinement**: Iteratively improve shortcuts through conversation
- **Multi-Model Support**: Works with GPT-4o, Claude 3.5 Sonnet, and OpenRouter models
- **Reasoning Support**: Leverages reasoning tokens for better decision-making

### 💬 Chat Interface
- **Modern UI**: Clean, intuitive chat interface with message bubbles
- **Auto-Resizing Input**: Textarea that grows with content
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line
- **Status Indicators**: Visual feedback for streaming and processing states
- **Error Handling**: Graceful error recovery and user feedback

## Architecture

### Frontend Components

#### ChatThread (`client/src/components/ChatThread.tsx`)
Main container component that orchestrates the chat interface:
- **Message Display**: Renders conversation history with ChatMessage components
- **Input Handling**: Manages ChatInput component and message sending
- **Conversation Management**: Handles conversation lifecycle (create, load, delete)
- **State Management**: Manages streaming states and error handling
- **Context Integration**: Shares shortcut context with AI

#### ChatInput (`client/src/components/ChatInput.tsx`)
Input component for user messages:
- **Auto-Resizing**: Textarea that grows with content
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line, Escape to clear
- **Character Limit**: Configurable message length limits
- **Error Display**: Shows validation and sending errors
- **Loading States**: Visual feedback during message sending

#### ChatMessage (`client/src/components/ChatMessage.tsx`)
Individual message display component:
- **Role-Based UI**: Different styling for user vs assistant messages
- **Avatars**: Visual indicators for message roles
- **Action Buttons**: Copy content, apply shortcut to editor
- **Metadata Display**: Shows model, phase, and other message metadata
- **Streaming Support**: Handles partial messages during streaming

### Backend Integration

#### Conversational Agent (`server/conversational-agent.ts`)
Core AI processing engine:
- **Multi-Model Support**: Routes requests to appropriate AI providers
- **Context Management**: Maintains conversation context and shortcut state
- **Phase Tracking**: Manages different phases of AI processing
- **Response Streaming**: Real-time streaming of AI responses
- **Error Recovery**: Graceful handling of API failures

#### Chat API (`server/routes/conversations.ts`)
RESTful API endpoints:
- `POST /api/conversations/create` - Create new conversation
- `GET /api/conversations/:id` - Get conversation details
- `GET /api/conversations` - List user conversations
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/conversations/:id/messages` - Send message
- `GET /api/conversations/:id/stream` - Stream conversation updates

#### Database Schema
Stores conversations and messages in PostgreSQL:

```sql
-- Conversations table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_access TIMESTAMP DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  metadata JSONB
);

-- Messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

## Integration Points

### Editor Integration
The chat interface is integrated into the main Editor component:

1. **Toolbar Toggle**: Chat toggle button in the toolbar
2. **Tab Navigation**: Dedicated "AI Chat" tab in the main navigation
3. **Context Sharing**: Current shortcut is shared with chat context
4. **Bidirectional Communication**: Chat can update editor content
5. **Responsive Layout**: Adapts to mobile, tablet, and desktop layouts

### State Management
- **Conversations**: Persistent conversation history with metadata
- **Messages**: Real-time message streaming and storage
- **UI State**: Loading, error, and streaming states
- **User Preferences**: Model selection and conversation settings

## Usage Examples

### Basic Conversation
```typescript
// Start a new conversation
await chatThread.createNewConversation();

// Send a message
const response = await chatThread.handleSendMessage(
  "Create a shortcut that sets a 5-minute timer"
);

// Apply shortcut to editor
if (response.metadata?.shortcut) {
  handleChatShortcutUpdate(response.metadata.shortcut);
}
```

### Context-Aware Analysis
```typescript
// Chat analyzes current shortcut
const analysis = await chatThread.handleSendMessage(
  "How can I improve this shortcut for better performance?"
);

// AI provides specific suggestions
// User can iteratively refine based on feedback
```

## Configuration

### Environment Variables
Required for chat functionality:
```bash
# AI Provider API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
OPENROUTER_API_KEY=your_openrouter_key

# Database
DATABASE_URL=your_postgresql_url

# Optional: Web Search for enhanced AI responses
TAVILY_API_KEY=your_tavily_key
# or
SERPER_API_KEY=your_serper_key
```

### Chat Settings
Customizable through props:
- `maxMessageLength`: Maximum characters per message (default: 1000)
- `autoFocus`: Auto-focus input on mount (default: true)
- `showConversationHistory`: Display conversation sidebar
- `streamingEnabled`: Enable real-time streaming (default: true)

## Performance Considerations

### Caching
- **Response Caching**: AI responses cached by model/prompt/type
- **Conversation Caching**: Active conversations kept in memory
- **UI State Caching**: Chat state preserved across navigation

### Streaming
- **SSE Protocol**: Server-Sent Events for real-time updates
- **Chunked Responses**: Large responses streamed in chunks
- **Progress Indicators**: Visual feedback during streaming

### Error Handling
- **Circuit Breakers**: Prevent cascading API failures
- **Exponential Backoff**: Automatic retry with increasing delays
- **Graceful Degradation**: Fallback to basic functionality on errors

## Testing

### Unit Tests
- **Component Tests**: Individual component functionality
- **API Tests**: Backend endpoint validation
- **Integration Tests**: Chat-editor communication

### E2E Tests
- **Conversation Flow**: Full conversation scenarios
- **Error Scenarios**: API failure handling
- **Responsive Testing**: Cross-device compatibility

## Future Enhancements

### Planned Features
- **Voice Input**: Speech-to-text for mobile users
- **Image Support**: Analyze screenshots of shortcuts
- **Collaborative Chat**: Multiple users in same conversation
- **Template Library**: Pre-built conversation templates
- **Analytics**: Conversation metrics and insights

### AI Improvements
- **Multi-Turn Conversations**: Better context retention
- **Personalized Responses**: Learn user preferences
- **Proactive Suggestions**: AI offers improvements
- **Visual Building**: Generate shortcuts from diagrams

## Troubleshooting

### Common Issues

#### Chat Not Loading
- Check database connection
- Verify API keys are configured
- Ensure chat routes are registered

#### Messages Not Sending
- Verify network connectivity
- Check API rate limits
- Review error logs

#### Streaming Issues
- Ensure SSE is supported by browser
- Check proxy/firewall settings
- Verify streaming endpoint configuration

### Debug Mode
Enable debug logging:
```typescript
// In development
localStorage.setItem('debug', 'chat:*');
```

## Contributing

### Code Style
- Follow existing TypeScript patterns
- Use existing UI components
- Implement proper error handling
- Add comprehensive tests

### API Guidelines
- Use existing chat API endpoints
- Follow RESTful conventions
- Implement proper error responses
- Include relevant metadata

---

This integration significantly enhances ShortcutGenius by providing an intuitive, conversational interface for iOS shortcut development and optimization. The architecture is designed to be extensible, performant, and user-friendly across all device types.