/**
 * Decide which Vectorize entries a re-index should delete.
 *
 * Upserting alone never removes anything: a chunk ID hashes its URL, H2
 * heading, and position on the page, so a renamed, moved, or deleted docs
 * section leaves its old vector behind and search keeps returning advice the
 * docs no longer give. After
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

/**
 * Cloudflare's code for a list cursor it will not accept. A cursor belongs to
 * the index snapshot taken at the first page; this run's upserts replace that
 * snapshot as Vectorize applies them, so a fresh listing is the documented way
 * to continue.
 */
const REJECTED_CURSOR_CODE = 40052;

/** Lists every vector ID, restarting from a fresh snapshot when a cursor is rejected. */
export async function listAllVectorIds(
  requestPage: VectorPageRequest,
  { restarts = 2 } = {}
): Promise<string[]> {
  for (let attempt = 0; ; attempt += 1) {
    const listing = await listOnce(requestPage);

    if (listing.complete) return listing.ids;

    if (attempt >= restarts) {
      throw new Error(
        `Vectorize list rejected its own cursor ${attempt + 1} time(s), last at page ${listing.page}: ${listing.detail}`
      );
    }

    console.warn(`Vectorize list rejected the page ${listing.page} cursor; listing again from the start`);
  }
}

type Listing =
  | { complete: true; ids: string[] }
  | { complete: false; page: number; detail: string };

async function listOnce(requestPage: VectorPageRequest): Promise<Listing> {
  const ids: string[] = [];
  let cursor: string | undefined;
  let page = 1;

  do {
    const query = new URLSearchParams({ count: String(VECTOR_LIST_PAGE_SIZE) });

    if (cursor) query.set('cursor', cursor);

    const response = await requestPage(query);

    if (!response.ok) {
      const body = await response.text();

      if (cursor && cloudflareErrorCodes(body).includes(REJECTED_CURSOR_CODE)) {
        return { complete: false, page, detail: summarizeErrorBody(body) };
      }

      throw new Error(`Vectorize list returned HTTP ${response.status}: ${summarizeErrorBody(body)}`);
    }

    const result = await readVectorIdPage(response);

    ids.push(...result.ids);
    cursor = result.nextCursor;
    page += 1;
  } while (cursor);

  return { complete: true, ids };
}

/** Error codes from a Cloudflare API error envelope; empty when the body is not one. */
export function cloudflareErrorCodes(body: string): number[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }

  const errors = parsed instanceof Object && 'errors' in parsed ? parsed.errors : undefined;

  if (!Array.isArray(errors)) return [];

  const entries: unknown[] = errors;
  const codes: number[] = [];

  for (const entry of entries) {
    if (entry instanceof Object && 'code' in entry) codes.push(Number(entry.code));
  }

  return codes;
}

export interface MutationWait {
  /** Fetches GET .../indexes/{name}/info. */
  readInfo: () => Promise<Response>;
  /** Server time of the last upsert response (its Date header). */
  since: number;
  timeoutMs?: number;
  pollMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/**
 * Upserts are applied asynchronously. Listing before they land lists a
 * snapshot the next mutation replaces, which is when Cloudflare rejects the
 * cursor. Waits until the index reports processing past `since`.
 */
export async function waitForAppliedMutations({
  readInfo,
  since,
  timeoutMs = 300_000,
  pollMs = 5_000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
}: MutationWait): Promise<void> {
  const deadline = now() + timeoutMs;

  for (;;) {
    const processedUpTo = await readProcessedUpTo(await readInfo());

    if (processedUpTo !== undefined && processedUpTo >= since) return;

    if (now() >= deadline) {
      const last = processedUpTo === undefined ? 'nothing' : new Date(processedUpTo).toISOString();

      throw new Error(
        `Vectorize had not applied this run's upserts after ${timeoutMs / 1000}s (processed up to ${last})`
      );
    }

    await sleep(pollMs);
  }
}

async function readProcessedUpTo(response: Response): Promise<number | undefined> {
  if (!response.ok) {
    throw new Error(
      `Vectorize info returned HTTP ${response.status}: ${summarizeErrorBody(await response.text())}`
    );
  }

  const body: unknown = await response.json();
  const result = body instanceof Object && 'result' in body ? body.result : undefined;

  const processed =
    result instanceof Object && 'processedUpToDatetime' in result ? result.processedUpToDatetime : undefined;

  const time = processed == null ? Number.NaN : Date.parse(String(processed));

  return Number.isNaN(time) ? undefined : time;
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
