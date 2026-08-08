# Limitations

Honest constraints for reviewers.

## Dialect authenticity

Bangru adaptation is produced by an LLM with an explicit culture-lock card (`सै` / `के` / `म्हारा` / `थारा` / `कोन्या`, anti-transliteration rules). It has **not** been validated by a native Bangru speaker. Lines that still read as polished Hindi should be flagged and regenerated.

## Continuity detection

`detectContinuityIssues` is heuristic: normalized token overlap for props, costume change-reason checks, and missing after-state for important characters. It is not a semantic graph. Paraphrase matching clears the worst false positives but can still miss subtle contradictions.

## Image identity lock

Default images use free Pollinations `flux` with a stable seed and identity text in the prompt. True reference-image conditioning (character bible PNG → edit model) needs Hugging Face Kontext and Inference Providers credits (`HF_IMAGES=1`). That path is not LoRA / IP-Adapter grade. On the free Pollinations path, faces can drift across the pack.

## Provider cost reality

Hugging Face Inference Providers includes only a small monthly free credit (~$0.10 for free accounts). Chat + image runs burn it quickly (the approve error you may have seen). This app defaults to **Groq** (free chat tier) and **Pollinations flux** (free images). Set `GROQ_API_KEY` from https://console.groq.com/keys. Keep `HF_TOKEN` only if you still have credits or buy more.

## Multi-culture

The brief's multi-culture bonus is out of scope for this submission. The UI checkbox was removed so we do not pretend `job.cultures` is consumed. A second text-only culture pass is the natural follow-up.

## Serverless storage

Job JSON and images live on the local filesystem under `DATA_DIR` (default `data`, auto `/tmp/data` on Vercel). Ephemeral on serverless — the bundled `samples/bangru/` pack is the durable showcase when quotas or cold disks wipe runtime jobs.

## Offline mode

If chat is unreachable, extraction falls back to the **generic format parser** (sluglines + cues only). It will not invent production detail or Bangru dialogue. Adaptation and image generation require a live `HF_TOKEN`.
