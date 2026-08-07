# Limitations

Honest constraints for reviewers.

## Dialect authenticity

Bangru adaptation is produced by an LLM with an explicit culture-lock card (`सै` / `के` / `म्हारा` / `थारा` / `कोन्या`, anti-transliteration rules). It has **not** been validated by a native Bangru speaker. Lines that still read as polished Hindi should be flagged and regenerated.

## Continuity detection

`detectContinuityIssues` is heuristic: normalized token overlap for props, costume change-reason checks, and missing after-state for important characters. It is not a semantic graph. Paraphrase matching clears the worst false positives but can still miss subtle contradictions.

## Image identity lock

Reference conditioning (character bible → Pollinations `/v1/images/edits` on `nanobanana`) is the intended identity lock. It is not LoRA / IP-Adapter grade.

**Current sample pack:** the Pollinations account had **0.0000 Pollen**, so every keyed `nanobanana` call returned HTTP 402 and the pipeline fell back to keyless `flux`. That fallback has **no** reference conditioning — faces will drift across the pack. Top up Pollen (or enable Google image billing) and re-run `npm run sample` to restore the lock.

## Google image free tier

Gemini image models returned `GenerateRequestsPerDayPerProjectPerModel-FreeTier` with zero allowance at build time. Images therefore route to Pollinations, not Google.

## FreeLLMAPI image path

FreeLLMAPI's `/v1/images/generations` has no Google adapter and drops image parts on the Gemini emulation round-trip. Chat goes through FreeLLMAPI; images call Pollinations directly.

## Multi-culture

The brief's multi-culture bonus is out of scope for this submission. The UI checkbox was removed so we do not pretend `job.cultures` is consumed. A second text-only culture pass is the natural follow-up.

## Serverless storage

Job JSON and images live on the local filesystem under `DATA_DIR` (default `data`, use `/tmp/data` on Vercel). Ephemeral on serverless — the bundled `samples/bangru/` pack is the durable showcase when quotas or cold disks wipe runtime jobs.

## Offline mode

If chat is unreachable, extraction falls back to the **generic format parser** (sluglines + cues only). It will not invent production detail or Bangru dialogue. Adaptation and image generation require live keys.
