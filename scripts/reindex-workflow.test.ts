import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { planStaleDeletes } from './index-reconcile';

/**
 * Replays .github/workflows/reindex.yml step by step: `if:` and `${{ }}`
 * expressions are evaluated, the index step's shell runs for real against a
 * stub npx, and actions/cache is modelled with immutable keys and
 * newest-first prefix restores, as GitHub documents.
 */

interface Step {
  id?: string;
  name?: string;
  if?: string;
  uses?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, string>;
}

type Value = string | boolean | null;
type Context = Record<string, unknown>;

const WORKFLOW = join(dirname(fileURLToPath(import.meta.url)), '../.github/workflows/reindex.yml');
const steps: Step[] = parse(readFileSync(WORKFLOW, 'utf8')).jobs.reindex.steps;

function evaluate(expression: string, context: Context): Value {
  const tokens = expression.match(/==|!=|&&|\|\||!|\(|\)|'(?:[^']|'')*'|[A-Za-z_][\w.-]*/g) ?? [];
  let at = 0;

  const loose = (v: Value) => (v === null ? '' : String(v));
  const truthy = (v: Value) => v !== null && v !== false && v !== '';

  const primary = (): Value => {
    const token = tokens[at++];

    if (token === '(') {
      const value = or();
      at += 1;

      return value;
    }

    if (token === '!') return !truthy(primary());
    if (token.startsWith("'")) return token.slice(1, -1).replace(/''/g, "'");
    if (token === 'true' || token === 'false') return token === 'true';
    if (token === 'null') return null;

    let value: unknown = context;

    for (const part of token.split('.')) {
      value = value instanceof Object ? (value as Record<string, unknown>)[part] : undefined;
    }

    return value === undefined ? null : (value as Value);
  };

  const equality = (): Value => {
    let left = primary();

    while (tokens[at] === '==' || tokens[at] === '!=') {
      const negate = tokens[at++] === '!=';
      const right = primary();
      left = (loose(left) === loose(right)) !== negate;
    }

    return left;
  };

  const and = (): Value => {
    let left = equality();

    while (tokens[at] === '&&') {
      at += 1;
      const right = equality();
      left = truthy(left) ? right : left;
    }

    return left;
  };

  const or = (): Value => {
    let left = and();

    while (tokens[at] === '||') {
      at += 1;
      const right = and();
      left = truthy(left) ? left : right;
    }

    return left;
  };

  return or();
}

const render = (template: string, context: Context) =>
  template.replace(/\$\{\{(.*?)\}\}/g, (_, expression: string) => {
    const value = evaluate(expression, context);

    return value === null ? '' : String(value);
  });

interface World {
  caches: Array<{ key: string; files: Record<string, string> }>;
  index: Set<string>;
}

interface RunSpec {
  runId: number;
  force?: boolean;
  content: string[];
  cleanup: 'complete' | 'partial';
}

