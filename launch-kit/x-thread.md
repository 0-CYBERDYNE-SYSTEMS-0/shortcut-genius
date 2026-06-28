# X / Twitter Thread — v1.1.0 "Knowledge Base"

> Ready to paste into X / Tweetdeck. Each tweet ≤ 280 chars. Thread pinned.
>
> Companion assets: a short screen recording (export → KB upload → prompt → signed shortcut), and the GitHub release link.
>
> URLs to drop in before posting:
> - Release: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/releases/tag/v1.1.0`
> - Repo:    `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius`
> - KB setup: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/blob/main/docs/KNOWLEDGE_BASE_SETUP.md`

---

**1/** Most "AI shortcut generators" spit out JSON you have to baby-sit.

ShortcutGenius v1.1.0 is different: feed it *your* shortcuts as few-shot examples and the next one it writes sounds like you built it.

Open source. MIT. Local-first. 🧵

---

**2/** What it is, in one line:

A conversational IDE for iOS Shortcuts. Describe what you want, an agentic AI builds a real `.shortcut` file. Multi-turn (~15–20 iters), >90% confidence gate.

You can test it on macOS before downloading.

---

**3/** The unglamorous but important bits:

• 185+ verified iOS action types
• Zero-placeholder policy (no fake URLs)
• Runtime test bridge → macOS Shortcuts app (real output, real errors)
• Signed shortcut output (codesign)

A tool, not a demo.

---

**4/** v1.1.0 — the "Knowledge Base" release — adds what people actually asked for:

📚 Import your own shortcuts as few-shot examples.
🎯 Agent picks relevant ones by complexity, action type, app overlap.
🏷️ Tag, filter, flag your best ones.

Output matches *your* style.

---

**5/** The flow:

```
1. Export from Shortcuts.app
2. npx shortcut-genius convert "My Shortcut.shortcut"
   → upload JSON to the KB tab
   → next prompt auto-injects your best examples
   → download a signed .shortcut file
```

No magic. No SaaS lock-in.

---

**6/** Honest scope notes:

🔒 Local-first by design — not a hosted service.
🍎 Runtime testing needs macOS.
🤖 You're still in the loop for anything touching real personal data.

If those are deal-breakers, this isn't the tool yet.

---

**7/** Why open source:

iOS automation deserves tools you can read, fork, and trust. MIT. PRs welcome.

If you've ever yelled at an AI for shipping a shortcut that breaks on action 3 — give it a try.

Repo 👇
https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius

---

**8/** If you try it, two huge favors:

1. Star the repo so other Shortcuts people can find it.
2. Reply / DM with one shortcut the agent got *wrong* on first try. Those failures shape the roadmap more than the wins.

Thanks. 🫡