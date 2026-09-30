import { describe, expect, it } from 'vitest';

import { chunked, classifyResponse, planStaleDeletes } from './index-reconcile';

const ok = (uri: string) => classifyResponse(uri, 200);

describe('classifyResponse', () => {
  it('treats 404 and 410 as removed and other errors as transient', () => {
    expect(classifyResponse('a', 200).status).toBe('ok');
    expect(classifyResponse('a', 404).status).toBe('gone');
    expect(classifyResponse('a', 410).status).toBe('gone');
    expect(classifyResponse('a', 503).status).toBe('failed');
    expect(classifyResponse('a', 403).status).toBe('failed');
  });
});

describe('planStaleDeletes', () => {
  it('deletes vectors this run did not produce', () => {
    const plan = planStaleDeletes(
      ['getting_started_run_locally', 'getting_started_validate', 'operations_intro'],
      new Set(['getting_started_validate']),
      [ok('https://docs.expanso.io/llms/getting-started.txt')]
    );

    expect(plan).toEqual({
      action: 'delete',
      ids: ['getting_started_run_locally', 'operations_intro'],
    });
  });

  it('still deletes when a source is gone for good', () => {
    const plan = planStaleDeletes(['old'], new Set(['new']), [
      ok('https://docs.expanso.io/llms.txt'),
      classifyResponse('https://docs.expanso.io/llms/operations.txt', 404),
    ]);

    expect(plan).toEqual({ action: 'delete', ids: ['old'] });
  });

  it('skips when any source failed transiently', () => {
    const plan = planStaleDeletes(['old'], new Set(['new']), [
      ok('https://docs.expanso.io/llms.txt'),
      { uri: 'https://expanso.io/llms.txt', status: 'failed', detail: 'fetch failed' },
    ]);

    expect(plan).toEqual({
      action: 'skip',
      reason: 'could not fetch https://expanso.io/llms.txt',
    });
  });

  it('never empties the index when a run produced nothing', () => {
    const plan = planStaleDeletes(['a', 'b'], new Set(), [ok('x')]);

    expect(plan.action).toBe('skip');
  });

  it('returns each stale ID once', () => {
    const plan = planStaleDeletes(['a', 'a', 'b'], new Set(['b']), [ok('x')]);

    expect(plan).toEqual({ action: 'delete', ids: ['a'] });
  });
});

describe('chunked', () => {
  it('splits into fixed-size batches', () => {
    expect(chunked([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunked([], 2)).toEqual([]);
  });
});
