/**
 * Root page
 *
 * A static, server-rendered page: how to connect an MCP client, the tool
 * list straight from the tool registry, and a plain docs search box that
 * calls /api/search. Nothing on this page generates text.
 */

export interface ToolSummary {
  name: string;
  description: string;
}

interface ClientGuide {
  id: string;
  name: string;
  steps: string;
  snippet?: string;
  snippetLanguage?: string;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Connection instructions per client. The CLI forms were checked against
 * `claude mcp add --help` and `codex mcp add --help`; the config shapes
 * against the Cursor and Codex docs.
 */
export function getClientGuides(endpoint: string): ClientGuide[] {
  return [
    {
      id: 'claude-code',
      name: 'Claude Code',
      steps: 'Run once in a terminal. Add <code>--scope user</code> to make it available in every project.',
      snippet: `claude mcp add --transport http expanso-docs ${endpoint}`,
      snippetLanguage: 'shell',
    },
    {
      id: 'claude',
      name: 'Claude (desktop and web)',
      steps:
        'Open <strong>Customize &gt; Connectors</strong>, click the <strong>+</strong> next to Connectors, choose <strong>Custom &gt; Web</strong>, give it a name and paste the URL. No authentication is required.',
      snippet: endpoint,
      snippetLanguage: 'url',
    },
    {
      id: 'cursor',
      name: 'Cursor',
      steps: 'Add to <code>.cursor/mcp.json</code> in a project, or <code>~/.cursor/mcp.json</code> for every project.',
      snippet: JSON.stringify({ mcpServers: { 'expanso-docs': { url: endpoint } } }, null, 2),
      snippetLanguage: 'json',
    },
    {
      id: 'codex',
      name: 'Codex',
      steps: 'Run once in a terminal, or add the same server under <code>[mcp_servers]</code> in <code>~/.codex/config.toml</code>.',
      snippet: `codex mcp add expanso-docs --url ${endpoint}\n\n# or in ~/.codex/config.toml\n[mcp_servers.expanso-docs]\nurl = "${endpoint}"`,
      snippetLanguage: 'shell',
    },
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      steps:
        'Turn on <strong>Developer mode</strong> under <strong>Settings &gt; Security and login</strong>, then create a developer-mode app from this URL. Developer mode is available on Pro, Plus, Business, Enterprise and Education plans on the web.',
      snippet: endpoint,
      snippetLanguage: 'url',
    },
  ];
}

function renderGuide(guide: ClientGuide): string {
  const snippet = guide.snippet
    ? `<div class="snippet">
        <pre><code data-lang="${guide.snippetLanguage ?? ''}">${escapeHtml(guide.snippet)}</code></pre>
        <button type="button" class="copy" data-copy="${escapeHtml(guide.snippet)}">Copy</button>
      </div>`
    : '';

  return `<article class="client" id="${guide.id}">
      <h3>${escapeHtml(guide.name)}</h3>
      <p>${guide.steps}</p>
      ${snippet}
    </article>`;
}

function renderTool(tool: ToolSummary): string {
  return `<li><code>${escapeHtml(tool.name)}</code><span>${escapeHtml(tool.description)}</span></li>`;
}

