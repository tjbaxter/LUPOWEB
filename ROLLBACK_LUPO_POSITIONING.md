# Rollback — LUPO homepage positioning cleanup

Branch: `lupo-homepage-positioning-cleanup` (off `main`). Not pushed.
All changes are to `index.html` only. Rollback artifacts live in `rollback/` and are **untracked** (never committed, so they never deploy).

## Commits (each is one isolated change)

| # | Section | Commit | What it changes |
|---|---------|--------|-----------------|
| 1 | Hero | `fd43267` | Removes "enriches" from the hero subheading |
| 2 | Positioning section | `21d6e5b` | "LUPO runs the inbound qualification layer in between" (was "everything"); names the noise it filters; drops the triage line |
| 3 | How LUPO works | `65a0372` | Leaner flow prose (`.lf-sr`); company-level enrichment only; drops person-level de-anon emphasis |
| 4 | Chat section / Fin comparison | `4789ab1` | Chat = 1 of 4 channels; left card "From first reply to qualified lead"; Fin sub "replies"; keeps "7× faster" |
| 5 | One brain | `43599f2` | Names web form, email, chat, phone explicitly; adds "one consistent qualification record" |

## A. Whole rollback

If the branch has NOT been merged (current state):

```sh
git checkout main
git branch -D lupo-homepage-positioning-cleanup
```

If the changes HAVE already been merged into `main`:

```sh
# revert all five, newest first
git revert 43599f2 4789ab1 65a0372 21d6e5b fd43267
```

## B. Section-specific rollback (revert one change, keep the rest)

```sh
git revert fd43267   # Hero
git revert 21d6e5b   # Positioning section
git revert 65a0372   # How LUPO works
git revert 4789ab1   # Chat section / Fin comparison
git revert 43599f2   # One brain
```

## C. Patch rollback (restore original text without git history)

Pre-change snapshots of the exact original markup (paste back in place):

- `rollback/full-before-lupo-positioning.patch` — full original `index.html`
- `rollback/hero-before.patch`
- `rollback/positioning-section-before.patch`
- `rollback/how-it-works-before.patch`
- `rollback/chat-section-before.patch`
- `rollback/one-brain-before.patch`

Reverse-apply a single committed change with the generated patches:

```sh
git apply -R rollback/0001-Update-homepage-hero-positioning-remove-enriches-fro.patch   # undo Hero
git apply -R rollback/0002-Tighten-homepage-positioning-section-inbound-qualifi.patch  # undo Positioning
git apply -R rollback/0003-Simplify-how-LUPO-works-flow-leaner-Capture-identify.patch  # undo How it works
git apply -R rollback/0004-Reframe-chat-channel-and-Fin-comparison-chat-1-of-4-.patch  # undo Chat/Fin
git apply -R rollback/0005-Emphasize-one-brain-across-channels-name-web-form-em.patch  # undo One brain
```

Nuclear option — restore the entire original homepage from the full snapshot:

```sh
cp rollback/full-before-lupo-positioning.patch index.html
```
