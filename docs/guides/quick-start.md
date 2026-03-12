# Quick Start

## 1. Install dependencies

```bash
npm install
cp .env.example .env
```

## 2. Choose storage mode

Database-backed:

```bash
docker compose up -d
npm run db:push
```

Memory-only:

```bash
CONVERSATION_STORE_MODE=memory npm run dev
```

## 3. Run the app

```bash
npm run dev
```

Default local URL: `http://localhost:4321`

## 4. Verify your setup

```bash
npm test
npm run build
```

Optional end-to-end shortcut verification:

```bash
npm run verify:shortcut-flow
```
