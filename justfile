# MCP Server for Expanso Documentation
# Run `just` to see available commands

# Default: list available recipes
default:
    @just --list

# Start local development server
dev:
    wrangler dev

# Deploy worker + re-index content
deploy:
    ./scripts/deploy.sh

# Deploy worker only (skip indexing)
deploy-worker:
    wrangler deploy

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

# Show Cloudflare Workers status
status:
    wrangler whoami
