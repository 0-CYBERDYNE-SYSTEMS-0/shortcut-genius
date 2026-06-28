# LinkedIn Post — v1.1.0 "Knowledge Base"

> Professional, first-person plural, lightly opinionated. 3–4 hashtags. ~1300 chars. Ready to paste.

---

For the last several months a small group of us have been building **ShortcutGenius** — an open-source IDE for iOS Shortcuts. You describe what you want in plain English, an agentic AI builds, validates, and tests the actual `.shortcut` file.

Today we're shipping v1.1.0 — the "Knowledge Base" release — and it fixes the complaint we kept hearing: generic AI output doesn't sound like *your* shortcuts.

What's new:

→ Import your own shortcuts as few-shot examples. The agent picks the relevant ones by complexity, action type, and app overlap, and grounds generation on them. Output looks like something you'd build on a Sunday — same variable conventions, same action patterns, same "yeah I bolted a Perplexity call in here."

→ KB tab: upload, tag, filter, flag your best examples, see library stats. Per-session controls: opt in/out, cap examples used, quality scoring.

The agent itself hasn't changed — multi-turn (15–20 iters), zero-placeholder policy, 90%+ confidence gate. 185+ verified action types. Optional macOS runtime testing. Signed output. Public gallery.

Honest scope: local-first dev tool, not a hosted service. Runtime testing needs macOS. You're the human in the loop for anything touching real personal data — by design.

MIT. React + TypeScript, Express + Node, PostgreSQL optional. PRs welcome.

If you've ever spent an hour debugging a shortcut the AI said was "ready to download," this is for you.

Repo + release notes in the comments. 👇

\#iOSShortcuts #OpenSource #DeveloperTools

---

> URLs to drop in the comment:
> - Repo:    `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius`
> - Release: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/releases/tag/v1.1.0`
> - KB setup: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/blob/main/docs/KNOWLEDGE_BASE_SETUP.md`