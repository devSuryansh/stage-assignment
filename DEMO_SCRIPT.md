# Demo video script (~4:00)

Record in your own voice. Pre-warm one finished job and one fresh job in separate tabs.

## 0:00–0:20 — What it is
> This is a production-pack module for an AI-native film pipeline. We take a short screenplay, adapt it into Bangru Haryanvi from rural Haryana, keep continuity strict, and generate a visual pack — only after approval.

## 0:20–1:10 — Extraction (25%)
Click **Use 5-scene jail fixture** on the fresh job. Open the extraction table.
> Format parser cuts the scenes; two LLM passes fill characters and per-scene production. Aliases merge into one canonical id.

Scroll continuity issues — note they are sparse after prop normalization.

## 1:10–1:45 — Continuity + costumes (25% + 10%)
Show character cards and costume bible.
> Same costume record reused across scenes. Costume changes need an explicit reason.

## 1:45–2:05 — Approval gate
On approve page, mention the server requires `awaiting_approval` and `approved: true`. Click approve; narrate ~10s; cut to the finished tab.

## 2:05–2:55 — Adaptation (20%)
Side-by-side compare. Read one original line and its Bangru rewrite.
> Not transliteration — the insult and the power gesture change with the dialect.

## 2:55–3:40 — Gallery (identity lock)
Show character → costume → scene.
> The character reference PNG is fed back into the image model. That is the identity lock — not prompt adjectives alone.

## 3:40–4:00 — Export + tests
Download ZIP, open continuity report, cut to terminal: `npm test` passing. Close.
