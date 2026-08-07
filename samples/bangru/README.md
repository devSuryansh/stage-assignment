# Bangru sample pack

Live regeneration from `fixtures/sample-5scenes.txt` via:

- Chat: `gemini-2.5-flash` (Google OpenAI-compatible endpoint)
- Images: Pollinations keyless `flux` fallback (account Pollen balance was `0.0000`, so keyed `nanobanana` reference conditioning returned HTTP 402)

## Contents

- `adapted_screenplay.txt` — scene-by-scene Bangru adaptation
- `breakdown.json` / `continuity_report.md` — extraction + continuity (0 issues on this run)
- `images/` — character bible, costumes, scene keyframes
- `ai-usage-log.jsonl` — multi-line live usage log
- `production-pack.zip` — export bundle

## Re-run

```bash
# Prefer nanobanana once Pollen is topped up at enter.pollinations.ai
npm run sample
```

With Pollen available, costumes/scenes will condition on the character reference PNG instead of falling back to flux.
