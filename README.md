# Cultural Adaptation Studio

A production-pack module for an AI-native film pipeline: adapt a short screenplay into **Bangru Haryanvi**, keep continuity strict, then generate a character / costume / scene visual pack — only after human approval.

Built as a STAGE Studio–shaped Next.js App Router app (TanStack Query status polling, Inter/Poppins, dark neutral surface).

## What it does

1. Upload or paste a screenplay (TXT / DOCX / PDF), or load the bundled 5-scene jail fixture.
2. Select Bangru Haryanvi (Haryana) + rural/urban setting.
3. **Parse** structure from format alone, then **two LLM passes**: global skeleton + per-scene production/continuity.
4. Review continuity issues and approve the adaptation + costume plan.
5. **Adapt scene-by-scene** with a Bangru culture-lock card; generate visuals with **reference-image identity lock**.
6. Export ZIP: screenplay, breakdown, bibles, continuity report, images, AI usage log.

## Architecture

```
upload → format parser → LLM pass 1 (characters/scenes)
                       → LLM pass 2 per scene (production + continuity)
                       → merge / continuity check → approval gate
                       → scene-by-scene Bangru adapt
                       → character bible image → costume + scene images (ref-conditioned)
                       → export ZIP
```

- **Chat:** FreeLLMAPI (`gemini-3.5-flash`), with optional direct Gemini OpenAI-compatible fallback.
- **Images:** Pollinations `nanobanana` (keyed) with `/v1/images/edits` reference conditioning; keyless `flux` + browser User-Agent as last resort.
- **Offline fallback:** generic screenplay parser only — no hardcoded fixture answers.

## Setup

```bash
cp .env.example .env
# FREELLMAPI_API_KEY, FREELLMAPI_CHAT_MODEL=gemini-3.5-flash
# POLLINATIONS_API_KEY
# optional: GOOGLE_API_KEY for chat fallback
# on Vercel: DATA_DIR=/tmp/data

npm install
npm run dev
```

### FreeLLMAPI (recommended chat router)

```bash
curl -fsSL https://freellmapi.co/install.sh | bash
# open http://localhost:3001 — add provider keys — copy unified API key
```

Point `FREELLMAPI_BASE_URL` at `http://localhost:3001/v1`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local Next.js app |
| `npm test` | Vitest (parser, continuity, costume dedupe, approval gate) |
| `npm run sample` | Live end-to-end regeneration of `samples/bangru/` |

## Design decisions

- **Two extraction passes** for output depth, not input truncation — per-scene prompts yield richer production detail.
- **Identity lock is a reference image**, not a prompt adjective. Character bible first; costumes and keyframes condition on that PNG.
- **Approval gate is server-enforced** (`status === awaiting_approval` + `approved: true`).
- **Prop continuity uses token overlap** after normalizing parentheticals/stopwords, so paraphrases do not spam false warnings.
- **Multi-culture checkbox removed** rather than shipping a half-feature (`job.cultures` was written and never read). See LIMITATIONS.md.

## Demo talking points

- How face consistency works: reference-image conditioning via Pollinations edits.
- Broken JSON: `response_format: json_object` + zod + repair pass.
- Alias merge: name/alias cross-match into one canonical id.
- Weakest parts (own them): dialect authenticity unverified by a native speaker; continuity is heuristic, not semantic.

## License

Assignment submission — see repository owner for distribution.
