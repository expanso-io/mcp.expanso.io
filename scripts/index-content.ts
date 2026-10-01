#!/usr/bin/env npx tsx
/**
 * Index llms.txt content into Cloudflare Vectorize
 *
 * Usage: npm run index
 *        npx tsx scripts/index-content.ts --cleanup-only
 *
 * A full run saves the IDs it upserted to UPSERTED_IDS_FILE. --cleanup-only
 * reuses them to retry a partial stale cleanup without upserting again, since
 * re-upserting restarts the Vectorize lag that made the cleanup partial.
 *
 * Requires CLOUDFLARE_API_TOKEN environment variable.
 * Account ID is read from wrangler.toml automatically.
 */

import { appendFileSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { PIPELINE_EXAMPLES, getExampleSearchText } from '../src/examples-registry';
import {
  chunked,
  classifyResponse,
  listAllVectorIds,
  planStaleDeletes,
  retryTransient,
  summarizeErrorBody,
  type FetchOutcome,
  type VectorIdListing,
} from './index-reconcile';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getAccountIdFromWrangler(): string {
  try {
    const wranglerPath = join(__dirname, '..', 'wrangler.toml');
    const content = readFileSync(wranglerPath, 'utf-8');
    const match = content.match(/account_id\s*=\s*"([^"]+)"/);

    if (match) return match[1];
  } catch {
    // Fall through to env var
  }

  return process.env.CLOUDFLARE_ACCOUNT_ID || '';
}

const RESOURCES = [
  // expanso.io
  'https://expanso.io/llms.txt',
  'https://expanso.io/llms/product.txt',
  'https://expanso.io/llms/industries.txt',
  'https://expanso.io/llms/use-cases.txt',
  'https://expanso.io/llms/comparisons.txt',

  // docs.expanso.io
  'https://docs.expanso.io/llms.txt',
  'https://docs.expanso.io/llms/getting-started.txt',
  'https://docs.expanso.io/llms/cli.txt',
  'https://docs.expanso.io/llms/components.txt',
  'https://docs.expanso.io/llms/guides.txt',

  // examples.expanso.io
  'https://examples.expanso.io/llms.txt',
];

const VECTORIZE_INDEX = 'expanso-docs';

export interface Chunk {
  id: string;
  text: string;
  metadata: {
    uri: string;
    domain: string;
    title: string;
    snippet: string;
    section: string;
    type: 'doc' | 'example';
  };
}

interface FetchedContent {
  uri: string;
  content: string;
}

export const UPSERTED_IDS_FILE = '.reindex-ids.json';

export type CleanupStatus = 'complete' | 'partial';

