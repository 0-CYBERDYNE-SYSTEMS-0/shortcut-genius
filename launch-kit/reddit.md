# Reddit — r/shortcuts Post

> Title is community-appropriate. Body gives back (KB feature + setup), asks for feedback, and is *not* a press release. No hashtags. Reddit-flavored.

---

## Title

> v1.1.0 release of ShortcutGenius (open-source) — added a Knowledge Base so the AI learns from your own shortcuts. Looking for feedback from people who'd actually use it.

---

## Body

Hey r/shortcuts — long-time lurker, first-time poster here in this form.

A few of us have been building **ShortcutGenius**, an MIT-licensed open-source IDE for iOS Shortcuts. You chat with an agentic AI, it builds a real `.shortcut` file, and you can run it through a macOS test bridge before downloading. Not new — we put v1.0 out earlier this year.

**What I'm actually here about:** we just shipped v1.1.0 and the main new feature is something that came directly out of complaints people had about v1.0 — the AI generated technically-correct shortcuts but they didn't feel like *yours*. Variable names were off, the action choices were generic, and you'd end up rewriting half of it.

So v1.1.0 has a **Knowledge Base** tab. You export your existing shortcuts (`npx shortcut-genius convert "MyShortcuts/My Shortcut.shortcut" -o out.json``), upload the JSON, and the agent picks the relevant ones as few-shot examples when generating. The output starts matching how *you* actually build things.

What's in it:

- 📚 Upload your own shortcuts as examples
- 🎯 Auto-selects the relevant ones (by complexity, action type, which apps you use)
- 🏷️ Tag, filter, and flag your best ones
- 📊 Library stats so you can see what you've actually built
- ⚙️ Settings: opt-in/out per session, cap on examples used

It still does the other things: multi-turn agent with a 90%+ confidence gate, zero-placeholder policy (no fake URLs), 185+ verified action types in the DB, signed shortcut output, public gallery.

**Setup (it's actually short):**

```bash
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius
cd shortcut-genius
npm install
cp .env.example .env  # add an API key for OpenAI / Anthropic / OpenRouter
npm run dev           # opens on http://localhost:4321
```

Full KB guide: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/blob/main/docs/KNOWLEDGE_BASE_SETUP.md`

**What I'd genuinely like from this sub:**

1. Does the few-shot idea actually land for you, or would you rather just paste a reference shortcut into the chat? We're going back and forth on the UI.
2. Anyone running this on Linux/Windows — the runtime test bridge is macOS-only because it talks to the actual Shortcuts app. Is that a deal-breaker, or is "you can still build + download, just not auto-test" acceptable?
3. If you import 50+ shortcuts, does the selection feel smart or random? We're tuning the scoring weights right now and would love real libraries to test against.
4. Anyone want to write up a RoutineHub-style guide for it? Happy to help and link back.

Honest scope notes: this is a **local dev tool**, not a hosted service. Runtime testing needs macOS. You're still the human in the loop for anything that touches real personal data — that's by design.

MIT licensed, PRs welcome, and if you try it and hit something weird please open an issue (or just comment here and I'll respond).

Thanks for reading. 🫡