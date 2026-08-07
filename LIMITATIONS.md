# Cultural Adaptation Studio — known limitations

## Free-tier inference (FreeLLMAPI)

- Latency and availability vary by provider quota and time of day.
- Models may fail over mid-run; the app retries and logs `ai-usage-log.jsonl`.
- If chat fails entirely, extraction/adaptation fall back to a deterministic heuristic so the MVP remains demoable offline.
- If image generation via FreeLLMAPI fails, the client falls back to keyless Pollinations.

## Visual consistency

- Free image models do not offer strong face-lock / IP-Adapter reference control.
- Consistency relies on frozen identity-lock prompt strings, costume ID reuse, and a shared style prefix.
- Expect recognizable roles and costumes more reliably than pixel-perfect faces.

## Scope

- Optimized for 3–5 scene screenplays (fixture: first 5 jail scenes).
- Full feature-length PDFs are ingestible but not the acceptance path.
- Second culture checkbox records an independent culture selection; primary Bangru pipeline is fully implemented.

## Cultural precision

- Primary target is Bangru Haryanvi (Haryana). Quality depends on the free chat model available through FreeLLMAPI at runtime.
- Always review dialogue before treating output as production-ready.
