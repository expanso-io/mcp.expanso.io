# Monorepo Migration Plan

## Manual Steps (Execute in Order)

### Step 1: Create the new repo directory
```bash
cd /Users/daaronch/code
mkdir expanso-services
cd expanso-services
```

### Step 2: Initialize git
```bash
git init
```

### Step 3: Initialize beads
```bash
bd init
```

### Step 4: Create GitHub repo (will prompt for details)
```bash
gh repo create expanso-io/expanso-services --private --source=. --remote=origin
```

### Step 5: Create initial structure and commit
```bash
mkdir -p packages/{mcp,validate,shared}
touch packages/.gitkeep
echo "# Expanso Services Monorepo" > README.md
echo "node_modules/" > .gitignore
echo "dist/" >> .gitignore
echo ".wrangler/" >> .gitignore
git add -A
git commit -m "chore: initial monorepo structure"
git push -u origin main
```

### Step 6: Import the beads file
```bash
# Copy the beads file I'll create
cp /Users/daaronch/code/mcp.expanso.io/monorepo-migration-beads.jsonl .beads/issues.jsonl
bd sync
```

### Step 7: Verify beads imported
```bash
bd list
bd ready
```

### Step 8: Start working through beads
```bash
# From here, beads take over!
bd ready
bd show <first-bead-id>
# ... work through each bead
```

---

## Migration Phases Overview

### Phase 1: Monorepo Setup (5 beads)
- Root package.json with workspaces
- Root tsconfig.json
- Shared package skeleton
- ESLint/Prettier config
- Deploy script skeleton

### Phase 2: Import MCP (8 beads)
- Copy source files
- Copy config files
- Update package.json
- Update wrangler.toml
- Update imports
- Copy tests
- Verify tests pass
- Verify local dev works

### Phase 3: Import Validate (8 beads)
- Copy Rust validator
- Copy worker source
- Copy config files
- Update package.json
- Update wrangler.toml
- Build WASM
- Verify tests pass
- Verify local dev works

### Phase 4: Extract Shared Code (10 beads)
- Move schema.json to shared
- Create schema TypeScript types
- Generate component lists from schema
- Generate OpenAPI types
- Update MCP to use shared schema
- Remove MCP's component-schemas.ts
- Remove MCP's VALID_* sets from pipeline-validator
- Update validate to use shared schema
- Verify all tests pass
- Integration test both services

### Phase 5: Cleanup & CI/CD (6 beads)
- Create unified deploy script
- Create GitHub Actions workflow
- Update README with monorepo docs
- Archive old repos (mark deprecated)
- Final integration verification
- Production deploy

---

## After Migration: Directory Structure

```
expanso-services/
├── .beads/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── schema.json              # Source of truth
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   └── validate-api.d.ts
│   │   │   ├── component-lists.ts   # Generated from schema
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   │
│   ├── mcp/
│   │   ├── package.json
│   │   ├── wrangler.toml
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── chat-ui.ts
│   │   │   ├── mcp.ts
│   │   │   ├── handlers.ts
│   │   │   ├── analytics.ts
│   │   │   ├── examples-registry.ts
│   │   │   ├── docs-links.ts
│   │   │   ├── error-explainer.ts
│   │   │   ├── pattern-suggester.ts
│   │   │   ├── bloblang-reference.ts
│   │   │   └── test-data-generator.ts
│   │   │   # REMOVED: component-schemas.ts (use shared)
│   │   │   # REMOVED: pipeline-validator.ts (use validate API)
│   │   └── tsconfig.json
│   │
│   └── validate/
│       ├── validator/               # Rust WASM
│       │   ├── Cargo.toml
│       │   ├── src/
│       │   └── pkg/                 # Built WASM
│       └── worker/
│           ├── package.json
│           ├── wrangler.toml
│           ├── src/
│           │   └── index.ts
│           └── tsconfig.json
│
├── scripts/
│   ├── deploy.sh
│   ├── deploy-mcp.sh
│   ├── deploy-validate.sh
│   └── generate-schema.sh
│
├── package.json                     # Workspace root
├── tsconfig.json                    # Base tsconfig
├── README.md
└── CLAUDE.md
```
