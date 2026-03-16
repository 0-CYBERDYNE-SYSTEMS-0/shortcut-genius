# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial version tracking

## [1.1.0] - 2026-03-16

### Added
- **Knowledge Base Feature** - Import and manage personal iOS Shortcuts as few-shot examples for AI
  - ZDATA blob parsing support for complete action extraction
  - Smart example selection algorithm (complexity, action type, app overlap)
  - Knowledge Base UI with upload, list, and management
  - Context injection into AI system messages
  - Support for tagging, flagging good examples, quality scores
- **API Endpoints:**
  - POST `/api/knowledge-base/upload` - Import shortcuts JSON
  - GET `/api/knowledge-base` - List with filters (tags, complexity)
  - GET `/api/knowledge-base/stats` - Knowledge base statistics
  - GET `/api/knowledge-base/:id` - Get specific shortcut
  - DELETE `/api/knowledge-base/:id` - Remove shortcut
  - PUT `/api/knowledge-base/:id/flag` - Mark as example
  - POST `/api/knowledge-base/select` - Select relevant examples
- **Frontend Components:**
  - KnowledgeBaseTab - Main UI for knowledge base management
  - KnowledgeBaseUpload - JSON file upload with preview
  - ShortcutPreview - Display actions, parameters, complexity
- **Documentation:**
  - Complete user setup guide for ios-shortcuts CLI
  - Full API documentation with examples
  - Migration instructions for database

### Changed
- Extended `SystemMessageContext` to include knowledge base data
- Modified `buildBaseSystem()` to inject personal examples into AI prompts

### Fixed
- N/A

### Security
- No breaking changes
- Additive feature only - knowledge base is opt-in
- Users control what shortcuts to import

### Migration Notes
For users with existing database:
```bash
# Run new migration
npm run db:push
```

For new users: Knowledge base will be empty until shortcuts are uploaded.

### Documentation
- See `docs/KNOWLEDGE_BASE_SETUP.md` for user guide
- See `docs/API_KNOWLEDGE_BASE.md` for API documentation

---

## [1.0.0] - 2026-02-21

### Added
- Initial release
- AI-powered iOS Shortcut IDE with conversational interface
- Multi-provider AI models (OpenAI, Anthropic, OpenRouter)
- 185+ verified iOS Shortcut actions
- Real-time web search for API documentation
- Local analyzer for validation and optimization
- Shortcut builder with plist conversion
- Shortcut signing and verification
- Sharing system with public shortcuts
- Debug sessions and console

### Technical Details
- PostgreSQL for conversation persistence
- React 18 + TypeScript frontend
- Express + Node.js backend
- Docker Compose for local development
