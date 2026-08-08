# AI usage log

Runtime calls append JSON lines to each job's `ai-usage-log.jsonl` and to `samples/bangru/ai-usage-log.jsonl` after `npm run sample`.

## Expected purposes

| purpose | model (typical) | notes |
|---|---|---|
| `extract_pass1_skeleton` | `llama-3.3-70b-versatile` (Groq) | global characters + scene skeleton |
| `extract_pass2_scene_N` | same | per-scene production + continuity |
| `adapt_scene_N` | same | Bangru scene rewrite with prior-scene context |
| `image_character_*` | `pollinations-flux` | free text-to-image |
| `image_costume_*` | `pollinations-flux` (or HF Kontext if `HF_IMAGES=1`) | identity via prompt/seed, or ref edit |
| `image_scene_*` | same | same |

Failures are logged with `ok: false` and an `error` string.

## Sample pack

Regenerate with a valid `HF_TOKEN`:

```bash
npm run sample
```
