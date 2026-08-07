# Cultural Screenplay & Visual Adaptation Studio

48-hour MVP: adapt a short screenplay into **Bangru Haryanvi** with strict continuity, then generate a character / costume / scene visual pack using **free** OpenAI-compatible inference via [FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi).

## What it does

1. Upload or paste a screenplay (TXT / DOCX / PDF), or load the bundled 5-scene jail fixture.
2. Select Bangru Haryanvi (Haryana) + rural/urban setting.
3. Extract scenes, canonical characters/locations/props/costumes, and continuity.
4. Review continuity issues and approve the adaptation + costume plan.
5. Generate adapted screenplay + visual pack.
6. Export ZIP: screenplay, breakdown, bibles, continuity report, images, AI usage log.

## Prerequisites

- Node.js 20+
- FreeLLMAPI running locally (recommended)

### Start FreeLLMAPI

```bash
curl -fsSL https://freellmapi.co/install.sh | bash
# open http://localhost:3001 — add free provider keys — copy unified API key
```

Or Docker Compose from the FreeLLMAPI repo. Point this app at `http://localhost:3001/v1`.

## Setup

```bash
cp .env.example .env
# edit FREELLMAPI_API_KEY

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without FreeLLMAPI, extraction/adaptation still run via heuristic fallback; images attempt Pollinations fallback.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production |
| `npm test` | Unit tests (dedupe, continuity, fixture extract) |
| `npm run sample` | Build sample Bangru pack under `samples/bangru/` |

## Demo checklist (3–5 minutes)

1. Home → **Use 5-scene jail fixture (Bangru)**.
2. Extract page: show 5 scenes, merged characters (Convict/Havaldar/Dagdu/Ganpat), continuity notes on collar lump.
3. Approve: culture plan + unique costumes → **Approve & generate**.
4. Compare: original vs Bangru dialogue/action.
5. Gallery: character bible, costumes once each, scene keyframes.
6. Export: download ZIP; open continuity report.

## Acceptance fixture

`fixtures/sample-5scenes.txt` — first five scenes from `12Vini_Prem_Screenplay_Sample.pdf` (gate → barrack).

## Sample outputs

See `samples/bangru/` for adapted screenplay, breakdown, continuity report, and usage log from a local run.

## AI usage log

Each FreeLLMAPI / fallback call appends one JSON line to `data/jobs/<id>/ai-usage-log.jsonl` with purpose, model, latency, and success/error.

## License / notes

Assignment deliverable for personal evaluation. FreeLLMAPI is for personal experimentation; respect each upstream provider's free-tier terms.
