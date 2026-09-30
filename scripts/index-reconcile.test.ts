import { describe, expect, it } from 'vitest';

import {
  chunked,
  classifyResponse,
  listAllVectorIds,
  planStaleDeletes,
  retryTransient,
  summarizeErrorBody,
  VECTOR_LIST_PAGE_SIZE,
} from './index-reconcile';

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

function listPage(ids: string[], nextCursor?: string): Response {
  return Response.json({
    success: true,
    result: {
      count: ids.length,
      isTruncated: nextCursor !== undefined,
      nextCursor: nextCursor ?? null,
      vectors: ids.map((id) => ({ id })),
    },
  });
}

describe('listAllVectorIds', () => {
  it('requests 100 IDs per page and follows the cursor to the end', async () => {
    const queries: URLSearchParams[] = [];
    const pages = [listPage(['a', 'b'], 'c1'), listPage(['c'], 'c2'), listPage(['d'])];

    const ids = await listAllVectorIds(async (query) => {
      queries.push(query);

      return pages[queries.length - 1];
    });

    expect(ids).toEqual(['a', 'b', 'c', 'd']);
    expect(VECTOR_LIST_PAGE_SIZE).toBe(100);
    expect(queries.map((q) => q.get('count'))).toEqual(['100', '100', '100']);
    expect(queries.map((q) => q.get('cursor'))).toEqual([null, 'c1', 'c2']);
  });

  it('fails instead of returning a partial list', async () => {
    const truncatedWithoutCursor = Response.json({
      result: { isTruncated: true, nextCursor: null, vectors: [{ id: 'a' }] },
    });

    await expect(listAllVectorIds(async () => truncatedWithoutCursor)).rejects.toThrow(
      'truncated but returned no cursor'
    );
    await expect(
      listAllVectorIds(async () => Response.json({ result: { vectors: 'nope' } }))
    ).rejects.toThrow('no vectors array');
  });
});

describe('retryTransient', () => {
  it('retries gateway errors and returns the first success', async () => {
    const statuses = [504, 502, 200];
    let calls = 0;

    const response = await retryTransient(
      async () => new Response(null, { status: statuses[calls++] }),
      { delayMs: 0 }
    );

    expect(response.status).toBe(200);
    expect(calls).toBe(3);
  });

  it('gives up after the attempt limit and returns the last response', async () => {
    let calls = 0;

    const response = await retryTransient(
      async () => {
        calls += 1;

        return new Response(null, { status: 504 });
      },
      { attempts: 3, delayMs: 0 }
    );

    expect(response.status).toBe(504);
    expect(calls).toBe(3);
  });

  it('does not retry client errors', async () => {
    let calls = 0;

    const response = await retryTransient(
      async () => {
        calls += 1;

        return new Response(null, { status: 403 });
      },
      { delayMs: 0 }
    );

    expect(response.status).toBe(403);
    expect(calls).toBe(1);
  });
});

describe('summarizeErrorBody', () => {
  it('reduces a Cloudflare HTML error page to its title', () => {
    const html = '<html><head><title>api.cloudflare.com | 504: Gateway time-out</title></head>' +
      '<body><p>Cloudflare Ray ID</p></body></html>';

    expect(summarizeErrorBody(html)).toBe('api.cloudflare.com | 504: Gateway time-out');
  });

  it('keeps short JSON errors and truncates long ones to one line', () => {
    expect(summarizeErrorBody('{"errors":[{"code":10000}]}')).toBe('{"errors":[{"code":10000}]}');

    const long = summarizeErrorBody('x'.repeat(500) + '\n' + 'y');

    expect(long).toHaveLength(303);
    expect(long.endsWith('...')).toBe(true);
  });
});
