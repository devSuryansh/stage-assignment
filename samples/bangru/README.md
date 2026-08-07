# Bangru sample pack

**Status:** awaiting live regeneration (`npm run sample`) with FreeLLMAPI + Pollinations keys.

The previous pack was a heuristic stub (`NOTE: Heuristic offline adaptation`, single-line `model: heuristic` usage log). That path has been removed from the pipeline. Until keys are available in this environment, run:

```bash
cp .env.example .env   # fill FREELLMAPI_* and POLLINATIONS_API_KEY
npm run sample
```

This writes adapted screenplay, breakdown, continuity report, reference-conditioned images, multi-line `ai-usage-log.jsonl`, and `production-pack.zip`.
