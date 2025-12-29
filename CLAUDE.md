# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server for semantic search over Expanso documentation. Deployed on Cloudflare Workers with Vectorize for vector search. Serves both HTTP API and MCP protocol endpoints at `mcp.expanso.io`.

## Commands

```bash
just dev           # Local development server (wrangler dev)
just deploy        # Full deploy: worker + content indexing
just deploy-worker # Deploy worker without re-indexing
just typecheck     # Type check (tsc --noEmit)
just test          # Run tests (vitest)
just index         # Re-index content to Vectorize
just tail          # View production logs
```

## Architecture

```
src/
├── index.ts              # Main worker entry, route handling, YAML validation
├── mcp.ts                # MCP protocol (JSON-RPC tools: search_docs, get_resource, list_resources)
├── handlers.ts           # Search/resource handlers (Vectorize queries, keyword fallback)
├── pipeline-validator.ts # YAML validation for Expanso/Benthos pipelines (component registry)
├── examples-registry.ts  # Curated pipeline examples with metadata
├── docs-links.ts         # Component reference extraction from YAML
├── analytics.ts          # PostHog event tracking
└── chat-ui.ts            # HTML5 chat interface with YAML editor

scripts/
├── deploy.sh             # Orchestrates worker deploy + content indexing
└── index-content.ts      # Fetches llms.txt, generates embeddings, uploads to Vectorize
```

### Cloudflare Bindings (wrangler.toml)

- **AI**: Workers AI for embeddings (`@cf/baai/bge-base-en-v1.5`)
- **VECTORIZE**: Vector index `expanso-docs` for semantic search
- **CONTENT_CACHE**: KV namespace for caching fetched content

### Key Patterns

- **Search fallback**: If Vectorize unavailable, falls back to keyword search over cached content
- **External validation**: YAML validated against `https://validate.expanso.io/validate`
- **CORS**: All origins allowed (`Access-Control-Allow-Origin: *`)
- **Analytics**: PostHog tracking for page views, searches, chat, YAML feedback

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` or `/chat` | GET | Interactive chat UI |
| `/api/search?q=<query>` | GET | Semantic search (optional: `limit`, `domain`) |
| `/api/resources` | GET | List all documentation resources |
| `/api/resources/<uri>` | GET | Get resource content (URL-encoded URI) |
| `/mcp` | POST | MCP JSON-RPC handler |
| `/mcp/sse` | GET | MCP over Server-Sent Events |
| `/api/validate` | POST | YAML pipeline validation |

## Indexed Domains

- `expanso.io` - Product overview, industries, use cases
- `docs.expanso.io` - Platform documentation, CLI, components
- `examples.expanso.io` - Production-ready pipeline examples
- `docs.bacalhau.org` - Bacalhau distributed compute docs

## Environment Variables

Set in `wrangler.toml`:
- `DOCS_DOMAINS` - Comma-separated list of domains to index
- `POSTHOG_API_KEY` - Analytics key

For indexing scripts:
- `CLOUDFLARE_API_TOKEN` - Worker deployment
- `CLOUDFLARE_API_TOKEN_TOKENIZE` - Vectorize indexing (separate token)
- `CLOUDFLARE_ACCOUNT_ID` - Read from wrangler.toml

## Pipeline Validator

The `pipeline-validator.ts` contains a component registry for validating Expanso/Benthos/Redpanda Connect YAML pipelines. It validates:
- Component names and types (inputs, outputs, processors, etc.)
- Field names within components
- Bloblang expression syntax (basic validation)
- Common hallucination patterns (e.g., wrong cache types, invalid broker configs)

When adding new components, update the `COMPONENT_REGISTRY` object.

## Task Tracking

Use `bd` (Beads) for task tracking. See `.beads/` directory for issue storage.
