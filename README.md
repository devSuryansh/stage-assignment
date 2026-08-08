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

- **Chat (free):** Groq OpenAI-compatible API (`llama-3.3-70b-versatile`). HF Inference Providers is optional and burns a tiny monthly credit pool (~$0.10).
- **Images (free):** Pollinations `flux` (no key). Optional HF Kontext edits when `HF_IMAGES=1` and you still have credits.
- **Offline fallback:** generic screenplay parser only — no hardcoded fixture answers.

## Setup

```bash
cp .env.example .env
# Free chat key (no credit card):
# https://console.groq.com/keys
# GROQ_API_KEY=gsk_...

npm install
npm run dev
```

| Variable | Default | Role |
|---|---|---|
| `GROQ_API_KEY` | — | Free chat for extract + adapt |
| `GROQ_CHAT_MODEL` | `llama-3.3-70b-versatile` | Chat model |
| `HF_TOKEN` | — | Optional; only if you want HF routing/images |
| `HF_IMAGES` | off | Set `1` to prefer HF image models |
| `DATA_DIR` | `data` locally; `/tmp/data` on Vercel | Job JSON + images |

## Deploy on Vercel

1. Push the repo and import it in [Vercel](https://vercel.com/new).
2. Set `GROQ_API_KEY` (Production + Preview). Optional: `HF_TOKEN` / `HF_IMAGES`.
3. Deploy. API routes under `/api/jobs/**` run with `maxDuration: 300`.
4. Bundled `samples/bangru/` is the durable showcase when serverless storage is wiped.

```bash
npx vercel env add GROQ_API_KEY
npx vercel --prod
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local Next.js app |
| `npm test` | Vitest (parser, continuity, costume dedupe, approval gate) |
| `npm run sample` | Live end-to-end regeneration of `samples/bangru/` |

## Design decisions

- **Two extraction passes** for output depth, not input truncation — per-scene prompts yield richer production detail.
- **Identity lock is a reference image**, not a prompt adjective. Character bible first; costumes and keyframes condition on that PNG via HF image-to-image.
- **Approval gate is server-enforced** (`status === awaiting_approval` + `approved: true`).
- **Prop continuity uses token overlap** after normalizing parentheticals/stopwords, so paraphrases do not spam false warnings.
- **Multi-culture checkbox removed** rather than shipping a half-feature (`job.cultures` was written and never read). See LIMITATIONS.md.

## Demo talking points

- How face consistency works: character bible → HF `imageToImage` (Kontext) with that PNG as input.
- Broken JSON: `response_format: json_object` (when the provider supports it) + zod + repair pass.
- Alias merge: name/alias cross-match into one canonical id.
- Weakest parts (own them): dialect authenticity unverified by a native speaker; continuity is heuristic, not semantic.

## License

Assignment submission — see repository owner for distribution.
