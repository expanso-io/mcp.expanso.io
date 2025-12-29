# MCP Server for Expanso Documentation
# Run `just` to see available commands

# Default: list available recipes
default:
    @just --list

# Start local development server
dev:
    wrangler dev

# Load .env and deploy worker + re-index content
deploy:
    #!/usr/bin/env bash
    set -a; source .env 2>/dev/null; set +a
    # Temporarily disable parent Yarn PnP
    [ -f ../../.pnp.cjs ] && mv ../../.pnp.cjs ../../.pnp.cjs.bak
    CLOUDFLARE_API_TOKEN="${CLOUDFLARE_TOKEN_API_MCP_EXPANSO_IO}" ./scripts/deploy.sh
    [ -f ../../.pnp.cjs.bak ] && mv ../../.pnp.cjs.bak ../../.pnp.cjs

# Load .env and deploy worker only (skip indexing)
deploy-worker:
    #!/usr/bin/env bash
    set -a; source .env 2>/dev/null; set +a
    # Temporarily disable parent Yarn PnP
    [ -f ../../.pnp.cjs ] && mv ../../.pnp.cjs ../../.pnp.cjs.bak
    CLOUDFLARE_API_TOKEN="${CLOUDFLARE_TOKEN_API_MCP_EXPANSO_IO}" npx wrangler deploy --env=""
    [ -f ../../.pnp.cjs.bak ] && mv ../../.pnp.cjs.bak ../../.pnp.cjs

# View production logs
tail:
    wrangler tail

# Run TypeScript type checking
typecheck:
    npx tsc --noEmit

# Re-index content to Vectorize
index:
    npx tsx scripts/index-content.ts

# Run tests
test:
    npx vitest run

# Run tests in watch mode
test-watch:
    npx vitest

# Run tests with coverage
test-coverage:
    npx vitest run --coverage

# Format code
fmt:
    npx prettier --write src/

# Lint code
lint:
    npx eslint src/

# Clean build artifacts
clean:
    rm -rf dist/ .wrangler/

# Run adversarial testing (overnight)
adversarial *ARGS:
    npx tsx scripts/adversarial-test.ts {{ARGS}}

# Run adversarial testing with resume
adversarial-resume:
    npx tsx scripts/adversarial-test.ts --resume

# Show Cloudflare Workers status
status:
    wrangler whoami