const STYLES = `
  :root {
    --bg: #f4f1ea;
    --surface: #fbf9f4;
    --ink: #1c1b18;
    --muted: #5f5b52;
    --border: #d9d3c5;
    --accent: #0e6b5c;
    --accent-ink: #f4f1ea;
    --code-bg: #ebe7dc;
    --max: 56rem;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #15171a;
      --surface: #1d2024;
      --ink: #ece9e1;
      --muted: #a19c90;
      --border: #30343a;
      --accent: #4fd1b5;
      --accent-ink: #15171a;
      --code-bg: #23272c;
    }
  }
  :root[data-theme="dark"] {
    --bg: #15171a;
    --surface: #1d2024;
    --ink: #ece9e1;
    --muted: #a19c90;
    --border: #30343a;
    --accent: #4fd1b5;
    --accent-ink: #15171a;
    --code-bg: #23272c;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: 'IBM Plex Sans', 'Helvetica Neue', sans-serif;
    font-size: 1rem;
    line-height: 1.55;
  }
  code, pre, kbd {
    font-family: 'IBM Plex Mono', 'SFMono-Regular', Menlo, monospace;
    font-size: 0.9em;
  }
  a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }
  header, main, footer { max-width: var(--max); margin: 0 auto; padding: 0 16px; }
  header { padding-top: 3rem; padding-bottom: 2rem; }
  .brand { font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 0 0 1rem; }
  h1 { font-size: clamp(1.75rem, 4vw, 2.5rem); line-height: 1.15; margin: 0 0 0.75rem; font-weight: 600; }
  h2 { font-size: 1.35rem; margin: 0 0 0.5rem; font-weight: 600; }
  h3 { font-size: 1.05rem; margin: 0 0 0.35rem; font-weight: 600; }
  .lead { font-size: 1.1rem; color: var(--muted); margin: 0 0 1.5rem; max-width: 40rem; }
  section { border-top: 1px solid var(--border); padding: 2.25rem 0; }
  section > p.intro { color: var(--muted); margin: 0 0 1.5rem; max-width: 40rem; }
  .endpoint { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
  .endpoint code {
    background: var(--code-bg);
    border: 1px solid var(--border);
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    overflow-wrap: anywhere;
  }
  .client { padding: 1.25rem 0; border-top: 1px dashed var(--border); }
  .client:first-of-type { border-top: 0; padding-top: 0.5rem; }
  .client p { margin: 0 0 0.75rem; }
  .snippet { position: relative; }
  pre {
    margin: 0;
    background: var(--code-bg);
    border: 1px solid var(--border);
    padding: 0.9rem 1rem;
    padding-right: 4.5rem;
    overflow-x: auto;
    white-space: pre;
    line-height: 1.5;
  }
  .copy, button.search {
    font: inherit;
    font-size: 0.85rem;
    background: var(--accent);
    color: var(--accent-ink);
    border: 1px solid var(--accent);
    padding: 0.3rem 0.7rem;
    cursor: pointer;
  }
  .snippet .copy { position: absolute; top: 0.6rem; right: 0.6rem; }
  .copy[data-done="1"] { background: transparent; color: var(--accent); }
  ul.tools { list-style: none; padding: 0; margin: 0; }
  ul.tools li {
    display: grid;
    grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
    gap: 0.25rem 1.25rem;
    padding: 0.7rem 0;
    border-top: 1px dashed var(--border);
  }
  ul.tools li:first-child { border-top: 0; }
  ul.tools code { font-weight: 500; overflow-wrap: anywhere; }
  ul.tools span { color: var(--muted); min-width: 0; }
  form.search { display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 0 0 1rem; }
  form.search input {
    flex: 1 1 16rem;
    min-width: 0;
    font: inherit;
    padding: 0.5rem 0.75rem;
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--border);
  }
  form.search input:focus, .copy:focus-visible, button.search:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  #results { list-style: none; padding: 0; margin: 0; }
  #results li { padding: 0.9rem 0; border-top: 1px dashed var(--border); }
  #results li:first-child { border-top: 0; }
  #results .domain { font-size: 0.8rem; color: var(--muted); margin-left: 0.5rem; }
  #results p { margin: 0.25rem 0 0; color: var(--muted); font-size: 0.95rem; }
  #status { color: var(--muted); margin: 0 0 0.75rem; min-height: 1.5rem; }
  footer {
    border-top: 1px solid var(--border);
    padding-top: 1.5rem;
    padding-bottom: 3rem;
    color: var(--muted);
    font-size: 0.9rem;
  }
  footer ul { list-style: none; padding: 0; margin: 0.5rem 0 0; display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; }
  @media (max-width: 40rem) {
    ul.tools li { grid-template-columns: minmax(0, 1fr); }
    pre { padding-right: 1rem; white-space: pre-wrap; overflow-wrap: anywhere; }
    .snippet .copy { position: static; margin-top: 0.5rem; }
  }
`;

