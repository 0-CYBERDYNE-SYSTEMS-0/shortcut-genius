# STANDBY — ShortcutGenius v1.1.1 release

**Status: ready to fire on cue. Nothing posted, nothing pushed.**

Generated 2026-06-27 by the finalize-and-release sweep. All assets live in this directory.

---

## What's staged and ready

| Asset | Path | Status |
|-------|------|--------|
| Source-of-truth release notes | `CHANGELOG.md` (v1.1.1 entry dated 2026-06-27) | committed |
| Public README | `README.md` | committed |
| Knowledge Base setup doc | `docs/KNOWLEDGE_BASE_SETUP.md` | committed |
| CLI: `convert` + `test` commands | `cli/commands/convert.ts`, `cli/commands/test.ts` | committed, end-to-end tested |
| PR description | `launch-kit/PR_BODY.md` | ready to paste into `gh pr create --body-file` |
| X / Twitter thread (7 tweets) | `launch-kit/x-thread.md` | draft only |
| LinkedIn post (~1300 chars) | `launch-kit/linkedin.md` | draft only |
| Hacker News (title + first comment) | `launch-kit/hackernews.md` | draft only |
| Reddit r/shortcuts post | `launch-kit/reddit.md` | draft only |
| Blog post (~600 words) | `launch-kit/blog-post.md` | draft only |
| Outreach emails (6 recipients) | `launch-kit/outreach-emails.md` | draft only |

---

## Fire-on-cue checklist

Run in order. None of these were executed by the agent — they're here for you.

### 1. Push the branch and open the PR (~30 seconds)

```bash
cd /Users/scrimwiggins/clawd/repos/shortcut-genius
git push -u origin feature/ios-shortcuts-knowledge-base
gh pr create \
  --base main \
  --head feature/ios-shortcuts-knowledge-base \
  --title "fix: ship v1.1.1 — repair CLI, refresh README, add convert+test stubs" \
  --body-file launch-kit/PR_BODY.md
```

Expected: a PR URL like `https://github.com/0-CYBERDYNE-SYSTEMS-0/shortcut-genius/pull/<N>`.

### 2. Merge, tag, and publish the GitHub release (~2 minutes)

```bash
# After PR is merged:
git checkout main && git pull
git tag -a v1.1.1 -m "ShortcutGenius v1.1.1 — CLI repair, README refresh, Knowledge Base release"
git push origin v1.1.1

# Then on github.com → Releases → Draft a new release → choose v1.1.1
# Paste the [1.1.1] section of CHANGELOG.md as the release notes.
```

### 3. Publish the launch kit (timing-sensitive)

Recommended order — they cross-link.

| When | What | Where |
|------|------|-------|
| T+0 | Hacker News "Show HN" submission | news.ycombinator.com |
| T+0 | Reddit r/shortcuts post | reddit.com/r/shortcuts |
| T+30 min | X / Twitter thread | x.com |
| T+1 hr | LinkedIn post | linkedin.com |
| T+2 hr | Blog post (HackerNoon / dev.to / personal blog) | your platform of choice |
| T+1 day | Outreach emails to the 6 figures in `outreach-emails.md` | individual inboxes |

Rationale: HN + Reddit first so the substantive technical discussion has a venue. Then your bigger-audience platforms (X, LinkedIn) point at it. Outreach emails last — these are the most direct asks and benefit from the social proof being live.

### 4. Standby until "now"

Once the above is queued, the only outstanding automated action is **waiting for your go-ahead** on:

- The PR push (`git push`).
- The GitHub release tag and notes.
- Each launch-kit item — paste, then post.
- The 6 outreach emails — review and send individually (no auto-send).

---

## What's NOT done (by design)

- **No commits to main yet.** The release commit is on `feature/ios-shortcuts-knowledge-base`.
- **No push to GitHub.** Awaiting your go.
- **No social posts.** Drafts only.
- **No email sent.** Drafts only.
- **No tags created.** Awaiting merge.

---

## If something goes wrong during release

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `gh pr create` fails with auth error | Token expired | `gh auth refresh -s repo,workflow` |
| `npx shortcut-genius convert <file>` fails on real shortcut | The shortcut uses an action with no `WFWorkflowActionParameters` shape | Already handled (logs warning, still emits JSON) |
| `npm run dev` errors out | Missing `.env` API key for at least one provider | Copy `.env.example` → `.env` and add a key |
| HN submission gets flagged | Title sounds too marketing-y | Title in `hackernews.md` is deliberately neutral |
| Reddit post gets removed by mods | Cross-posting or premature link | The r/shortcuts draft has the link at the bottom of the body, not the title |

---

## Honest limitations of this release

- `convert` and `test` are minimal-viable. They don't auto-fix anything — they report.
- The Knowledge Base selector (smart complexity/action overlap) lives in the **server** (`server/agents/`) — these CLI commands are local-first front-ends to it.
- Security score is 76/100 per `SECURITY.md`. Acceptable for a local dev tool; not for public deployment.
- No automated tests were added for the new CLI commands. The verification was a manual smoke test.
- iOS 26 / iOS 27-specific messaging is **not** in the README. The repo references "iOS Shortcuts" generically. That's a deliberate scope cut to ship this PR cleanly.

---

## Final timing

| Phase | Started | Duration |
|-------|---------|----------|
| Repo audit + scope lock | 07:02 UTC | ~5 min |
| CLI repair (convert/test stubs + Commander 14 fix) | 07:07 UTC | ~12 min |
| Docs sweep (22 phantom refs across 8 files) | 07:19 UTC | ~8 min |
| Launch kit drafting (sub-agent) | 07:08 UTC | ~18 min |
| Verification + commit | 07:36 UTC | ~5 min |
| Standby report | 07:42 UTC | ~3 min |

Total: ~40 minutes of the 60-minute budget. **20-minute margin** for you to review, fire the checklist, and adapt if anything needs to change before going public.