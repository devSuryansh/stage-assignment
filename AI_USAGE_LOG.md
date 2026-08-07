# AI usage log

Runtime logs are JSONL files written per job:

`data/jobs/<job-id>/ai-usage-log.jsonl`

Each line:

```json
{"ts":"ISO-8601","purpose":"extract_screenplay","model":"auto:smart","routedVia":"provider/model","latencyMs":1234,"promptTokens":100,"completionTokens":200,"ok":true}
```

Sample offline run: [`samples/bangru/ai-usage-log.jsonl`](samples/bangru/ai-usage-log.jsonl)

Purposes used by the app:

- `extract_screenplay` / `extract_screenplay:json_repair`
- `adapt_screenplay_bangru`
- `image_character_<id>` / `image_costume_<id>` / `image_scene_<n>`
- fallback markers when Pollinations is used after FreeLLMAPI image failure
