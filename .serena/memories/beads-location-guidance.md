# Beads Location Guidance

## Important: Create beads in the correct project

When creating beads for related projects, ensure you create them in the **correct repository**:

| Topic | Create bead in |
|-------|----------------|
| MCP server features (chat UI, search, handlers) | `/Users/daaronch/code/mcp.expanso.io` |
| Validation service features (AST parsing, error detection) | `/Users/daaronch/code/validate.expanso.io` |

## How to create beads in another project

```bash
# Change to the target project directory first
cd /Users/daaronch/code/validate.expanso.io && bd create --title="..." --type=feature

# Or use full path context
(cd /Users/daaronch/code/validate.expanso.io && bd create ...)
```

## Past mistake

- Bead `mcp.expanso.io-u8r` was incorrectly created here for validate.expanso.io AST parsing
- It was closed and recreated as `validate.expanso.io-31r` in the correct project
