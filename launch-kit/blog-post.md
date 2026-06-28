---
title: "ShortcutGenius v1.1.0 — The Knowledge Base Release"
date: 2026-06-27
author: "R. Desmond et al. — 0-CYBERDYNE-SYSTEMS-0"
tags: [shortcuts, ios, open-source, ai-agents, release]
---

# ShortcutGenius v1.1.0 — The Knowledge Base Release

If you've ever asked an AI to write you an iOS Shortcut and gotten back something technically-correct-but-totally-not-yours, this release is for you.

ShortcutGenius **v1.1.0** is out today. It's MIT-licensed, open source, and the headline feature — the **Knowledge Base** — is the one piece we wish we'd shipped in v1.0: the ability to import your own existing shortcuts as few-shot examples, so the agent stops writing like a generic assistant and starts writing like you.

You can grab it here: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/releases/tag/v1.1.0`

---

## What it does

ShortcutGenius is a conversational IDE for iOS Shortcuts. You describe what you want in plain English, an agentic AI builds a real `.shortcut` file (not a sketch, not a JSON snippet — an actual importable shortcut), and you can run it through a macOS test bridge before downloading.

Under the hood, the agent is multi-turn — it iterates roughly 15–20 times, validates against a database of 185+ verified iOS action types, enforces a zero-placeholder policy (no fake URLs, no `example.com`, no half-wired API calls), and won't finalize until a confidence score clears 90%. Output shortcuts are signed. There's a public gallery. There's a CLI. It works with OpenAI, Anthropic, OpenRouter (100+ models), Zai, Moonshot, and MiniMax — you bring your own keys.

It's a tool for people who actually build shortcuts, not a demo.

---

## What's new in v1.1.0

**📚 Knowledge Base.** Upload JSON exports of your existing shortcuts (via `npx shortcut-genius convert "MyShortcuts/Name.shortcut" -o out.json``) and the agent starts using them as few-shot examples. There's a smart selector that ranks your shortcuts by complexity, action-type overlap, and which apps you used — so when you ask for a "timer that pauses Spotify when I start a focus session," it pulls in your existing Spotify actions, not the textbook ones.

**🏷️ Tag, filter, flag.** Organize your library by tag and complexity level. Flag your best shortcuts so they're weighted higher in selection. See library stats — total shortcuts, complexity distribution, app coverage.

**⚙️ Per-session controls.** Opt in or out of KB grounding per generation. Cap how many examples get injected (so your system prompt doesn't explode). Quality scoring per shortcut so you can prune what hurts more than it helps.

**🧠 Better grounding in the system prompt.** The `buildBaseSystem()` prompt now weaves in your examples where they're relevant. You can read the diff in `AGENTIC-ARCHITECTURE.md` if you're into that.

A new REST API surfaces all of this: `/api/knowledge-base/upload`, `/api/knowledge-base`, `/api/knowledge-base/stats`, `/api/knowledge-base/:id`, `/api/knowledge-base/:id/flag`, `/api/knowledge-base/select`. Full docs in `docs/API_KNOWLEDGE_BASE.md`.

---

## Honest scope notes

We'd rather you know these up front:

- **Local-first by design.** This is a developer tool that runs on your machine. It's not a hosted service and not intended to be deployed publicly without adding auth, rate limiting, and input validation. There's a security review in `SECURITY.md` (76/100, acceptable for local use).
- **Runtime testing needs macOS.** The test bridge talks to the macOS Shortcuts app. On Linux/Windows you can still build and download, you just can't auto-execute.
- **You're the human in the loop.** Anything that touches real personal data (location, messages, health, etc.) still needs you to review before it runs. That's not a missing feature, it's the point.

If any of those are deal-breakers for you, we'd genuinely like to know — they're the top of our roadmap.

---

## How to try it

```bash
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius
cd shortcut-genius
npm install
cp .env.example .env       # add an API key for one of the supported providers
npm run dev                # http://localhost:4321
```

To use the new Knowledge Base feature, the full step-by-step is in `docs/KNOWLEDGE_BASE_SETUP.md`. The short version: export a few of your existing shortcuts with `npx shortcut-genius convert "MyShortcuts/Name.shortcut" -o out.json``, upload the JSON from the KB tab, then start prompting — the agent will pick relevant examples automatically.

If you hit anything weird, open an issue. If you build something cool with it, the public gallery is right there. PRs are very welcome.

Thanks for letting us build this in the open.

— *R. Desmond et al., 0-CYBERDYNE-SYSTEMS-0*