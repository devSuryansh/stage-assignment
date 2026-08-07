# AI usage log

Runtime calls append JSON lines to each job's `ai-usage-log.jsonl` and to `samples/bangru/ai-usage-log.jsonl` after `npm run sample`.

## Expected purposes

| purpose | model (typical) | notes |
|---|---|---|
| `extract_pass1_skeleton` | `gemini-3.5-flash` via FreeLLMAPI | global characters + scene skeleton |
| `extract_pass2_scene_N` | same | per-scene production + continuity |
| `adapt_scene_N` | same | Bangru scene rewrite with prior-scene context |
| `image_character_*` | `nanobanana` | text-only character bible |
| `image_costume_*` | `nanobanana` (+ edits ref) | conditioned on character PNG |
| `image_scene_*` | `nanobanana` (+ edits ref) | conditioned on character PNG |

Failures are logged with `ok: false` and an `error` string. Flux fallbacks appear as `pollinations-flux-fallback`.

## Sample pack

The committed `samples/bangru/ai-usage-log.jsonl` must be a **multi-line** live run, not a single `{"purpose":"sample_script","model":"heuristic"}` stub. Regenerate with:

```bash
npm run sample
```
