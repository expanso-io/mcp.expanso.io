# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server for semantic search over Expanso documentation. Deployed on Cloudflare Workers with Vectorize for vector search. Serves both HTTP API and MCP protocol endpoints at `mcp.expanso.io`. The server never calls a text-generation model: the only Workers AI model it uses is the embedding model for search.

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
├── mcp.ts                # MCP protocol (JSON-RPC tools, TOOLS registry)
├── handlers.ts           # Search/resource handlers (Vectorize queries, keyword fallback)
├── home-page.ts          # Root page: client setup, tool list from TOOLS, docs search box
├── pipeline-validator.ts # YAML validation for Expanso/Benthos pipelines (component registry)
├── examples-registry.ts  # Curated pipeline examples with metadata
└── analytics.ts          # PostHog event tracking

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
- **Analytics**: PostHog tracking for page views, searches, tool calls, resource reads

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root page: how to connect a client, tool list, docs search box |
| `/chat` | GET | 301 redirect to `/` |
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
