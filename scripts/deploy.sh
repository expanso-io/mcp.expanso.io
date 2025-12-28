#!/bin/bash
# Deploy script that handles auth for both wrangler and indexing
#
# Wrangler uses OAuth (no token needed)
# Indexing uses CLOUDFLARE_API_TOKEN_TOKENIZE from .env
#
# Usage: ./scripts/deploy.sh

set -e

# Load .env if exists (check current dir and parent)
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
elif [ -f ../.env ]; then
  export $(grep -v '^#' ../.env | xargs)
fi

# Use CLOUDFLARE_API_TOKEN_TOKENIZE for indexing
INDEX_TOKEN="${CLOUDFLARE_API_TOKEN_TOKENIZE:-$CLOUDFLARE_API_TOKEN}"

# Move yarn pnp if exists (conflicts with wrangler)
if [ -f ~/.pnp.cjs ]; then
  mv ~/.pnp.cjs ~/.pnp.cjs.bak
  trap "mv ~/.pnp.cjs.bak ~/.pnp.cjs 2>/dev/null" EXIT
fi

echo "=== Deploying Worker ==="
# Clear token for wrangler (uses OAuth)
CLOUDFLARE_API_TOKEN= npx wrangler deploy

echo ""
echo "=== Indexing Content ==="
# Check if we have a token for indexing
if [ -z "$INDEX_TOKEN" ]; then
  echo "Skipping index: No API token found"
  echo ""
  echo "To enable auto-indexing, add to .env:"
  echo "  CLOUDFLARE_API_TOKEN_TOKENIZE=xxx"
  echo ""
  echo "Required permissions:"
  echo "  - Account > Workers AI > Read"
  echo "  - Account > Vectorize > Edit"
else
  if CLOUDFLARE_API_TOKEN="$INDEX_TOKEN" npx tsx scripts/index-content.ts; then
    echo "Indexing complete!"
  else
    echo ""
    echo "Indexing failed. Check your API token permissions:"
    echo "  - Account > Workers AI > Read"
    echo "  - Account > Vectorize > Edit"
  fi
fi

echo ""
echo "=== Deploy Complete ==="
