/**
 * Worker routing tests
 *
 * Cover the routes that changed when the chat page and its LLM path were
 * removed: the root page, the old chat URLs, and the endpoints that only
 * the chat page used. Search and MCP handlers have their own tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker, { type Env } from './index';

function makeEnv(): Env {
  // SAFETY: none of the routes under test reach the AI binding; search
  // with a query is the only caller and these tests never send one.
  return {
    AI: {} as Ai,
    DOCS_DOMAINS: 'expanso.io,docs.expanso.io,examples.expanso.io',
    POSTHOG_API_KEY: 'phc_test',
  };
}

function makeCtx(): ExecutionContext {
  const ctx: ExecutionContext = {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    props: {},
  };

  return ctx;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const req = new Request(`https://mcp.expanso.io${path}`, init);

  return worker.fetch(req, makeEnv(), makeCtx());
}

describe('worker routes', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // The page view tracker posts to PostHog; keep tests offline.
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('ok'));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('serves the root page as HTML built from the tool registry', async () => {
    const res = await request('/');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const body = await res.text();
    expect(body).toContain('https://mcp.expanso.io/mcp');
    expect(body).toContain('<code>search_docs</code>');
    expect(body).toContain('<code>validate_pipeline</code>');
  });

  it('redirects the old chat page to the root', async () => {
    const res = await request('/chat');
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('https://mcp.expanso.io/');
  });

  it('no longer serves the chat API', async () => {
    const res = await request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'kafka to s3' }),
    });

    expect(res.status).toBe(404);
  });

  it.each(['/api/examples', '/api/yaml-feedback', '/api/bad-yaml', '/api/yaml-export'])(
    'no longer serves the chat-only endpoint %s',
    async (path) => {
      const res = await request(path);
      expect(res.status).toBe(404);
    }
  );

  it('keeps the health check', async () => {
    const res = await request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', service: 'expanso-mcp-server' });
  });

  it('keeps the discovery document', async () => {
    const res = await request('/.well-known/mcp.json');
    expect(res.status).toBe(200);
    const body: { servers: Array<{ url: string }> } = await res.json();
    expect(body.servers[0].url).toBe('https://mcp.expanso.io');
  });

  it('rejects a search without a query', async () => {
    const res = await request('/api/search');
    expect(res.status).toBe(400);
  });
});
