# Contributing

Public PRs are welcome, but all changes are maintainer-reviewed before merge.

## Setup

```bash
npm install
cp .env.example .env
npm test
npm run build
```

If you need persistent conversation storage:

```bash
docker compose up -d
npm run db:push
```

## Before opening a PR

- keep the change focused
- update docs when behavior or setup changes
- add or update tests when behavior changes
- confirm `npm test` and `npm run build` pass
- do not commit secrets, `.env`, `.local/`, or `shares/` runtime artifacts

## PR review policy

- maintainers decide merge timing and scope
- large features should start with an issue or design discussion
- security-sensitive findings should go through `SECURITY.md`

See [`docs/contributing/guide.md`](docs/contributing/guide.md) for the longer version.
