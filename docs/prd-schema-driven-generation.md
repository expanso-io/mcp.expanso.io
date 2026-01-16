# PRD: Schema-Driven Pipeline Generation

> **Ralph-Ready Checklist:** Before running, verify all [ ] boxes can be checked:
> - [x] Every criterion is testable (not subjective)
> - [x] Verification commands exist for each phase
> - [x] Completion signal is defined
> - [x] Escape hatch exists for blockers
> - [x] Out of scope is explicit

## Completion Signal

Output `<promise>COMPLETE</promise>` when ALL phases pass verification.

## Global Verification

```bash
# This command must exit 0 for the PRD to be considered complete
npm run typecheck && npm test -- --run
```

## Context

**Repository:** mcp.expanso.io
**Working Directory:** /Users/daaronch/code/mcp.expanso.io
**Key Files:**
- `src/index.ts` - Main chat handler (lines 707-1242)
- `src/schema-generator.ts` - NEW: Schema-driven generation module
- `src/pattern-suggester.ts` - TO BE SIMPLIFIED
- `src/component-catalog.ts` - TO BE DELETED
- `src/component-schemas.ts` - TO BE DELETED

## Problem Statement

The current MCP architecture is **6/10 schema-driven** with too much hardcoded knowledge:
- 292 components hardcoded in `component-catalog.ts`
- Manual field schemas in `component-schemas.ts`
- `CONCEPT_TO_COMPONENTS` mapping requires maintenance
- Pattern suggester uses regex-based intent extraction

**Solution:** Feed LLM the actual schema from `validate.expanso.io/schema`, let it generate YAML, validate, and iterate on errors.

```
User query → LLM + Schema → YAML → Validate → (if error) → LLM + Error → YAML → Done
```

---

## Phases

### Phase 1: Schema Client Module

**Goal:** Create a module to fetch and cache the schema from validate.expanso.io

**Files to Create/Modify:**
- `src/schema-client.ts` (NEW)
- `src/schema-client.test.ts` (NEW)

**Acceptance Criteria:**
- [ ] `fetchSchema()` fetches from `https://validate.expanso.io/schema`
- [ ] `fetchComponents()` fetches from `https://validate.expanso.io/components`
- [ ] Schema is cached in Cloudflare KV with 1-hour TTL
- [ ] Fallback to stale cache if fetch fails
- [ ] TypeScript types for schema response
- [ ] Unit tests mock fetch, verify caching logic

**Verification:**
```bash
npm test -- --run src/schema-client.test.ts
```

**Done when:** Verification command exits 0

---

### Phase 2: Schema-Driven Generator

**Goal:** Create the core LLM-based generator that uses schema instead of hardcoded mappings

**Depends on:** Phase 1

**Files to Create/Modify:**
- `src/schema-generator.ts` (NEW)
- `src/schema-generator.test.ts` (NEW)

**Acceptance Criteria:**
- [ ] `generatePipelineFromSchema(userQuery: string, schema: Schema)` function
- [ ] Builds prompt with schema context (component lists, field definitions)
- [ ] Calls Workers AI (Llama 3.3-70B) to generate YAML
- [ ] Returns generated YAML string
- [ ] Schema is intelligently truncated to fit context window (prioritize relevant components)
- [ ] Tests verify prompt construction includes schema
- [ ] Tests verify YAML output format

**Verification:**
```bash
npm test -- --run src/schema-generator.test.ts
```

**Done when:** Verification command exits 0

---

### Phase 3: Validation Loop with Error Correction

**Goal:** Implement the validate-and-correct loop that iterates until YAML is valid

**Depends on:** Phase 1, Phase 2

**Files to Create/Modify:**
- `src/schema-generator.ts` (extend)
- `src/schema-generator.test.ts` (extend)

**Acceptance Criteria:**
- [ ] `generateValidPipeline(userQuery: string)` orchestrates the full flow
- [ ] Calls `validateWithExpanso()` after generation
- [ ] If invalid, feeds errors back to LLM with correction prompt
- [ ] Max 3 retry attempts before falling back to examples
- [ ] Falls back to example-based suggestion if schema approach fails
- [ ] Tests verify retry logic with mock validation errors
- [ ] Tests verify fallback to examples triggers correctly

**Verification:**
```bash
npm test -- --run src/schema-generator.test.ts
```

**Done when:** Verification command exits 0

---

### Phase 4: Integration with Chat Handler

**Goal:** Replace the current pattern-based generation in index.ts with schema-driven generator

**Depends on:** Phase 3

**Files to Create/Modify:**
- `src/index.ts` (modify lines 707-1242)

**Acceptance Criteria:**
- [ ] Chat handler calls `generateValidPipeline()` instead of pattern suggester
- [ ] Existing `searchExamples()` only used as fallback
- [ ] Response cleaning still applied (response-cleaner.ts)
- [ ] Component documentation links still added to response
- [ ] All existing chat tests pass
- [ ] Debug mode (`?debug=true`) shows schema-based generation info