// Plain script: wires the copy buttons and the search box to /api/search.
// Kept free of backticks and template syntax so it can sit inside the
// template literal below.
const SCRIPT = `
  (function () {
    function esc(s) {
      return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    document.querySelectorAll('button.copy').forEach(function (button) {
      button.addEventListener('click', function () {
        var text = button.getAttribute('data-copy') || '';
        var done = function () {
          button.textContent = 'Copied';
          button.setAttribute('data-done', '1');
          setTimeout(function () {
            button.textContent = 'Copy';
            button.removeAttribute('data-done');
          }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {});
        }
      });
    });

    var form = document.getElementById('search-form');
    var input = document.getElementById('q');
    var status = document.getElementById('status');
    var results = document.getElementById('results');
    if (!form || !input || !status || !results) return;

    function render(data) {
      var items = (data && data.results) || [];
      if (items.length === 0) {
        status.textContent = 'No results for "' + data.query + '".';
        results.innerHTML = '';
        return;
      }
      status.textContent = items.length + ' result' + (items.length === 1 ? '' : 's') +
        ' for "' + data.query + '"';
      results.innerHTML = items.map(function (r) {
        return '<li><a href="' + esc(r.uri) + '">' + esc(r.title) + '</a>' +
          '<span class="domain">' + esc(r.domain) + '</span>' +
          '<p>' + esc(r.snippet) + '</p></li>';
      }).join('');
    }

    function search(query) {
      if (!query) return;
      status.textContent = 'Searching...';
      results.innerHTML = '';
      fetch('/api/search?q=' + encodeURIComponent(query) + '&limit=8')
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(render)
        .catch(function (err) {
          status.textContent = 'Search failed: ' + err.message;
        });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var query = input.value.trim();
      var next = new URL(window.location.href);
      if (query) next.searchParams.set('q', query); else next.searchParams.delete('q');
      history.replaceState(null, '', next.toString());
      search(query);
    });

    var initial = new URLSearchParams(window.location.search).get('q');
    if (initial) {
      input.value = initial;
      search(initial);
    }
  })();
`;

export function getHomeHtml(origin: string, tools: readonly ToolSummary[]): string {
  const endpoint = `${origin}/mcp`;
  const guides = getClientGuides(endpoint);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Expanso MCP Server</title>
  <meta name="description" content="Connect Claude, Cursor, Codex or ChatGPT to the Expanso documentation MCP server, see the tools it exposes, and search the docs.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>${STYLES}</style>
</head>
<body>
  <header>
    <p class="brand">Expanso</p>
    <h1>MCP server for the Expanso docs</h1>
    <p class="lead">Give your coding agent search over docs.expanso.io, examples.expanso.io and expanso.io, plus pipeline validation, component schemas and the Bloblang reference. Retrieval and validation only: the model you already use does the writing.</p>
    <div class="endpoint">
      <code id="endpoint">${escapeHtml(endpoint)}</code>
      <button type="button" class="copy" data-copy="${escapeHtml(endpoint)}">Copy</button>
    </div>
  </header>

  <main>
    <section id="connect">
      <h2>Connect a client</h2>
      <p class="intro">Streamable HTTP over POST, JSON-RPC, no authentication. Any MCP client that accepts a URL works; these are the common ones.</p>
      ${guides.map(renderGuide).join('\n      ')}
    </section>

    <section id="tools">
      <h2>Tools</h2>
      <p class="intro">What a connected client can call. This list is rendered from the server's tool registry, so it matches <code>tools/list</code>.</p>
      <ul class="tools">
        ${tools.map(renderTool).join('\n        ')}
      </ul>
    </section>

    <section id="search">
      <h2>Search the docs</h2>
      <p class="intro">The same semantic search the <code>search_docs</code> tool runs, with no generation on top. Results link to the source page.</p>
      <form class="search" id="search-form" action="/api/search" method="get" role="search">
        <input id="q" name="q" type="search" aria-label="Search query" placeholder="kafka to s3 with batching" autocomplete="off" required>
        <input type="hidden" name="limit" value="8">
        <button type="submit" class="search">Search</button>
      </form>
      <p id="status" aria-live="polite"></p>
      <ul id="results"></ul>
    </section>
  </main>

  <footer>
    <p>HTTP API: <a href="/api/search?q=circuit+breaker">/api/search</a>, <a href="/api/resources">/api/resources</a>, <code>POST /api/validate</code>. Discovery: <a href="/.well-known/mcp.json">/.well-known/mcp.json</a>. Health: <a href="/health">/health</a>.</p>
    <ul>
      <li><a href="https://docs.expanso.io">docs.expanso.io</a></li>
      <li><a href="https://examples.expanso.io">examples.expanso.io</a></li>
      <li><a href="https://github.com/expanso-io/mcp.expanso.io">Source on GitHub</a></li>
    </ul>
  </footer>
  <script>${SCRIPT}</script>
</body>
</html>
`;
}
