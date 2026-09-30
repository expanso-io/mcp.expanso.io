/**
 * Decide which Vectorize entries a re-index should delete.
 *
 * Upserting alone never removes anything: a chunk ID comes from its URL and
 * H2 heading, so a renamed or deleted docs section leaves its old vector
 * behind and search keeps returning advice the docs no longer give. After
 * each upsert, every ID the run did not produce is stale.
 *
 * Kept free of I/O so the rules are unit-tested.
 */

export type FetchOutcome =
  | { uri: string; status: 'ok' }
  | { uri: string; status: 'gone'; httpStatus: number }
  | { uri: string; status: 'failed'; detail: string };

export type ReconcilePlan =
  | { action: 'delete'; ids: string[] }
  | { action: 'skip'; reason: string };

/** 404 and 410 mean the page was removed; anything else may be transient. */
export function classifyResponse(uri: string, httpStatus: number): FetchOutcome {
  if (httpStatus >= 200 && httpStatus < 300) return { uri, status: 'ok' };

  if (httpStatus === 404 || httpStatus === 410) {
    return { uri, status: 'gone', httpStatus };
  }

  return { uri, status: 'failed', detail: `HTTP ${httpStatus}` };
}

export function planStaleDeletes(
  existingIds: Iterable<string>,
  currentIds: ReadonlySet<string>,
  outcomes: readonly FetchOutcome[]
): ReconcilePlan {
  // A source that failed transiently produced no chunks this run; deleting
  // its vectors would blank that source out of search until the next run.
  const failed = outcomes.filter((o) => o.status === 'failed');

  if (failed.length > 0) {
    return {
      action: 'skip',
      reason: `could not fetch ${failed.map((o) => o.uri).join(', ')}`,
    };
  }

  if (currentIds.size === 0) {
    return { action: 'skip', reason: 'this run produced no chunks' };
  }

  const ids = [...new Set(existingIds)].filter((id) => !currentIds.has(id)).sort();

  return { action: 'delete', ids };
}

export function chunked<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}
