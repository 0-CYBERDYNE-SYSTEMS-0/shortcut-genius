# 🤝 Contributing to ShortcutGenius

We love contributions! This guide will help you get started contributing to ShortcutGenius.

## 🎯 Ways to Contribute

### 🐛 Bug Reports
Found a bug? Help us squash it!
- Check [existing issues](https://github.com/scrimwiggins/shortcut-genius/issues) first
- Use the [bug report template](https://github.com/scrimwiggins/shortcut-genius/issues/new?template=bug_report.md)
- Include steps to reproduce, expected vs actual behavior

### 💡 Feature Requests
Have an idea? We'd love to hear it!
- Check [existing feature requests](https://github.com/scrimwiggins/shortcut-genius/labels/enhancement)
- Use the [feature request template](https://github.com/scrimwiggins/shortcut-genius/issues/new?template=feature_request.md)
- Explain the problem your feature would solve

### 📚 Documentation
Help make our docs awesome!
- Fix typos, improve clarity
- Add examples and tutorials
- Translate documentation

### 💻 Code Contributions
Ready to dive into the code?
- Pick an issue labeled [`good first issue`](https://github.com/scrimwiggins/shortcut-genius/labels/good%20first%20issue)
- Follow our [development setup guide](development.md)
- Read our [code style guide](style-guide.md)

## 🚀 Quick Start for Contributors

### 1. Fork & Clone
```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/shortcut-genius.git
cd shortcut-genius
```

### 2. Set Up Development Environment
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your API keys to .env
# Set up database (see development.md for details)

# Start development server
npm run dev
```

### 3. Create a Feature Branch
```bash
git checkout -b feature/your-awesome-feature
# or
git checkout -b fix/that-annoying-bug
```

### 4. Make Your Changes
- Write clean, readable code
- Add tests for new functionality
- Update documentation as needed
- Follow our code style guidelines

### 5. Test Your Changes
```bash
# Run tests
npm test

# Check linting
npm run lint

# Build to ensure no build errors
npm run build
```

### 6. Commit Your Changes
```bash
git add .
git commit -m "feat: add awesome new feature"
# or
git commit -m "fix: resolve annoying bug"
```

**Commit Message Format:**
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 7. Push & Create Pull Request
```bash
git push origin feature/your-awesome-feature
```

Then create a pull request on GitHub with:
- Clear title and description
- Link to related issues
- Screenshots for UI changes
- List of changes made

## 📋 Pull Request Checklist

Before submitting your PR, ensure:

- [ ] **Code Quality**
  - [ ] Code follows our style guidelines
  - [ ] No linting errors
  - [ ] No TypeScript errors
  - [ ] All tests pass

- [ ] **Documentation**
  - [ ] Updated relevant documentation
  - [ ] Added JSDoc comments for new functions
  - [ ] Updated CLAUDE.md if needed

- [ ] **Testing**
  - [ ] Added tests for new features
  - [ ] All existing tests still pass
  - [ ] Manual testing completed

- [ ] **Git**
  - [ ] Descriptive commit messages
  - [ ] Branch is up to date with main
  - [ ] No merge conflicts

## 🎨 Code Areas & Expertise

### Frontend (React/TypeScript)
**Location**: `client/src/`
- **Components**: UI components and layout
- **Hooks**: Custom React hooks
- **Utils**: Utility functions and helpers
- **Types**: TypeScript type definitions

**Skills needed**: React, TypeScript, Tailwind CSS, Monaco Editor

### Backend (Node.js/Express)
**Location**: `server/`
- **API Routes**: Express route handlers
- **AI Integration**: OpenAI/Anthropic API calls
- **Validation**: Input validation and sanitization
- **Error Handling**: Robust error management

**Skills needed**: Node.js, Express, TypeScript, API design

### Shortcut Analysis Engine
**Location**: `client/src/lib/shortcut-analyzer.ts`
- **Pattern Detection**: Identify shortcut patterns
- **Security Analysis**: Find vulnerabilities
- **Performance Optimization**: Suggest improvements
- **Dependency Mapping**: Track data flow

**Skills needed**: Algorithms, security knowledge, iOS Shortcuts expertise

### Database & ORM
**Location**: `db/`
- **Schema Design**: Database structure
- **Migrations**: Schema changes
- **Query Optimization**: Performance tuning

**Skills needed**: PostgreSQL, Drizzle ORM, database design

## 🏆 Recognition

Contributors are recognized in:
- README.md contributors section
- Monthly contributor highlights
- Special badges for significant contributions
- Invited to contributor-only Discord channel

### Contribution Levels

| Level | Criteria | Benefits |
|-------|----------|----------|
| **Contributor** | 1+ merged PR | Listed in contributors |
| **Regular** | 5+ merged PRs | Contributor badge |
| **Core** | 25+ merged PRs, ongoing involvement | Access to planning discussions |
| **Maintainer** | Invited by existing maintainers | Repository access |

## 🤔 Need Help?

### Getting Help
- 💬 **Discord**: Join our [contributor channel](https://discord.gg/shortcutgenius)
- 📧 **Email**: contributors@shortcutgenius.com
- 🐛 **Issues**: Comment on existing issues
- 📚 **Docs**: Check our [development guide](development.md)

### Mentorship Program
New to open source? We have mentors ready to help!
- Comment on issues with "I'd like to help but need guidance"
- Join our Discord and ask in #mentorship
- Attend our monthly contributor calls

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

### Key Points
- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Respect different viewpoints
- Report inappropriate behavior

## 🎉 Thank You!

Every contribution, no matter how small, makes ShortcutGenius better. Whether you're fixing a typo, reporting a bug, or adding a major feature - **thank you** for being part of our community!

---

**Ready to contribute?** Check out our [good first issues](https://github.com/scrimwiggins/shortcut-genius/labels/good%20first%20issue) and jump in!