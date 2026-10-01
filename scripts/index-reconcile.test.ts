import { describe, expect, it } from 'vitest';

import {
  chunked,
  classifyResponse,
  cloudflareErrorCodes,
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

    const listing = await listAllVectorIds(async (query) => {
      queries.push(query);

      return pages[queries.length - 1];
    });

    expect(listing).toEqual({ complete: true, ids: ['a', 'b', 'c', 'd'] });
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

// Shaped like a real cursor: base64 with the characters form encoding must escape.
const REALISTIC_CURSOR = 'eyJzbmFwc2hvdCI6IjAxOTNh+ZTRmLTc2YjEiLCJvZmZzZXQiOjEwMH0/Ab9=';

function rejectedCursor(): Response {
  return Response.json(
    {
      result: null,
      success: false,
      errors: [{ code: 40052, message: 'List vectors cursor appears to be corrupted' }],
    },
    { status: 400 }
  );
}

describe('listAllVectorIds cursors', () => {
  it('sends the previous page cursor back unchanged', async () => {
    const sent: string[] = [];
    const pages = [listPage(['a'], REALISTIC_CURSOR), listPage(['b'])];

    await listAllVectorIds(async (query) => {
      sent.push(query.toString());

      return pages[sent.length - 1];
    });

    const second = new URLSearchParams(sent[1]);

    expect(second.get('cursor')).toBe(REALISTIC_CURSOR);
    expect(sent[1]).toContain('%2B');
    expect(sent[1]).toContain('%2F');
    expect(sent[1]).toContain('%3D');
  });

  it('lists again from the start when Cloudflare rejects a cursor', async () => {
    const responses = [
      listPage(['a', 'b'], REALISTIC_CURSOR),
      rejectedCursor(),
      listPage(['a', 'b'], 'next'),
      listPage(['c']),
    ];

    const cursors: Array<string | null> = [];

    const delays: number[] = [];

    const listing = await listAllVectorIds(
      async (query) => {
        cursors.push(query.get('cursor'));

        return responses[cursors.length - 1];
      },
      {
        backoffMs: 5,
        sleep: async (ms) => {
          delays.push(ms);
        },
      }
    );

    expect(listing).toEqual({ complete: true, ids: ['a', 'b', 'c'] });
    expect(delays).toEqual([5]);
    expect(cursors).toEqual([null, REALISTIC_CURSOR, null, 'next']);
  });

  it('backs off between restarts and returns the IDs it saw once the limit is reached', async () => {
    let calls = 0;
    const delays: number[] = [];

    const listing = await listAllVectorIds(
      async () => {
        calls += 1;

        return calls % 2 === 1 ? listPage(['a'], REALISTIC_CURSOR) : rejectedCursor();
      },
      {
        restarts: 2,
        backoffMs: 10,
        sleep: async (ms) => {
          delays.push(ms);
        },
      }
    );

    expect(listing).toMatchObject({ complete: false, ids: ['a'] });
    expect(listing.complete === false && listing.detail).toMatch(
      /rejected its own cursor 3 time\(s\), last at page 2: .*cursor appears to be corrupted/
    );
    expect(delays).toEqual([10, 20]);
    expect(calls).toBe(6);
  });

  it('fails at once on other errors, including a 40052 without a cursor', async () => {
    await expect(listAllVectorIds(async () => rejectedCursor())).rejects.toThrow(
      'Vectorize list returned HTTP 400'
    );

    const forbidden = Response.json({ errors: [{ code: 10000 }] }, { status: 403 });

    await expect(listAllVectorIds(async () => forbidden)).rejects.toThrow('HTTP 403');
  });
});

describe('cloudflareErrorCodes', () => {
  it('reads codes from an error envelope and ignores anything else', () => {
    expect(cloudflareErrorCodes('{"errors":[{"code":40052},{"code":"7003"}]}')).toEqual([40052, 7003]);
    expect(cloudflareErrorCodes('<html>504</html>')).toEqual([]);
    expect(cloudflareErrorCodes('{"errors":null}')).toEqual([]);
  });
});