/** Runs the job once; returns the arguments the index step passed to the indexer. */
function runJob(world: World, spec: RunSpec): string[] {
  const outputs: Record<string, Record<string, string>> = {};
  const workspace: Record<string, string> = {};
  const context: Context = {
    steps: outputs,
    inputs: spec.force === undefined ? {} : { force: spec.force },
    github: { run_id: String(spec.runId), run_attempt: '1' },
    secrets: { CLOUDFLARE_API_TOKEN_TOKENIZE: 'token' },
  };
  let indexArgs: string[] = [];

  for (const step of steps) {
    if (step.if !== undefined && !evaluate(step.if, context)) continue;

    const out: Record<string, string> = {};
    const env = Object.fromEntries(Object.entries(step.env ?? {}).map(([k, v]) => [k, render(String(v), context)]));
    const inputs = Object.fromEntries(Object.entries(step.with ?? {}).map(([k, v]) => [k, render(String(v), context)]));

    if (step.id === 'docs') {
      Object.assign(out, { commit: 'c'.repeat(40), key: `docs-index-${'c'.repeat(40)}-2026-09-30` });
    } else if (step.id === 'credentials') {
      out.ready = 'true';
    } else if (step.uses?.startsWith('actions/cache/restore')) {
      const exact = world.caches.find((c) => c.key === inputs.key);
      const prefix = inputs['restore-keys'];
      const match = exact ?? (prefix ? world.caches.filter((c) => c.key.startsWith(prefix)).at(-1) : undefined);

      out['cache-hit'] = String(exact !== undefined);
      out['cache-matched-key'] = match?.key ?? '';
      if (match && inputs['lookup-only'] !== 'true') Object.assign(workspace, match.files);
    } else if (step.uses?.startsWith('actions/cache/save')) {
      if (!world.caches.some((c) => c.key === inputs.key) && inputs.path in workspace) {
        world.caches.push({ key: inputs.key, files: { [inputs.path]: workspace[inputs.path] } });
      }
    } else if (step.id === 'index') {
      indexArgs = runIndexStep(step.run ?? '', env);
      const currentIds = indexArgs.includes('--cleanup-only')
        ? new Set<string>(JSON.parse(workspace['.reindex-ids.json']))
        : new Set(spec.content);

      if (!indexArgs.includes('--cleanup-only')) {
        for (const id of currentIds) world.index.add(id);
        workspace['.reindex-ids.json'] = JSON.stringify([...currentIds]);
      }

      if (spec.cleanup === 'complete') {
        const plan = planStaleDeletes(world.index, currentIds, []);
        if (plan.action === 'delete') for (const id of plan.ids) world.index.delete(id);
      }

      out.cleanup = spec.cleanup;
    } else if (step.run?.includes('.reindex-stamp')) {
      workspace['.reindex-stamp'] = env.DOCS_COMMIT;
    }

    if (step.id) outputs[step.id] = { outputs: out } as never;
  }

  return indexArgs;
}

function runIndexStep(script: string, env: Record<string, string>): string[] {
  const bin = mkdtempSync(join(tmpdir(), 'reindex-bin-'));
  const log = join(bin, 'args');
  writeFileSync(join(bin, 'npx'), `#!/bin/sh\nprintf '%s\\n' "$@" > "${log}"\n`);
  chmodSync(join(bin, 'npx'), 0o755);
  execFileSync('bash', ['-c', script], { env: { ...process.env, ...env, PATH: `${bin}:${process.env.PATH}` } });

  return readFileSync(log, 'utf8').trim().split('\n');
}

describe('reindex workflow', () => {
  it('retries a partial cleanup from the newest upserted IDs after a forced run', () => {
    const world: World = { caches: [], index: new Set(['old-1', 'old-2']) };

    runJob(world, { runId: 1, content: ['s1', 's2'], cleanup: 'partial' });
    runJob(world, { runId: 2, force: true, content: ['s1', 's3'], cleanup: 'partial' });
    const retryArgs = runJob(world, { runId: 3, content: ['s1', 's3'], cleanup: 'complete' });

    expect(retryArgs).toContain('--cleanup-only');
    expect([...world.index].sort()).toEqual(['s1', 's3']);
    expect(world.caches.map((c) => c.key)).toContain(`docs-index-${'c'.repeat(40)}-2026-09-30`);
  });

  it('stamps a complete run and leaves a partial one for the next hourly retry', () => {
    const world: World = { caches: [], index: new Set(['old-1']) };
    const stamp = `docs-index-${'c'.repeat(40)}-2026-09-30`;

    runJob(world, { runId: 1, content: ['s1'], cleanup: 'partial' });
    expect(world.caches.map((c) => c.key)).not.toContain(stamp);

    const args = runJob(world, { runId: 2, content: ['s1'], cleanup: 'complete' });
    expect(args).toContain('--cleanup-only');
    expect(world.caches.map((c) => c.key)).toContain(stamp);
    expect([...world.index]).toEqual(['s1']);

    expect(runJob(world, { runId: 3, content: ['s1'], cleanup: 'complete' })).toEqual([]);
  });
});
