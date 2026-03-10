# Contributing to ShortcutGenius

## Before you start

- Read the top-level [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Check existing issues before opening a new one
- Keep secrets, local provider files, and generated share artifacts out of commits

## Local setup

```bash
npm install
cp .env.example .env
npm test
npm run build
```

For database-backed conversation storage:

```bash
docker compose up -d
npm run db:push
```

For memory-only local development:

```bash
CONVERSATION_STORE_MODE=memory npm run dev
```

## Pull request expectations

- Keep changes scoped
- Add or update tests when behavior changes
- Update docs when setup, API behavior, or contributor workflow changes
- Use clear commit messages
- Confirm `npm test` and `npm run build` pass before opening the PR

## What to avoid committing

- `.env` files
- `.local/` runtime state
- `shares/` exports, QR codes, or signed shortcuts
- provider credential files
- generated reports or scratch capture files

## Good first contributions

- documentation fixes
- test coverage improvements
- isolated bug fixes with a clear reproduction
- small UX improvements with screenshots

## Need help?

Open a GitHub issue with enough detail to reproduce the problem. Security-sensitive reports should go through `SECURITY.md`, not public issues.
