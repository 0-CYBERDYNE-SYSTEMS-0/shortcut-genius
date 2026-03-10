# ShortcutGenius

ShortcutGenius is a React + Express workspace for creating, validating, analyzing, and sharing iOS Shortcuts with AI-assisted workflows.

## Status

- Public OSS release candidate
- Maintainer-reviewed contributions only
- Runtime secrets stay local and out of git

## Stack

- React 18 + TypeScript + Vite
- Express + Node.js
- Drizzle ORM + PostgreSQL
- OpenAI, Anthropic, OpenRouter, and optional search providers

## Quick start

```bash
git clone https://github.com/scrimwiggins/shortcut-genius.git
cd shortcut-genius
npm install
cp .env.example .env
```

Fill in only the providers you plan to use, then start the app:

```bash
npm run dev
```

If you want persistent conversations, also start Postgres and push the schema:

```bash
docker compose up -d
npm run db:push
```

If you do not want to run Postgres locally, set one of these in `.env`:

```bash
CONVERSATION_STORE_MODE=memory
# or
NO_STORAGE_MODE=true
```

## Validation commands

```bash
npm test
npm run build
npm run verify:shortcut-flow
```

Notes:

- `npm test` runs the current Jest suite.
- `npm run build` is the main release gate today.
- TypeScript linting is not yet a clean gate for this repo, so contributor docs do not claim a working `npm run lint`.

## Repository layout

- `client/`: React frontend
- `server/`: Express API and shortcut tooling
- `db/`: schema and migrations
- `docs/`: contributor and API docs
- `examples/`: sanitized example shortcut inputs safe to keep in git

## Secrets and local state

- Use [`.env.example`](.env.example) as the only committed env contract.
- Provider credentials entered through the app are stored locally under `.local/shortcut-genius/` and are gitignored.
- Runtime share exports, QR codes, and generated reports are local artifacts and are not part of the source tree.

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). Public PRs are welcome, but all changes are maintainer-reviewed before merge.

## Security

Please do not open public issues for suspected secret leaks or security vulnerabilities. Follow [`SECURITY.md`](SECURITY.md) instead.
