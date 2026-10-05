/**
 * Tests for the root page
 *
 * The page is static HTML built from the tool registry; these tests pin
 * what it must always contain and that nothing from the registry can
 * break out of its markup.
 */

import { describe, it, expect } from 'vitest';
import { getHomeHtml, getClientGuides, escapeHtml } from './home-page';
import { TOOLS } from './mcp';

const ORIGIN = 'https://mcp.expanso.io';

describe('getHomeHtml', () => {
  const html = getHomeHtml(ORIGIN, TOOLS);

  it('is a complete HTML document', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Expanso MCP Server</title>');
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('shows the MCP endpoint for the request origin', () => {
    expect(html).toContain(`<code id="endpoint">${ORIGIN}/mcp</code>`);
    const other = getHomeHtml('http://localhost:8787', TOOLS);
    expect(other).toContain('<code id="endpoint">http://localhost:8787/mcp</code>');
    expect(other).not.toContain('mcp.expanso.io/mcp');
  });

  it('lists every registered tool with its description', () => {
    expect(TOOLS.length).toBeGreaterThan(0);

    for (const tool of TOOLS) {
      expect(html).toContain(`<code>${tool.name}</code>`);
      expect(html).toContain(escapeHtml(tool.description));
    }
  });

  it('has a section for each supported client', () => {
    for (const id of ['claude-code', 'claude', 'cursor', 'codex', 'chatgpt']) {
      expect(html).toContain(`<article class="client" id="${id}">`);
    }
  });

  it('has a plain search form that targets /api/search', () => {
    expect(html).toContain('action="/api/search"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="q"');
    expect(html).toContain("fetch('/api/search?q='");
  });

  it('never calls a generation endpoint', () => {
    expect(html).not.toContain('/api/chat');
    expect(html).not.toContain('llama');
  });

  it('escapes registry text before rendering it', () => {
    const hostile = [{ name: 'x<script>', description: 'a & b "c"' }];
    const page = getHomeHtml(ORIGIN, hostile);
    expect(page).not.toContain('x<script>');
    expect(page).toContain('x&lt;script&gt;');
    expect(page).toContain('a &amp; b &quot;c&quot;');
  });
});

describe('getClientGuides', () => {
  const endpoint = `${ORIGIN}/mcp`;
  const guides = getClientGuides(endpoint);
  const byId = Object.fromEntries(guides.map(g => [g.id, g]));

  it('uses the verified CLI forms for Claude Code and Codex', () => {
    expect(byId['claude-code'].snippet).toBe(
      `claude mcp add --transport http expanso-docs ${endpoint}`
    );
    expect(byId['codex'].snippet).toContain(`codex mcp add expanso-docs --url ${endpoint}`);
    expect(byId['codex'].snippet).toContain('[mcp_servers.expanso-docs]');
  });

  it('gives Cursor a parseable mcp.json with a url entry', () => {
    const parsed = JSON.parse(byId['cursor'].snippet ?? '');
    expect(parsed.mcpServers['expanso-docs'].url).toBe(endpoint);
  });

  it('points the UI-driven clients at the bare endpoint', () => {
    expect(byId['claude'].snippet).toBe(endpoint);
    expect(byId['chatgpt'].snippet).toBe(endpoint);
  });

  it('links ChatGPT users to the developer mode guide instead of plan claims', () => {
    expect(byId['chatgpt'].steps).toContain(
      'https://developers.openai.com/api/docs/guides/developer-mode',
    );
    expect(byId['chatgpt'].steps).not.toMatch(/Pro, Plus|Enterprise|Education/);
  });
});

describe('search results rendered by the page script', () => {
  type FakeElement = {
    value: string;
    textContent: string;
    innerHTML: string;
    addEventListener: () => void;
  };

  async function renderResults(results: unknown[]): Promise<FakeElement> {
    const html = getHomeHtml(ORIGIN, TOOLS);
    const script = html.slice(html.indexOf('<script>') + '<script>'.length, html.indexOf('</script>'));
    const element = (): FakeElement => ({
      value: '',
      textContent: '',
      innerHTML: '',
      addEventListener: () => undefined,
    });
    const byId: Record<string, FakeElement> = {
      'search-form': element(),
      q: element(),
      status: element(),
      results: element(),
    };
    const document = {
      querySelectorAll: () => [],
      getElementById: (id: string) => byId[id] ?? null,
    };
    const window = { location: { href: `${ORIGIN}/?q=kafka`, search: '?q=kafka' } };
    const fetch = async () => ({ ok: true, json: async () => ({ query: 'kafka', results }) });
    new Function('document', 'window', 'fetch', 'URLSearchParams', script)(
      document,
      window,
      fetch,
      URLSearchParams,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    return byId['results'];
  }

  it('links docs results straight to their https source', async () => {
    const results = await renderResults([
      { uri: 'https://docs.expanso.io/llms/cli.txt', title: 'CLI', domain: 'docs.expanso.io', snippet: 'Run it' },
    ]);
    expect(results.innerHTML).toContain('<a href="https://docs.expanso.io/llms/cli.txt">CLI</a>');
  });

  it('shows example results as plain text with no link', async () => {
    const results = await renderResults([
      { uri: 'examples://expanso.io/kafka-to-s3-json', title: 'Kafka to S3', domain: 'examples.expanso.io', snippet: 'Batch & ship' },
    ]);
    expect(results.innerHTML).not.toContain('<a ');
    expect(results.innerHTML).not.toContain('/api/resources/');
    expect(results.innerHTML).toContain('<strong>Kafka to S3</strong>');
    expect(results.innerHTML).toContain('<span class="domain">examples.expanso.io</span>');
    expect(results.innerHTML).toContain('<p>Batch &amp; ship</p>');
  });
});
