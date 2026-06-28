# Outreach Emails — Apple Shortcuts Community

> Personal, non-spammy, written for individual recipients. Each is a template — fill in the bracketed `[LIKE THIS]` fields before sending. Do **not** mass-BCC; send individually so the recipient can reply.
>
> Recipient list suggestions (subject to your own relationship / warm intro):
> - Matthew Cassinelli — RoutineHub founder, Apple Shortcuts community lead
> - Be My Eyes team — accessibility-first Shortcuts users
> - Federico Viticci — MacStories, deep Apple Shortcuts coverage
> - David Sparks (MacSparky) — power-user Shortcuts field reports
> - Rosemary Orchard — Shortcuts + automation community
> - RoutineHub featured-shortcut curators
> - Selected r/shortcuts regulars who've shipped useful shortcuts
>
> Attach or link to a 60-second screen recording of: export → upload to KB → prompt → download signed shortcut.

---

## Email 1 — Matthew Cassinelli / RoutineHub

**To:** `[recipient email]`
**Subject:** Open-source Shortcuts IDE — would love your take on the new Knowledge Base feature

---

Hi Matthew,

Long-time admirer of RoutineHub and the way you've kept the Apple Shortcuts community's quality bar where it is. Quick note because I think this is in your wheelhouse.

A small group of us have been building **ShortcutGenius** — an MIT-licensed, open-source IDE for iOS Shortcuts. You chat with an agentic AI, it builds a real `.shortcut` file, and you can run it through a macOS test bridge before downloading. The agent is multi-turn (~15–20 iterations, 90%+ confidence gate, zero-placeholder policy) and validates against a DB of 185+ verified iOS action types. Output shortcuts are signed. There's a public gallery.

We just shipped v1.1.0 and the headline feature is a **Knowledge Base**: users can import their own existing shortcuts as few-shot examples, and the agent picks the relevant ones by complexity, action overlap, and app coverage. The goal is that AI-generated shortcuts stop looking like generic AI output and start looking like something a particular person would have built.

Repo + release notes: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/releases/tag/v1.1.0`

Two specific things I'd love your read on:

1. The few-shot selection algorithm. Right now it scores on action overlap, complexity, and "flagged as good example." We're not sure the weighting is right, and we don't have a great offline eval harness for it.
2. Whether the KB framing is the right one vs. just calling it "examples" or "library."

No ask beyond that — if you have time to look and have thoughts, I'd genuinely value them. And if you'd rather not, no worries at all; thanks for building RoutineHub into what it is.

Best,
`[Your name]`
`[GitHub handle]`

---

## Email 2 — Be My Eyes (accessibility angle)

**To:** `[recipient email]`
**Subject:** Open-source Shortcuts tool — accessibility use cases, would value your input

---

Hi team,

I write on behalf of the small group maintaining **ShortcutGenius**, an MIT-licensed open-source IDE for iOS Shortcuts. It's an agentic AI that builds, validates, and tests real `.shortcut` files. New in v1.1.0: a Knowledge Base feature that lets users import their own shortcuts as few-shot examples, so the agent matches their conventions rather than producing generic output.

Repo: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius`

I'm writing because Be My Eyes' work on accessibility-first automation is exactly the use case where a tool like this has to do better than "technically working." If someone is depending on a Shortcut for daily routine or emergency contact, the AI cannot ship something that *looks* fine and breaks on action three. That's why the agent runs with a 90%+ confidence gate, a zero-placeholder policy, and an optional runtime test bridge on macOS that captures real output and errors before download.

Two things I'd genuinely value input on:

1. Are there patterns in accessibility-focused shortcuts (large text, VoiceOver-friendly action sequences, timeouts, fallbacks) that you all keep re-writing? If so, those should probably be loadable KB examples by default — happy to add them as a curated bundle if you'd be willing to help shape it.
2. Anyone on the Be My Eyes community team who'd want to try it on a real workflow and tell us where it fails?

Totally understand if this isn't a priority right now. Either way, thanks for the work you do — the Shortcuts community is meaningfully better because of it.

Best,
`[Your name]`

---

## Email 3 — MacStories / Federico Viticci

**To:** `[recipient email]`
**Subject:** ShortcutGenius v1.1.0 — open-source, KB feature, would welcome your testing

---

Hi Federico,

Long-time reader of MacStories — your Shortcuts coverage is the reason half of my own shortcuts exist. Reaching out because we just shipped v1.1.0 of **ShortcutGenius**, an MIT-licensed open-source IDE for iOS Shortcuts.

The agent is multi-turn (~15–20 iterations, 90%+ confidence gate), grounded against a DB of 185+ verified iOS action types, with a zero-placeholder policy (no fake URLs, no `example.com`). It can run generated shortcuts through a macOS test bridge before download. Output is signed.

The new piece in v1.1.0 is the **Knowledge Base**: you import your own existing shortcuts (via ``npx shortcut-genius convert` --full`) as few-shot examples, and the agent starts matching your conventions — variable names, action patterns, which third-party apps you actually lean on.

Release: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/releases/tag/v1.1.0`
KB setup: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/blob/main/docs/KNOWLEDGE_BASE_SETUP.md`

I won't pretend this is MacStories-tier production tooling yet. But if you (or Stephen, or anyone on the MacStories team) had 30 minutes to try it on one of your own real shortcuts and write up what worked and what didn't, that feedback would be worth more to us than a year of guesswork.

Totally fine if this isn't a fit. Either way, thanks for the years of Shortcuts writing — it's made the entire ecosystem better.

Best,
`[Your name]`

---

## Email 4 — Short form, for people you don't know well (Rosemary Orchard, David Sparks, r/shortcuts regulars)

**Subject:** Open-source Shortcuts IDE, v1.1.0 — short note + honest ask

---

Hi `[Name]`,

Quick note — I help maintain **ShortcutGenius**, an MIT-licensed open-source IDE for iOS Shortcuts. New v1.1.0 release adds a Knowledge Base feature so the AI learns from your own existing shortcuts.

Link: `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/releases/tag/v1.1.0`

No pitch. Two real questions if you have a moment:

1. Would you actually use a "few-shot from your own library" feature, or would you rather just paste a reference shortcut into chat?
2. If you tried it and the runtime test bridge failed on a real shortcut, would you open an issue?

Thanks,
`[Your name]`

---

## Notes for whoever sends these

- **One-to-one sends only.** Different subject lines, different opening sentences per recipient.
- **Attach a 60-second screen recording** of the export → KB upload → prompt → download flow if you have one. If not, link to a release demo.
- **Don't promise coverage.** None of these people owe you a writeup; the email is the ask, not a press release.
- **Internal note before sending:** the README clone URL is now `github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius`, matching the canonical home. All launch-kit URLs point at the org repo.