async function main() {
  const accountId = getAccountIdFromWrangler();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.error('Missing CLOUDFLARE_ACCOUNT_ID (in wrangler.toml) or CLOUDFLARE_API_TOKEN env var');
    process.exit(1);
  }

  const startTime = Date.now();
  const cleanupOnly = process.argv.includes('--cleanup-only');
  const indexed = cleanupOnly
    ? { currentIds: loadUpsertedIds(UPSERTED_IDS_FILE), outcomes: [] }
    : await indexContent(accountId, apiToken);

  if (!indexed) return;

  if (cleanupOnly) {
    console.log(`Cleanup only: reusing ${indexed.currentIds.size} upserted IDs from ${UPSERTED_IDS_FILE}`);
  } else {
    saveUpsertedIds(UPSERTED_IDS_FILE, indexed.currentIds);
  }

  let status: CleanupStatus;

  try {
    status = await deleteStaleVectors(
      indexed.currentIds,
      indexed.outcomes,
      () => listVectorIds(accountId, apiToken),
      async (ids) => {
        await vectorizeRequest(accountId, apiToken, 'delete_by_ids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
      }
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    throw new Error(
      `Upserted ${indexed.currentIds.size} chunks, but deleting stale vectors failed: ${reason}. ` +
        'search_docs serves the new content plus any stale vectors until a run succeeds.'
    );
  }

  recordCleanupStatus(status, process.env.GITHUB_OUTPUT);
  console.log(`\nDone in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

/** Fetches, embeds, and upserts every chunk; undefined when there was nothing to index. */
async function indexContent(
  accountId: string,
  apiToken: string
): Promise<{ currentIds: Set<string>; outcomes: FetchOutcome[] } | undefined> {
  const startTime = Date.now();
  console.log('Fetching content in parallel...');

  // Fetch all URLs in parallel, keeping why each one failed: a removed page
  // lets its old vectors be deleted, a transient failure must not.
  const outcomes: FetchOutcome[] = [];
  const fetched: FetchedContent[] = [];

  await Promise.all(
    RESOURCES.map(async (uri) => {
      try {
        const response = await fetch(uri);
        const outcome = classifyResponse(uri, response.status);
        outcomes.push(outcome);

        if (outcome.status === 'ok') fetched.push({ uri, content: await response.text() });
        else console.warn(`Skipping ${uri}: HTTP ${response.status}`);
      } catch (error) {
        outcomes.push({ uri, status: 'failed', detail: String(error) });
        console.warn(`Skipping ${uri}: ${error}`);
      }
    })
  );

  const chunks = createDocumentChunks(fetched);

  console.log(`Fetched ${RESOURCES.length} URLs, created ${chunks.length} doc chunks in ${Date.now() - startTime}ms`);

  // Add pipeline examples to chunks
  console.log(`Adding ${PIPELINE_EXAMPLES.length} pipeline examples...`);

  for (const example of PIPELINE_EXAMPLES) {
    const searchText = getExampleSearchText(example);
    chunks.push({
      id: example.id,
      text: searchText,
      metadata: {
        uri: `examples://expanso.io/${example.id}`,
        domain: 'examples.expanso.io',
        title: example.name,
        snippet: example.description.slice(0, 200),
        section: example.name,
        type: 'example',
      },
    });
  }

  assertUniqueChunkIds(chunks);

  console.log(`Total chunks to index: ${chunks.length} (${chunks.filter(c => c.metadata.type === 'doc').length} docs + ${chunks.filter(c => c.metadata.type === 'example').length} examples)`);

  if (chunks.length === 0) {
    console.log('No chunks to index');

    return undefined;
  }

  console.log('Generating embeddings and upserting (parallel batches)...');

  // Process in larger batches, run embedding + upsert in parallel per batch
  const batchSize = 20; // Larger batches = fewer API calls
  const batches: Chunk[][] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    batches.push(chunks.slice(i, i + batchSize));
  }

  // Process batches with limited concurrency (2 at a time to avoid rate limits)
  const concurrency = 2;

  for (let i = 0; i < batches.length; i += concurrency) {
    const batchGroup = batches.slice(i, i + concurrency);

    await Promise.all(
      batchGroup.map(async (batch) => {
        const embeddings = await generateEmbeddings(
          batch.map((c) => c.text),
          accountId,
          apiToken
        );

        const vectors = batch.map((chunk, idx) => ({
          id: chunk.id,
          values: embeddings[idx],
          metadata: chunk.metadata,
        }));

        await upsertVectors(vectors, accountId, apiToken);
      })
    );

    const processed = Math.min((i + concurrency) * batchSize, chunks.length);
    console.log(`  ${processed}/${chunks.length} chunks indexed`);
  }

  return { currentIds: new Set(chunks.map((c) => c.id)), outcomes };
}

export function saveUpsertedIds(file: string, ids: ReadonlySet<string>): void {
  writeFileSync(file, JSON.stringify([...ids].sort()));
}

/** Reads the IDs a full run upserted; anything but a non-empty string list fails the run. */
export function loadUpsertedIds(file: string): Set<string> {
  const ids: unknown = JSON.parse(readFileSync(file, 'utf8'));

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
    throw new Error(`${file} does not hold the upserted chunk IDs`);
  }

  return new Set<string>(ids);
}

/** Exposes the cleanup status as a step output so the workflow only stamps a complete run. */
export function recordCleanupStatus(status: CleanupStatus, githubOutput: string | undefined): void {
  if (githubOutput) appendFileSync(githubOutput, `cleanup=${status}\n`);
}

export async function deleteStaleVectors(
  currentIds: ReadonlySet<string>,
  outcomes: readonly FetchOutcome[],
  listExistingIds: () => Promise<VectorIdListing>,
  deleteIds: (ids: string[]) => Promise<void>
): Promise<CleanupStatus> {
  // Vectorize may not list this run's newest upserts yet. Cleanup is still
  // safe because it only deletes listed IDs absent from the complete current
  // set, so a current ID can never be selected for deletion.
  const listing = await listExistingIds();
  const existingIds = listing.ids;
  const plan = planStaleDeletes(existingIds, currentIds, outcomes);

  if (plan.action === 'skip') {
    console.warn(`Not deleting stale vectors: ${plan.reason}`);

    return 'complete';
  }

  console.log(`Deleting ${plan.ids.length} stale vector(s) of ${existingIds.length}`);

  for (const ids of chunked(plan.ids, 100)) {
    await deleteIds(ids);
    console.log(`  deleted: ${ids.join(', ')}`);
  }

  if (listing.complete) return 'complete';

  const message =
    `Only ${existingIds.length} listed vector(s) were checked because ${listing.detail}. ` +
    'Stale vectors past that page remain until a retry lists the whole index.';

  console.warn(
    process.env.GITHUB_ACTIONS === 'true'
      ? `::warning title=Stale cleanup partial::${message}`
      : `Stale cleanup is partial: ${message}`
  );

  return 'partial';
}

