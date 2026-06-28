# Hacker News — Submission

> Show HN format. Neutral title. First comment does the work. No marketing language. Ready to copy/paste into `news.ycombinator.com/submit`.

---

## Title (pick one)

**Option A (recommended, neutral):**
> Show HN: ShortcutGenius – Open-source agentic IDE for iOS Shortcuts, now with your own library as few-shot

**Option B (shorter):**
> Show HN: ShortcutGenius (MIT) – agentic AI IDE for iOS Shortcuts

**Option C (more technical):**
> Show HN: ShortcutGenius v1.1.0 – Knowledge Base feature for iOS Shortcut generation

---

## First comment (post immediately after submission)

Hi HN — I'm one of the maintainers.

ShortcutGenius is an open-source IDE for iOS Shortcuts. You describe what you want in chat, a multi-turn agent builds a real `.shortcut` file, and you can run it through a test bridge to the macOS Shortcuts app before you download.

The new thing in v1.1.0 is the **Knowledge Base** feature: you can import your own existing shortcuts (via ``npx shortcut-genius convert` --full`) as few-shot examples. The agent then selects the relevant ones by complexity, action type, and app overlap, and injects them into the system message. The point is that generated shortcuts stop looking like generic AI slop and start matching the conventions you actually use.

Some honest technical details, since this is HN:

- **Agent loop:** multi-turn, typically 15–20 iterations, with a confidence gate (refuses to finalize below ~90%) and a zero-placeholder policy (rejects `example.com`, fake URLs, unfinished API calls).
- **Action DB:** 185+ verified iOS Shortcut action types — we validate the generated JSON against this before declaring a shortcut ready.
- **Runtime testing:** there's a bridge that imports the generated `.shortcut` into the macOS Shortcuts app, executes it, captures real output/errors, and cleans up. This is the part that needs macOS.
- **Signing:** output shortcuts can be code-signed.
- **Models:** OpenAI, Anthropic, OpenRouter (100+ models), Zai, Moonshot, MiniMax. You bring your own API keys.
- **Stack:** React 18 + TypeScript front end, Express + Node 18+ back end, PostgreSQL (optional, in-memory mode works), Docker Compose for local dev.
- **Scope:** local-first dev tool, not a hosted service. Security review in `SECURITY.md` (76/100, acceptable for local use). Not intended for public deployment without adding auth/rate limiting.

What we'd genuinely like feedback on:

1. The few-shot selection algorithm — right now it scores on action overlap, complexity, and tagged "good examples." We're not sure the weighting is right and we don't have a great offline eval harness for it.
2. The runtime test bridge — it works, but it requires macOS and the macOS Shortcuts app. There's no path to test on Linux/Windows, and we don't love that.
3. Whether the "Knowledge Base" framing is the right one vs. just calling it "examples" or "library."

Repo: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius`
v1.1.0 release notes: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/releases/tag/v1.1.0`
KB setup guide: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/blob/main/docs/KNOWLEDGE_BASE_SETUP.md`

Happy to answer questions about the architecture, the agent loop, or the (still incomplete) parts.

---

## Optional: report-able issues / known gaps to acknowledge if asked

- README's clone URL is now `github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius`, matching the canonical home.
- The KB UI doesn't yet expose diff between a KB-grounded generation and a non-grounded one. On the roadmap.
- No offline mode for the model router (still requires an external API call).