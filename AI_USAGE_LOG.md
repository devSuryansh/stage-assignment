# AI usage log

Runtime calls append JSON lines to each job's `ai-usage-log.jsonl` and to `samples/bangru/ai-usage-log.jsonl` after `npm run sample`.

## Expected purposes

| purpose | model (typical) | notes |
|---|---|---|
| `extract_pass1_skeleton` | `gemini-2.5-flash` | global characters + scene skeleton |
| `extract_pass2_scene_N` | same | per-scene production + continuity |
| `adapt_scene_N` | same | Bangru scene rewrite with prior-scene context |
| `image_character_*` | `nanobanana` or `pollinations-flux-fallback` | text-only character bible |
| `image_costume_*` | same (+ edits ref when Pollen available) | conditioned on character PNG when keyed path works |
| `image_scene_*` | same (+ edits ref when Pollen available) | conditioned on character PNG when keyed path works |

Failures are logged with `ok: false` and an `error` string. Flux fallbacks appear as `pollinations-flux-fallback` (often with a 402 insufficient-balance note).

## Sample pack

Committed `samples/bangru/ai-usage-log.jsonl` is a **23-line** live run (`gemini-2.5-flash` + flux fallback). Regenerate after topping up Pollen with:

```bash
npm run sample
```
