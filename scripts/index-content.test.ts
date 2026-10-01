import { describe, expect, it, vi } from 'vitest';

import {
  assertUniqueChunkIds,
  createDocumentChunks,
  deleteStaleVectors,
  generateId,
} from './index-content';
import { classifyResponse, listAllVectorIds, planStaleDeletes } from './index-reconcile';

const LONG_CONTENT = 'This section is deliberately longer than fifty characters so it becomes a chunk.';

const fetched = [
  {
    uri: 'https://docs.expanso.io/llms/shared-prefix-alpha.txt',
    content: `# Alpha\n\n${LONG_CONTENT}\n## Repeated heading\n${LONG_CONTENT}\n## Repeated heading\n${LONG_CONTENT}`,
  },
  {
    uri: 'https://docs.expanso.io/llms/shared-prefix-beta.txt',
    content: `# Beta\n\n${LONG_CONTENT}\n## Repeated heading\n${LONG_CONTENT}\n## Repeated heading\n${LONG_CONTENT}`,
  },
];

describe('document chunk IDs', () => {
  it('creates one unique Vectorize ID per indexed chunk', () => {
    const chunks = createDocumentChunks(fetched);
    const ids = chunks.map((chunk) => chunk.id);

    expect(chunks).toHaveLength(6);
    expect(new Set(ids).size).toBe(chunks.length);
    expect(ids.every((id) => /^[a-f0-9]{64}$/.test(id))).toBe(true);
    expect(ids.every((id) => Buffer.byteLength(id) <= 64)).toBe(true);
  });

  it('uses the full URI and section ordinal as ID inputs', () => {
    const firstUri = 'https://docs.expanso.io/llms/shared-prefix-alpha.txt';
    const secondUri = 'https://docs.expanso.io/llms/shared-prefix-beta.txt';

    expect(generateId(firstUri, 'Repeated heading', 0)).not.toBe(
      generateId(secondUri, 'Repeated heading', 0)
    );
    expect(generateId(firstUri, 'Repeated heading', 0)).not.toBe(
      generateId(firstUri, 'Repeated heading', 1)
    );
  });

  it('fails before indexing duplicate IDs', () => {
    expect(() => assertUniqueChunkIds([{ id: 'same' }, { id: 'same' }])).toThrow(
      'Duplicate vector ID same for chunks 1 and 2'
    );
  });

  it('marks every old-format ID stale after a successful re-index', () => {
    const currentIds = new Set(createDocumentChunks(fetched).map((chunk) => chunk.id));

    const oldIds = [
      'docs_expanso_io_llms_shared_pr_introduction',
      'docs_expanso_io_llms_shared_pr_repeated_heading',
    ];

    const existingIds = [...currentIds, ...oldIds];
    const outcomes = fetched.map(({ uri }) => classifyResponse(uri, 200));

    expect(planStaleDeletes(existingIds, currentIds, outcomes)).toEqual({
      action: 'delete',
      ids: oldIds,
    });
  });
});

describe('stale vector cleanup', () => {
  it('deletes stale IDs while a current upsert is still absent from the index', async () => {
    const currentIds = new Set(['current-visible', 'current-still-processing']);
    const deletedBatches: string[][] = [];

    await deleteStaleVectors(
      currentIds,
      [classifyResponse('https://docs.expanso.io/llms.txt', 200)],
      async () => ({ complete: true, ids: ['current-visible', 'old-format-id'] }),
      async (ids) => {
        deletedBatches.push(ids);
      }
    );

    expect(deletedBatches).toEqual([['old-format-id']]);
  });

  it('deletes the stale IDs it saw and warns when mutation lag keeps rejecting the cursor', async () => {
    const page = (ids: string[], cursor?: string) =>
      Response.json({
        result: { vectors: ids.map((id) => ({ id })), isTruncated: cursor !== undefined, nextCursor: cursor ?? null },
      });
    const rejected = () =>
      Response.json({ success: false, errors: [{ code: 40052, message: 'cursor corrupted' }] }, { status: 400 });

    let calls = 0;
    const delays: number[] = [];
    const deletedBatches: string[][] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await deleteStaleVectors(
      new Set(['current']),
      [classifyResponse('https://docs.expanso.io/llms.txt', 200)],
      () =>
        listAllVectorIds(
          async (query) => {
            calls += 1;

            return query.get('cursor') ? rejected() : page(['current', 'old-format-id'], 'next');
          },
          {
            restarts: 3,
            backoffMs: 1,
            sleep: async (ms) => {
              delays.push(ms);
            },
          }
        ),
      async (ids) => {
        deletedBatches.push(ids);
      }
    );

    const warnings = warn.mock.calls.map(([message]) => String(message));
    warn.mockRestore();

    expect(calls).toBe(8);
    expect(delays).toEqual([1, 2, 3]);
    expect(deletedBatches).toEqual([['old-format-id']]);
    expect(warnings.at(-1)).toMatch(/Stale cleanup is partial: only 2 listed vector\(s\) were checked because .*4 time\(s\)/);
  });
});
