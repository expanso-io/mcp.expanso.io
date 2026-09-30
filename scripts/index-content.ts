#!/usr/bin/env npx tsx
/**
 * Index llms.txt content into Cloudflare Vectorize
 *
 * Usage: npm run index
 *
 * Requires CLOUDFLARE_API_TOKEN environment variable.
 * Account ID is read from wrangler.toml automatically.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PIPELINE_EXAMPLES, getExampleSearchText } from '../src/examples-registry';
import {
  chunked,
  classifyResponse,
  listAllVectorIds,
  planStaleDeletes,
  retryTransient,
  summarizeErrorBody,
  type FetchOutcome,
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

interface Chunk {
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

async function main() {
  const accountId = getAccountIdFromWrangler();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.error('Missing CLOUDFLARE_ACCOUNT_ID (in wrangler.toml) or CLOUDFLARE_API_TOKEN env var');
    process.exit(1);
  }

  const startTime = Date.now();
  console.log('Fetching content in parallel...');

  // Fetch all URLs in parallel, keeping why each one failed: a removed page
  // lets its old vectors be deleted, a transient failure must not.
  const outcomes: FetchOutcome[] = [];
  const fetched: Array<{ uri: string; content: string }> = [];

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

  const chunks: Chunk[] = [];

  for (const { uri, content } of fetched) {
    const domain = new URL(uri).hostname;
    const title = extractTitle(content);
    const sections = splitByHeadings(content);

    for (const section of sections) {
      chunks.push({
        id: generateId(uri, section.heading),
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

  console.log(`Total chunks to index: ${chunks.length} (${chunks.filter(c => c.metadata.type === 'doc').length} docs + ${chunks.filter(c => c.metadata.type === 'example').length} examples)`);

  if (chunks.length === 0) {
    console.log('No chunks to index');

    return;
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

  try {
    await deleteStaleVectors(new Set(chunks.map((c) => c.id)), outcomes, accountId, apiToken);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    throw new Error(
      `Upserted ${chunks.length} chunks, but deleting stale vectors failed: ${reason}. ` +
        'search_docs serves the new content plus any stale vectors until a run succeeds.'
    );
  }

  console.log(`\nDone in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

async function deleteStaleVectors(
  currentIds: ReadonlySet<string>,
  outcomes: readonly FetchOutcome[],
  accountId: string,
  apiToken: string
): Promise<void> {
  const existingIds = await listVectorIds(accountId, apiToken);
  const plan = planStaleDeletes(existingIds, currentIds, outcomes);

  if (plan.action === 'skip') {
    console.warn(`Not deleting stale vectors: ${plan.reason}`);

    return;
  }

  console.log(`Deleting ${plan.ids.length} stale vector(s) of ${existingIds.length}`);

  for (const ids of chunked(plan.ids, 100)) {
    await vectorizeRequest(accountId, apiToken, 'delete_by_ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    console.log(`  deleted: ${ids.join(', ')}`);
  }
}

async function listVectorIds(accountId: string, apiToken: string): Promise<string[]> {
  return listAllVectorIds((query) =>
    vectorizeRequest(accountId, apiToken, `list?${query}`, { method: 'GET' })
  );
}

async function vectorizeRequest(
  accountId: string,
  apiToken: string,
  path: string,
  init: RequestInit
): Promise<Response> {
  const response = await retryTransient(() =>
    fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${VECTORIZE_INDEX}/${path}`,
      { ...init, headers: { ...init.headers, Authorization: `Bearer ${apiToken}` } }
    )
  );

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

function generateId(uri: string, section: string): string {
  const base = uri.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const sectionSlug = section.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  const id = `${base}_${sectionSlug}`;

  // Vectorize max ID is 64 bytes
  return id.slice(0, 64);
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

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  // An annotation puts the cause on the workflow run summary, not deep in the log.
  console.error(
    process.env.GITHUB_ACTIONS === 'true' ? `::error title=Docs re-index failed::${message}` : message
  );
  process.exitCode = 1;
});
