# Synthetic YAML Hallucination Generator

Use this prompt with any LLM to generate realistic pipeline YAML hallucinations for testing validators.

## LLM System Prompt

```
You are a YAML hallucination generator for testing pipeline validators. Your job is to generate INCORRECT pipeline YAML that mimics common LLM mistakes when generating Expanso / Benthos / Redpanda Connect configurations.

CORRECT STRUCTURE (for reference - DO NOT output this):
```yaml
input:
  kafka:
    addresses: [localhost:9092]
    topics: [my-topic]

pipeline:
  processors:
    - mapping: |
        root = this
        root.data = this.value.parse_json()

output:
  aws_s3:
    bucket: my-bucket
```

YOUR TASK: Generate INCORRECT YAML with realistic hallucination patterns.

## HALLUCINATION CATEGORIES TO GENERATE:

### Category 1: Structure Hallucinations
- Use "components:" instead of "input:/pipeline:/output:"
- Use "type: kafka" instead of "kafka:" directly
- Use "steps:" or "stages:" instead of "processors:"
- Use "with:" instead of "processors:"
- Split into multiple YAML documents with "---"
- Add "version:", "apiVersion:", "kind:" (Kubernetes-style)
- Use "sources:" and "sinks:" instead of "input:/output:"
- Nest components incorrectly (e.g., "pipeline: input: kafka:")

### Category 2: Bloblang Syntax Hallucinations
- Use from_json(x) instead of x.parse_json()
- Use to_json(x) instead of x.format_json()
- Use "if x then y else z" instead of "if x { y } else { z }"
- Use "return value" instead of "root = value"
- Use "var x = ..." or "const x = ..." instead of "let x = ..."
- Use .map(x => ...) instead of .map_each(x -> ...)
- Use .filter(x => ...) instead of .filter(x -> ...)
- Use ${variable} interpolation inside mapping blocks
- Use "null" instead of "deleted()" to drop messages
- Use "root = nil" or "root = None"
- Use Python/JS-style string formatting: f"..." or `template ${var}`
- Use "for x in items:" loop syntax
- Use "async/await" keywords

### Category 3: Component Name Hallucinations
- Use "s3:" instead of "aws_s3:"
- Use "elasticsearch:" instead of "elasticsearch_v8:"
- Use "postgres:" or "mysql:" instead of "sql_select:"
- Use "http:" instead of "http_client:" or "http_server:"
- Use made-up components: "resize:", "image:", "audio:", "video:", "rtsp:"
- Use "transform:" instead of "mapping:"
- Use "filter:" as a processor (not valid)
- Misspell: "kafaka:", "mongdb:", "elasitcsearch:", "blobl:"
- Use generic names: "database:", "queue:", "stream:", "api:"

### Category 4: Configuration Hallucinations
- Use wrong field names: "host:" instead of "addresses:", "topic:" instead of "topics:"
- Use wrong nesting: put processor config at wrong level
- Mix configuration styles from different systems (Docker, K8s, GitHub Actions)
- Use environment variable syntax incorrectly: "$VAR" instead of "${VAR}"
- Add non-existent fields: "retry:", "timeout:", "batch:" at wrong levels

### Category 5: Mixed/Compound Hallucinations
- Combine 2-3 hallucination types in one config
- Create configs that look plausible but are subtly wrong
- Mix correct and incorrect syntax in the same file

## OUTPUT FORMAT:

For each hallucination, output:
```yaml
# HALLUCINATION_ID: <unique_id>
# CATEGORY: <category_name>
# ERRORS: <list of intentional errors>
---
<the incorrect YAML>
```

## GENERATION INSTRUCTIONS:

1. Generate diverse examples across all categories
2. Make them realistic - these should look like real LLM outputs
3. Vary complexity from simple (1 error) to complex (5+ errors)
4. Include both obvious and subtle mistakes
5. Generate configs for various use cases: ETL, streaming, AI pipelines, etc.
```

## User Prompt (for batch generation)

```
Generate 50 unique YAML hallucinations for Expanso pipelines.

Distribution:
- 10 structure hallucinations (Category 1)
- 15 Bloblang syntax hallucinations (Category 2)
- 10 component name hallucinations (Category 3)
- 5 configuration hallucinations (Category 4)
- 10 mixed/compound hallucinations (Category 5)

For each one, include realistic user questions that might have prompted this output, such as:
- "Show me a Kafka to S3 pipeline"
- "How do I parse JSON and filter events?"
- "Create a pipeline that processes images"
- "Write a config for real-time analytics"

Output as a JSON array for easy parsing.
```

## Running the Generator

```bash
# Using Claude API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 8000,
    "system": "<paste system prompt above>",
    "messages": [{"role": "user", "content": "<paste user prompt above>"}]
  }' | jq '.content[0].text' > hallucinations.json
```

## Using Results to Improve Validator

1. Run each hallucination through the validator
2. Check detection rate per category
3. Add missing detection patterns
4. Build regression test suite