async function listVectorIds(accountId: string, apiToken: string): Promise<VectorIdListing> {
  return listAllVectorIds((query) =>
    vectorizeFetch(accountId, apiToken, `list?${query}`, { method: 'GET' })
  );
}

/** Calls the Vectorize index API, retrying gateway errors; the caller checks the status. */
function vectorizeFetch(
  accountId: string,
  apiToken: string,
  path: string,
  init: RequestInit
): Promise<Response> {
  return retryTransient(() =>
    fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${VECTORIZE_INDEX}/${path}`,
      { ...init, headers: { ...init.headers, Authorization: `Bearer ${apiToken}` } }
    )
  );
}

async function vectorizeRequest(
  accountId: string,
  apiToken: string,
  path: string,
  init: RequestInit
): Promise<Response> {
  const response = await vectorizeFetch(accountId, apiToken, path, init);

  if (!response.ok) {
    const operation = path.split('?')[0];

    const detail = summarizeErrorBody(await response.text());

    throw new Error(`Vectorize ${operation} returned HTTP ${response.status}: ${detail}`);
  }

  return response;
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);

  return match ? match[1] : 'Untitled';
}

export function createDocumentChunks(fetched: readonly FetchedContent[]): Chunk[] {
  const chunks: Chunk[] = [];

  for (const { uri, content } of fetched) {
    const domain = new URL(uri).hostname;
    const title = extractTitle(content);
    const sections = splitByHeadings(content);

    for (const [sectionOrdinal, section] of sections.entries()) {
      chunks.push({
        id: generateId(uri, section.heading, sectionOrdinal),
        text: section.content,
        metadata: {
          uri,
          domain,
          title,
          snippet: section.content.slice(0, 200),
          section: section.heading,
          type: 'doc',
        },
      });
    }
  }

  return chunks;
}

function splitByHeadings(content: string): Array<{ heading: string; content: string }> {
  const lines = content.split('\n');
  const sections: Array<{ heading: string; content: string }> = [];
  let currentHeading = 'Introduction';
  let currentContent: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);

    if (h2Match) {
      if (currentContent.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join('\n').trim(),
        });
      }

      currentHeading = h2Match[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Add last section
  if (currentContent.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join('\n').trim(),
    });
  }

  // Filter out empty sections and merge small ones
  return sections.filter((s) => s.content.length > 50);
}

export function generateId(uri: string, section: string, sectionOrdinal: number): string {
  return createHash('sha256')
    .update(JSON.stringify([uri, section, sectionOrdinal]))
    .digest('hex');
}

export function assertUniqueChunkIds(chunks: readonly Pick<Chunk, 'id'>[]): void {
  const firstIndexById = new Map<string, number>();

  for (const [index, chunk] of chunks.entries()) {
    const firstIndex = firstIndexById.get(chunk.id);

    if (firstIndex !== undefined) {
      throw new Error(
        `Duplicate vector ID ${chunk.id} for chunks ${firstIndex + 1} and ${index + 1}`
      );
    }

    firstIndexById.set(chunk.id, index);
  }
}

async function generateEmbeddings(
  texts: string[],
  accountId: string,
  apiToken: string
): Promise<number[][]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/baai/bge-base-en-v1.5`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts }),
    }
  );

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const body: unknown = await response.json();
  const result = body instanceof Object && 'result' in body ? body.result : undefined;
  const data = result instanceof Object && 'data' in result ? result.data : undefined;

  if (!Array.isArray(data) || data.length !== texts.length) {
    throw new Error('Embedding API did not return one embedding per text');
  }

  const rows: unknown[] = data;
  const embeddings: number[][] = [];

  for (const row of rows) {
    if (!Array.isArray(row)) throw new Error('Embedding API returned a non-array embedding');

    embeddings.push(row.map(Number));
  }

  return embeddings;
}

async function upsertVectors(
  vectors: Array<{ id: string; values: number[]; metadata: Record<string, string> }>,
  accountId: string,
  apiToken: string
): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/expanso-docs/upsert`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/x-ndjson',
      },
      body: vectors.map((v) => JSON.stringify(v)).join('\n'),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vectorize upsert error: ${response.status} - ${error}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);

    // An annotation puts the cause on the workflow run summary, not deep in the log.
    console.error(
      process.env.GITHUB_ACTIONS === 'true' ? `::error title=Docs re-index failed::${message}` : message
    );
    process.exitCode = 1;
  });
}
