# Bangru sample pack

Live regeneration from `fixtures/sample-5scenes.txt`:

- Chat: Groq `llama-3.3-70b-versatile` (free tier)
- Images: Pollinations `flux` (free; optional HF Kontext when `HF_IMAGES=1`)

## Contents

- `adapted_screenplay.txt` — scene-by-scene Bangru adaptation
- `breakdown.json` / `continuity_report.md` — extraction + continuity
- `images/` — character bible, costumes, scene keyframes
- `ai-usage-log.jsonl` — multi-line live usage log
- `production-pack.zip` — export bundle

## Re-run

```bash
# Requires GROQ_API_KEY from https://console.groq.com/keys
npm run sample
```
