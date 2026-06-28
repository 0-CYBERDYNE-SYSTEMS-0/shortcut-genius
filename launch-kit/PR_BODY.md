# ShortcutGenius v1.1.1 — CLI repair, README refresh, launch kit

## TL;DR

- **Critical:** `npx shortcut-genius` was crashing on load with `ERR_MODULE_NOT_FOUND` because `cli/commands/convert.ts` and `cli/commands/test.ts` were imported in `cli/index.ts` but the source files had never been committed. Both implemented now. CLI verified end-to-end: `--help`, `convert`, `test` all work against the example files in `examples/`.
- **README clone URL** corrected from `github.com/scrimwiggins/shortcut-genius` to the canonical `github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius`.
- **Phantom `ios-shortcuts` CLI references** swept from README, KB setup doc, upload UI, and launch-kit drafts. Replaced with the real flow: `npx shortcut-genius convert <file>.shortcut`.
- **`package.json`** bumped `1.0.0 → 1.1.1`, added `description` and `engines.node >= 18`.
- **CHANGELOG** updated with a `[1.1.1] - 2026-06-27` entry documenting all fixes.
- **Launch kit drafted** (NOT posted) under `launch-kit/`: X thread, LinkedIn, HN, Reddit, blog post, outreach emails.

## What changed (file-level)

```
 CHANGELOG.md                                                              |  21 ++-
 README.md                                                                 |  37 +++---
 cli/commands/config.ts                                                    |  10 +-
 cli/commands/convert.ts                                                   |  94 +++++++++++++++
 cli/commands/providers.ts                                                 |  10 +-
 cli/commands/test.ts                                                      | 108 +++++++++++++++++
 client/src/components/knowledge-base/KnowledgeBaseUpload.tsx              |   5 +-
 docs/KNOWLEDGE_BASE_SETUP.md                                              |  26 ++---
 launch-kit/blog-post.md                                                   |  70 +++++++++++
 launch-kit/hackernews.md                                                  |  56 +++++++++
 launch-kit/linkedin.md                                                    |  34 ++++++
 launch-kit/outreach-emails.md                                             | 129 +++++++++++++++++++++
 launch-kit/reddit.md                                                      |  56 +++++++++
 launch-kit/x-thread.md                                                    |  90 ++++++++++++++
 package.json                                                              |   6 +-
 server/routes/knowledge-base.ts                                           |   4 +-
 16 files changed, 707 insertions(+), 49 deletions(-)
```

## Verification

```bash
# CLI loads cleanly (was crashing before)
$ npx tsx cli/index.ts --help
Commands:
  build [options] <prompt>    Build iOS shortcut from text prompt using AI
  analyze [options] <file>    Analyze existing iOS shortcut
  convert [options] <file>    Convert an iOS .shortcut file (plist) into Knowledge Base JSON
  test [options] <file>       Statically validate a Knowledge Base shortcut JSON file
  models [options]            List available AI models
  providers                   Manage API provider configurations
  config                      View or edit CLI configuration

# Convert + test round-trip on the example file
$ npx tsx cli/index.ts convert examples/hello-world.shortcut
✓ Converted Hello World — 1 actions, complexity 1.5
  examples/hello-world.shortcut.json

$ npx tsx cli/index.ts test examples/hello-world.shortcut.json
✓ PASS Hello World
  actions:    1
  complexity: 1.5
```

## Test plan

- [x] `npx tsx cli/index.ts --help` loads with 7 commands
- [x] `convert` produces valid KB JSON from `examples/hello-world.shortcut`
- [x] `test` validates the produced JSON (PASS, 1 action)
- [ ] Full server-mode smoke test (`npm run dev` + upload round-trip) — needs `.env` with provider keys, out of scope for this PR
- [ ] Manual UI smoke test of the Knowledge Base tab upload flow

## Open follow-ups (not in this PR)

- iOS 26 / iOS 27 messaging — repo's README still says "iOS Shortcuts" generically. iOS 26 is current as of Jun 2026. A targeted doc PR can call out new Shortcuts creation APIs (Actions, App Intents, Apple Intelligence on-device) once the iOS 26 capability research lands.
- `examples/` only has 2 shortcuts (hello-world, weather-forecast). Consider adding a more representative "complex automation" example that showcases the Knowledge Base selector.
- `OPEN_SOURCE_READINESS.md` mentions a security score of 76/100 — verify whether anything changed in this PR affected that.
- The Tauri desktop app branch (`copilot/build-tauri-desktop-app`) was untouched. If desktop packaging is on the roadmap, that's the next major branch to track.

## Out-of-scope by design

- No `git push` was performed. The PR body and launch kit are staged locally for review.
- No social posts were made. Launch kit drafts are in `launch-kit/` as drafts only.
- No new remote branches or tags created.

## Reviewer notes

- The `convert` and `test` commands are intentionally **minimal viable** implementations: parse, validate, report. The full knowledge-base API and the runtime test bridge are already in `server/` — these CLI commands are local-first conveniences on top of that.
- All launch-kit drafts reference `github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius` (not the old `scrimwiggins` URL).