# Expanso MCP Server

A Model Context Protocol (MCP) server for semantic search and retrieval over Expanso documentation. Deployed on Cloudflare Workers with Vectorize for vector search.

## Features

- **Semantic Search**: Query documentation using natural language
- **MCP Protocol**: Compatible with Claude, Cursor, Codex, ChatGPT and other MCP clients
- **Retrieval only**: No server-side text generation; the client's own model does the writing
- **Multi-Domain**: Searches across expanso.io, docs.expanso.io, and examples.expanso.io
- **HTTP API**: Direct API access for custom integrations
- **Edge Deployment**: Low latency via Cloudflare's global network

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   HTTP API  │  │ MCP Protocol │  │ Resource Handler  │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                │                    │             │
│         └────────────────┼────────────────────┘             │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │                   Search Handler                       │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│  ┌────────────┐  ┌────────────────┐  ┌─────────────┐       │
│  │ Workers AI │  │   Vectorize    │  │  KV Cache   │       │
│  │ (Embeddings)│  │ (Vector Store) │  │  (Content)  │       │
│  └────────────┘  └────────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### Prerequisites

1. [Cloudflare account](https://dash.cloudflare.com) with Workers paid plan (for Vectorize)
2. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
3. Node.js 18+

### Installation

```bash
cd mcp-server
npm install
```

### Create Cloudflare Resources

```bash
# Login to Cloudflare
wrangler login

# Create KV namespace for content cache
wrangler kv namespace create CONTENT_CACHE
# Update wrangler.toml with the returned ID

# Create Vectorize index
wrangler vectorize create expanso-docs --dimensions=768 --metric=cosine
```

### Index Content

```bash
# Set environment variables
export CLOUDFLARE_ACCOUNT_ID=your-account-id
export CLOUDFLARE_API_TOKEN=your-api-token

# Run indexer
npm run index
```

Each run upserts the current chunks, then deletes every vector it did not
produce, so sections removed from the docs stop appearing in search. It skips
the delete step if any source failed to fetch for a reason other than 404/410.
If Vectorize keeps rejecting the list cursor while it applies the upserts, the
run deletes only the stale vectors it could list, warns that cleanup is
partial, and still succeeds. `npx tsx scripts/index-content.ts --cleanup-only`
retries the cleanup from the IDs saved in `.reindex-ids.json`, without
upserting again.

### Automatic Re-indexing

`.github/workflows/reindex.yml` re-indexes when docs.expanso.io deploys (a
`docs-deployed` repository dispatch), and hourly when the live
`https://docs.expanso.io/version.json` commit has not been indexed yet that day.
It needs the repository secret `CLOUDFLARE_API_TOKEN_TOKENIZE` (Workers AI Read,
Vectorize Edit). Without it the workflow warns and skips. A run whose stale
cleanup was partial does not record the commit as indexed, so the next hourly
run retries with `--cleanup-only`.

### Deploy

```bash
# Deploy to production
npm run deploy

# Or development
npm run dev
```

Pushes to `main` deploy automatically through `.github/workflows/deploy.yml`
(`wrangler versions upload`, then `wrangler versions deploy` at 100%), which
then checks that every resource the live server lists resolves. It does not
manage the `mcp.expanso.io` route: that stays as configured in Cloudflare, so
the deploy token needs no zone permission. It needs the repository secret
`CLOUDFLARE_API_TOKEN_WORKERS_DEPLOY` (Account > Workers Scripts > Edit) and
fails if it is missing.

## API Reference

### HTTP API

#### Search Documentation

```bash
GET /api/search?q=<query>&limit=<n>&domain=<domain>
```

Parameters:
- `q` (required): Search query
- `limit` (optional): Max results (default: 5, max: 20)
- `domain` (optional): Filter by domain

Example:
```bash
curl "https://mcp.expanso.io/api/search?q=circuit+breaker+pattern&limit=3"
```

#### List Resources

```bash
GET /api/resources
```

Returns all available documentation resources.

#### Get Resource Content

```bash
GET /api/resources/<encoded-uri>
```

Example:
```bash
curl "https://mcp.expanso.io/api/resources/https%3A%2F%2Fdocs.expanso.io%2Fllms%2Fgetting-started.txt"
```

### MCP Protocol

The server implements MCP protocol version 2024-11-05.

#### Tools

The root page at `https://mcp.expanso.io/` renders this list from the
`TOOLS` registry in `src/mcp.ts`, so it always matches `tools/list`.

1. **search_docs**: Semantic search over documentation
   - `query` (string, required): Search query
   - `limit` (number, optional): Max results
   - `domain` (string, optional): Filter by domain

2. **get_resource**: Retrieve full content of a resource
   - `uri` (string, required): Resource URI

3. **list_resources**: List all available resources

4. **validate_pipeline**: Validate pipeline YAML and return errors with fixes

5. **get_component_schema**: Field definitions for a pipeline component

6. **get_bloblang_reference**: Bloblang function and method reference

7. **suggest_pipeline_pattern**: Example pipelines for a described use case

8. **explain_error**: Plain-language explanation of a validation or runtime error

9. **list_components**: Discover inputs, processors and outputs

10. **generate_test_data**: Sample input records for testing a pipeline

#### Example MCP Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_docs",
    "arguments": {
      "query": "how to configure circuit breakers",
      "limit": 5
    }
  }
}
```

## Configuration

The endpoint is `https://mcp.expanso.io/mcp`: streamable HTTP, JSON-RPC,
no authentication. The root page shows the same instructions with copy
buttons.

### Claude Code

```bash
claude mcp add --transport http expanso-docs https://mcp.expanso.io/mcp
```

### Claude (desktop and web)

Customize > Connectors, click the + next to Connectors, choose Custom > Web,
name it and paste the endpoint URL.

### Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "expanso-docs": {
      "url": "https://mcp.expanso.io/mcp"
    }
  }
}
```

### Codex

```bash
codex mcp add expanso-docs --url https://mcp.expanso.io/mcp
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers.expanso-docs]
url = "https://mcp.expanso.io/mcp"
```

### ChatGPT

Turn on Developer mode under Settings > Security and login, then create a
developer-mode app from the endpoint URL.

### Custom Integration

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({
  name: 'my-app',
  version: '1.0.0',
});

await client.connect({
  url: 'https://mcp.expanso.io/mcp',
});

const results = await client.callTool('search_docs', {
  query: 'kafka to snowflake pipeline',
});
```

## Development

```bash
# Start local dev server
npm run dev

# Run tests
npm test

# View logs
npm run tail
```

## Domains Indexed

| Domain | Content |
|--------|---------|
| expanso.io | Product overview, industries, use cases |
| docs.expanso.io | Platform documentation, CLI, components |
| examples.expanso.io | Production-ready pipeline examples |

## License

MIT
