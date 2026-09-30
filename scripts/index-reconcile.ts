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

/** list?count=1000 timed out (HTTP 504) in production; count=100 answers in ~130 ms. */
export const VECTOR_LIST_PAGE_SIZE = 100;

export interface VectorIdPage {
  ids: string[];
  nextCursor: string | undefined;
}

/** Fetches one list-vectors page for the given query string. */
export type VectorPageRequest = (query: URLSearchParams) => Promise<Response>;

export async function listAllVectorIds(requestPage: VectorPageRequest): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;

  do {
    const query = new URLSearchParams({ count: String(VECTOR_LIST_PAGE_SIZE) });

    if (cursor) query.set('cursor', cursor);

    const page = await readVectorIdPage(await requestPage(query));

    ids.push(...page.ids);
    cursor = page.nextCursor;
  } while (cursor);

  return ids;
}

/**
 * Reads the documented list-vectors result. Any other shape is an API change,
 * and a partial ID list would hide stale vectors, so both fail the run.
 */
export async function readVectorIdPage(response: Response): Promise<VectorIdPage> {
  const body: unknown = await response.json();
  const result = body instanceof Object && 'result' in body ? body.result : undefined;

  if (!(result instanceof Object) || !('vectors' in result) || !Array.isArray(result.vectors)) {
    throw new Error('Vectorize list returned no vectors array');
  }

  const vectors: unknown[] = result.vectors;
  const ids: string[] = [];

  for (const vector of vectors) {
    if (!(vector instanceof Object) || !('id' in vector) || vector.id == null) {
      throw new Error('Vectorize list returned a vector without an id');
    }

    ids.push(String(vector.id));
  }

  const truncated = 'isTruncated' in result && result.isTruncated === true;
  const cursor = 'nextCursor' in result && result.nextCursor != null ? String(result.nextCursor) : '';

  if (truncated && cursor === '') {
    throw new Error('Vectorize list is truncated but returned no cursor');
  }

  return { ids, nextCursor: truncated ? cursor : undefined };
}

const TRANSIENT_STATUSES = new Set([502, 503, 504]);

/** Retries gateway errors; every Vectorize call made here is safe to repeat. */
export async function retryTransient(
  attempt: () => Promise<Response>,
  { attempts = 3, delayMs = 1000 } = {}
): Promise<Response> {
  let response = await attempt();

  for (let tried = 1; tried < attempts && TRANSIENT_STATUSES.has(response.status); tried += 1) {
    await new Promise((resolve) => setTimeout(resolve, delayMs * tried));
    response = await attempt();
  }

  return response;
}

/** Cloudflare gateway errors arrive as whole HTML pages; keep one readable line. */
export function summarizeErrorBody(body: string): string {
  const title = /<title>([^<]*)<\/title>/i.exec(body)?.[1];
  const text = (title ?? body).replace(/\s+/g, ' ').trim();

  return text.length > 300 ? `${text.slice(0, 300)}...` : text;
}
