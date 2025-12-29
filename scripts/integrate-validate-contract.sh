#!/bin/bash
# Integrate validate.expanso.io API contract into mcp.expanso.io
# Generates TypeScript types, runs type check, and tests

set -e

echo "🔄 Integrating validate.expanso.io API contract..."

# 1. Generate TypeScript types from OpenAPI spec
echo ""
echo "📦 Generating TypeScript types from OpenAPI..."
mkdir -p src/types
npx openapi-typescript https://validate.expanso.io/openapi.json \
  -o src/types/validate-api.d.ts

echo "✅ Types generated: src/types/validate-api.d.ts"

# 2. Show what was generated
echo ""
echo "📋 Generated types:"
head -50 src/types/validate-api.d.ts

# 3. Run type check
echo ""
echo "🔍 Running TypeScript type check..."
npx tsc --noEmit || {
  echo "⚠️  Type errors found - this is expected if you haven't updated the code yet"
  echo "   See .claude/commands/integrate-validate-contract.md for integration steps"
}

# 4. Run tests
echo ""
echo "🧪 Running tests..."
npm test -- --run || {
  echo "⚠️  Some tests failed"
}

# 5. Test the live contract endpoints
echo ""
echo "🌐 Testing validate.expanso.io contract endpoints..."
echo ""
echo "OpenAPI spec:"
curl -s https://validate.expanso.io/openapi.json | jq '{openapi, info: .info.title, version: .info.version}'

echo ""
echo "MCP tool definition:"
curl -s https://validate.expanso.io/mcp.json | jq '{name, version}'

echo ""
echo "✅ Integration script complete!"
echo ""
echo "Next steps:"
echo "  1. Update src/index.ts - see .claude/commands/integrate-validate-contract.md"
echo "  2. Update src/mcp.ts - replace validateWithExternalService()"
echo "  3. Run: npm run deploy"