**Verification:**
```bash
npm test -- --run src/mcp.test.ts
```

**Done when:** Verification command exits 0

---

### Phase 5: Simplify Pattern Suggester

**Goal:** Remove hardcoded mappings from pattern-suggester.ts, keep only fallback logic

**Depends on:** Phase 4

**Files to Create/Modify:**
- `src/pattern-suggester.ts` (simplify)
- `src/pattern-suggester.test.ts` (update)

**Acceptance Criteria:**
- [ ] Remove `CONCEPT_TO_COMPONENTS` mapping (lines 38-114)
- [ ] Remove `extractIntent()` function (lines 173-281)
- [ ] Remove `scoreExample()` function (lines 296-414)
- [ ] Keep only `suggestPipelinePatterns()` that searches examples by keyword
- [ ] Renamed to `example-fallback.ts` for clarity
- [ ] Tests updated to reflect simplified interface

**Verification:**
```bash
npm test -- --run src/example-fallback.test.ts
```

**Done when:** Verification command exits 0

---

### Phase 6: Remove Deprecated Files

**Goal:** Delete hardcoded catalog and schema files that are no longer needed

**Depends on:** Phase 5

**Files to Delete:**
- `src/component-catalog.ts`
- `src/component-catalog.test.ts`
- `src/component-schemas.ts`
- `src/component-schemas.test.ts`

**Files to Modify:**
- `src/index.ts` - Remove imports
- `src/mcp.ts` - Update `get_component_schema` tool to use live schema

**Acceptance Criteria:**
- [ ] `component-catalog.ts` deleted
- [ ] `component-schemas.ts` deleted
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] `get_component_schema` MCP tool fetches from schema client
- [ ] `list_components` MCP tool fetches from `/components` endpoint
- [ ] All tests pass

**Verification:**
```bash
npm run typecheck && npm test -- --run
```

**Done when:** Verification command exits 0

---

### Phase 7: Integration Testing & Polish

**Goal:** End-to-end testing with real validate.expanso.io API

**Depends on:** Phase 6

**Files to Create/Modify:**
- `src/integration.test.ts` (NEW)
- `README.md` (update architecture docs)

**Acceptance Criteria:**
- [ ] Integration test: "kafka to s3" generates valid YAML
- [ ] Integration test: "sql to elasticsearch" generates valid YAML
- [ ] Integration test: "webhook to kafka with filtering" generates valid YAML
- [ ] Integration test: Invalid query gracefully falls back to examples
- [ ] All tests pass including integration tests
- [ ] README documents new architecture
- [ ] No lint errors

**Verification:**
```bash
npm run typecheck && npm test -- --run
```

**Done when:** Verification command exits 0

---

## Escape Hatch

If stuck on the same issue for 5+ iterations:

1. **Document the blocker** in `BLOCKERS.md`:
   ```markdown
   ## [Phase Name] - [Issue Summary]
   - What was attempted
   - Why it failed
   - Suggested next steps for human review
   ```

2. **Skip to next phase** if possible

3. **Signal partial completion** if all remaining phases are blocked:
   ```
   <promise>BLOCKED</promise>
   ```

## Out of Scope

**DO NOT implement these** (even if they seem related):
- Semantic/vector search for examples (keep keyword-based)
- Streaming responses during generation
- Custom model selection (stick with Llama 3.3-70B)
- Schema caching in browser/client (server-side only)
- Backwards compatibility shims for old API responses
- Documentation website updates
- Performance benchmarking

## Technical Constraints

- **LLM:** Cloudflare Workers AI - Llama 3.3-70B (existing)
- **Cache:** Cloudflare KV for schema caching
- **Validation API:** `https://validate.expanso.io/validate`
- **Schema API:** `https://validate.expanso.io/schema` (353KB JSON)
- **Context limit:** Schema must be truncated intelligently to ~50KB for LLM context

## Notes for Claude

- The schema from `/schema` is 353KB - too large for full context. Extract relevant component definitions based on user query keywords.
- Use `/components` endpoint (1KB) to get list of available component names first.
- Existing `validateWithExpanso()` function in index.ts already handles validation - reuse it.
- `response-cleaner.ts` must still be applied to all LLM outputs.
- Workers AI binding is `env.AI` - see existing usage in index.ts.
- Keep examples registry (`examples-data.ts`) intact for fallback - just don't use it as primary.

---

## Invocation

```bash
/ralph-loop "$(cat docs/prd-schema-driven-generation.md)" \
  --completion-promise "COMPLETE" \
  --max-iterations 35
```

**Phases:** 7
**Estimated effort:** ~30-35 iterations
