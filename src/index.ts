/**
 * Expanso MCP Server
 *
 * Provides semantic search and retrieval over Expanso documentation.
 * Supports both HTTP API and MCP protocol over SSE.
 */

import { handleMcpRequest, handleSseConnection } from './mcp';
import { handleSearch, handleListResources, handleReadResource } from './handlers';
import { getChatHtml } from './chat-ui';
import { trackChat, trackSearch, trackPageView, trackYamlFeedback, trackYamlGenerated, getDistinctId } from './analytics';
import { validatePipelineYaml, formatValidationErrors } from './pipeline-validator';
import { searchExamples, formatExamplesForContext, getRandomExamples, formatWelcomeExamples } from './examples-registry';
import { generateComponentsSection, extractComponentsFromYaml } from './docs-links';

// External Expanso validator
interface ExternalValidationResult {
  valid: boolean;
  errors: string[];
  formatted?: string;
}

async function validateWithExpanso(yaml: string): Promise<ExternalValidationResult> {
  try {
    const response = await fetch('https://validate.expanso.io/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: yaml,
    });

    if (!response.ok) {
      // Validation endpoint returned error - treat as invalid
      const errorText = await response.text();
      return {
        valid: false,
        errors: [errorText || `Validation failed with status ${response.status}`],
      };
    }

    const result = await response.json() as Record<string, unknown> | null;

    // Handle different response formats
    if (result && typeof result === 'object') {
      if ('valid' in result && typeof result.valid === 'boolean') {
        const errors = Array.isArray(result.errors) ? result.errors as string[] :
                       Array.isArray(result.issues) ? result.issues as string[] : [];
        return {
          valid: result.valid,
          errors,
          formatted: typeof result.formatted === 'string' ? result.formatted : undefined,
        };
      }
      // If response has lint_errors or similar
      if ('lint_errors' in result && Array.isArray(result.lint_errors)) {
        return {
          valid: result.lint_errors.length === 0,
          errors: result.lint_errors as string[],
        };
      }
    }

    // If we got a 200 with no clear error structure, assume valid
    return { valid: true, errors: [] };
  } catch (error) {
    // Network error - don't block, just log
    console.error('External validation error:', error);
    return { valid: true, errors: [] }; // Fail open on network issues
  }
}

export interface Env {
  AI: Ai;
  VECTORIZE?: VectorizeIndex; // Optional - requires vectorize:create permission
  CONTENT_CACHE?: KVNamespace; // Optional - requires kv:create permission
  DOCS_DOMAINS: string;
  POSTHOG_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      switch (url.pathname) {
        // Chat UI - serve HTML interface
        case '/':
        case '/chat':
          // Track page view (non-blocking)
          ctx.waitUntil(
            trackPageView(env.POSTHOG_API_KEY, getDistinctId(request), url.pathname)
          );
          return new Response(getChatHtml(), {
            headers: { 'Content-Type': 'text/html', ...corsHeaders },
          });

        // Health check
        case '/health':
          return jsonResponse({ status: 'ok', service: 'expanso-mcp-server' }, corsHeaders);

        // Chat API - RAG-powered chat
        case '/api/chat':
          return handleChatApi(request, env, corsHeaders);

        // MCP protocol endpoint (SSE for streaming)
        case '/mcp':
          if (request.headers.get('Accept') === 'text/event-stream') {
            return handleSseConnection(request, env);
          }
          return handleMcpRequest(request, env);

        // HTTP API endpoints for direct access
        case '/api/search':
          return handleSearchApi(request, env, corsHeaders);

        case '/api/resources':
          return handleResourcesApi(request, env, corsHeaders);

        case '/api/examples':
          return handleExamplesApi(corsHeaders);

        case '/api/yaml-feedback':
          return handleYamlFeedbackApi(request, env, corsHeaders);

        case '/api/yaml-export':
          return handleYamlExportApi(request, env, corsHeaders);

        case '/api/validate':
          return handleValidateApi(request, env, corsHeaders);

        // Serve discovery document
        case '/.well-known/mcp.json':
          return jsonResponse(getMcpDiscovery(url.origin), corsHeaders);

        default:
          // Handle /api/resources/:uri pattern
          if (url.pathname.startsWith('/api/resources/')) {
            const uri = decodeURIComponent(url.pathname.slice('/api/resources/'.length));
            return handleResourceReadApi(uri, env, corsHeaders);
          }
          return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
      }
    } catch (error) {
      console.error('Request error:', error);
      return jsonResponse(
        { error: error instanceof Error ? error.message : 'Internal error' },
        corsHeaders,
        500
      );
    }
  },
};

// HTTP API: Search
async function handleSearchApi(
  request: Request,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const limit = parseInt(url.searchParams.get('limit') || '5', 10);
  const domain = url.searchParams.get('domain') || undefined;

  if (!query) {
    return jsonResponse({ error: 'Missing query parameter: q' }, headers, 400);
  }

  const results = await handleSearch(env, query, limit, domain);

  // Track search (non-blocking)
  trackSearch(
    env.POSTHOG_API_KEY,
    getDistinctId(request),
    query,
    results.results?.length || 0,
    domain
  ).catch(() => {});

  return jsonResponse(results, headers);
}

// HTTP API: List resources
async function handleResourcesApi(
  request: Request,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  const resources = await handleListResources(env);
  return jsonResponse(resources, headers);
}

// HTTP API: Get random examples for welcome screen
function handleExamplesApi(
  headers: Record<string, string>
): Response {
  const examples = getRandomExamples(6);
  const formatted = formatWelcomeExamples(examples);
  return jsonResponse({ examples: formatted, total: 16 }, headers);
}

// HTTP API: Read resource
async function handleResourceReadApi(
  uri: string,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  const content = await handleReadResource(env, uri);
  if (!content) {
    return jsonResponse({ error: 'Resource not found' }, headers, 404);
  }
  return jsonResponse(content, headers);
}

// HTTP API: YAML Feedback
async function handleYamlFeedbackApi(
  request: Request,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, headers, 405);
  }

  let body: {
    yaml: string;
    isValid: boolean;
    userMessage: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, headers, 400);
  }

  if (!body.yaml || typeof body.isValid !== 'boolean') {
    return jsonResponse({ error: 'Missing yaml or isValid field' }, headers, 400);
  }

  // Run our validator on the YAML
  const validationResult = validatePipelineYaml(body.yaml);

  // Track the feedback (non-blocking)
  trackYamlFeedback(
    env.POSTHOG_API_KEY,
    getDistinctId(request),
    body.yaml,
    body.isValid,
    body.userMessage || '',
    {
      errors: validationResult.errors.map(e => `${e.path}: ${e.message}`),
      warnings: validationResult.warnings,
    }
  ).catch(() => {});

  return jsonResponse({
    received: true,
    userReportedValid: body.isValid,
    validatorResult: {
      valid: validationResult.valid,
      errorCount: validationResult.errors.length,
      errors: validationResult.errors.map(e => ({
        path: e.path,
        message: e.message,
        suggestion: e.suggestion,
      })),
    },
  }, headers);
}

// HTTP API: Validate YAML
async function handleValidateApi(
  request: Request,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, headers, 405);
  }

  let body: { yaml: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, headers, 400);
  }

  if (!body.yaml) {
    return jsonResponse({ error: 'Missing yaml field' }, headers, 400);
  }

  // Run local validation
  const localResult = validatePipelineYaml(body.yaml);

  // Run external Expanso validation
  const externalResult = await validateWithExpanso(body.yaml);

  // Combine results
  const allErrors: Array<{ path: string; message: string; suggestion?: string } | string> = [
    ...localResult.errors.map(e => ({
      path: e.path,
      message: e.message,
      suggestion: e.suggestion,
    })),
    ...externalResult.errors,
  ];

  const isValid = localResult.valid && externalResult.valid;

  return jsonResponse({
    valid: isValid,
    errors: allErrors,
    warnings: localResult.warnings,
  }, headers);
}

// HTTP API: Export stored YAML data
async function handleYamlExportApi(
  request: Request,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 1000);
  const validOnly = url.searchParams.get('valid') === 'true';
  const invalidOnly = url.searchParams.get('invalid') === 'true';

  if (!env.CONTENT_CACHE) {
    return jsonResponse({ error: 'KV store not available' }, headers, 500);
  }

  // List all YAML keys
  const listResult = await env.CONTENT_CACHE.list({ prefix: 'yaml_', limit: limit });
  const results: Array<{
    id: string;
    yaml: string;
    userMessage: string;
    timestamp: string;
    validatorValid: boolean;
    structureErrors: string[];
    bloblangErrors: string[];
    componentErrors: string[];
  }> = [];

  for (const key of listResult.keys) {
    const data = await env.CONTENT_CACHE.get(key.name);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        // Apply filters
        if (validOnly && !parsed.validatorValid) continue;
        if (invalidOnly && parsed.validatorValid) continue;

        results.push({
          id: key.name,
          ...parsed,
        });
      } catch {
        // Skip malformed entries
      }
    }
  }

  // Sort by timestamp descending (newest first)
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (format === 'csv') {
    const csvHeader = 'id,timestamp,validatorValid,userMessage,yaml,structureErrors,bloblangErrors,componentErrors\n';
    const csvRows = results.map(r =>
      `"${r.id}","${r.timestamp}",${r.validatorValid},"${r.userMessage.replace(/"/g, '""')}","${r.yaml.replace(/"/g, '""')}","${r.structureErrors.join('; ')}","${r.bloblangErrors.join('; ')}","${r.componentErrors.join('; ')}"`
    ).join('\n');

    return new Response(csvHeader + csvRows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="yaml-export.csv"',
        ...headers,
      },
    });
  }

  return jsonResponse({
    count: results.length,
    hasMore: !listResult.list_complete,
    results,
  }, headers);
}

// HTTP API: Chat with RAG
async function handleChatApi(
  request: Request,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, headers, 405);
  }

  let body: {
    message: string;
    history?: Array<{ role: string; content: string }>;
    currentYaml?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, headers, 400);
  }

  if (!body.message) {
    return jsonResponse({ error: 'Missing message field' }, headers, 400);
  }

  // If user has a current YAML, include it in the message context
  const currentPipelineContext = body.currentYaml
    ? `\n\nCURRENT PIPELINE (user may have edited this - use as the basis for modifications):\n\`\`\`yaml\n${body.currentYaml}\n\`\`\`\n`
    : '';

  // EXAMPLES-FIRST RAG: Find matching examples BEFORE searching docs
  const matchingExamples = searchExamples(body.message, 3);
  const examplesContext = formatExamplesForContext(matchingExamples);
  const hasExamples = matchingExamples.length > 0;

  // SPEED OPTIMIZATION: Skip slow semantic search if we have good example matches
  // The examples contain validated YAML which is most important for pipeline questions
  let docsContext = '';
  let searchResults: { results: Array<{ uri: string; title: string }> } = { results: [] };

  if (!hasExamples) {
    // Only do expensive semantic search if no local examples matched
    searchResults = await handleSearch(env, body.message, 2);

    // Fetch actual content from top results (not just metadata!)
    if (searchResults.results && searchResults.results.length > 0) {
      const contentPromises = searchResults.results.slice(0, 2).map(async (r) => {
        const content = await handleReadResource(env, r.uri);
        if (content) {
          // Truncate more aggressively to reduce tokens and speed up LLM
          const truncated = content.content.length > 1500
            ? content.content.slice(0, 1500) + '\n...[truncated]'
            : content.content;
          return `## ${r.title}\nSource: ${r.uri}\n\n${truncated}`;
        }
        return null;
      });

      const contents = await Promise.all(contentPromises);
      docsContext = contents.filter(Boolean).join('\n\n---\n\n');
    }
  }

  // Combine: Examples first (if any), then docs
  const context = [examplesContext, docsContext].filter(Boolean).join('\n\n---\n\n');

  // Build messages for the LLM
  const systemPrompt = `You are a documentation assistant for Expanso.

${hasExamples ? `CRITICAL: VALIDATED EXAMPLES ARE PROVIDED BELOW.
When the user asks for a pipeline, you MUST:
1. Find the most relevant example from the "Validated Pipeline Examples" section
2. ADAPT that example for the user's specific needs - change inputs, outputs, field names as needed
3. NEVER generate YAML from scratch - always start from a validated example
4. If no example matches, say "I don't have a validated example for that use case" and suggest the closest alternative

` : ''}COMMUNICATION STYLE:
- Write in plain, simple English - avoid jargon
- Keep explanations SHORT (2-3 sentences max per point)
- Use bullet points, not paragraphs
- Be direct: "This reads from X and writes to Y"

CRITICAL RULES:
1. ONLY use information from the context below - NEVER make up YAML, commands, or examples
2. If the context doesn't contain what the user needs, say "I don't have that information in the current documentation"
3. Always preserve the exact YAML structure from examples - only change values, not structure
4. Use precise verbs: inputs "read from", outputs "write to", processors "transform". Never say "learns" or "understands".

PIPELINE YAML FORMAT - THIS IS MANDATORY:
A pipeline is ONE YAML document with input, pipeline, and output sections.
\`\`\`yaml
input:
  kafka:
    addresses: [localhost:9092]
    topics: [my-topic]

pipeline:
  processors:      # ALL processors go in ONE list - never split into multiple documents
    - mapping: |
        root.timestamp = now()
        root.data = this.value.parse_json()
    - mapping: |
        root = if this.data.type == "event" { this.data.event } else { deleted() }

output:
  aws_s3:
    bucket: my-bucket
    path: \${! timestamp_unix() }.json
\`\`\`

BLOBLANG SYNTAX (inside mapping:):
- Parse JSON: this.parse_json() or this.value.parse_json() - NOT from_json()
- Format JSON: this.format_json() - NOT to_json()
- Conditionals: if cond { val } else { other } - NOT if...then...else
- Drop message: root = deleted() - NOT root = null
- Variables: let x = value - NOT var or const
- Arrays: this.map_each(x -> x.field) - NOT .map(x => ...)

NEVER USE THESE PATTERNS:
- Multiple "---" separated documents (wrong) - ONE document only
- "components:" (wrong) - use "input:", "pipeline:", "output:"
- "pipeline: with:" (wrong) - use "pipeline: processors:"
- "from_json()" (wrong) - use .parse_json() method
- "if x then y else z" (wrong) - use if x { y } else { z }

Context:
${context || 'No relevant documentation found for this query.'}`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history if provided
  if (body.history && Array.isArray(body.history)) {
    for (const msg of body.history.slice(-10)) { // Keep last 10 messages
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  // Add current message (with current pipeline context if user has one)
  const userMessage = currentPipelineContext
    ? `${body.message}${currentPipelineContext}`
    : body.message;
  messages.push({ role: 'user', content: userMessage });

  // Call Workers AI - using 8B-fast with speculative decoding for speed + quality
  const response = await (env.AI.run as Function)('@cf/meta/llama-3.1-8b-instruct-fast', {
    messages,
    max_tokens: 768,
  });

  // Map sources to include url for frontend
  const sources = (searchResults.results?.slice(0, 3) || []).map((r) => ({
    title: r.title,
    url: r.uri,
  }));

  let responseText = (response as { response: string }).response;

  // Validate any YAML code blocks in the response
  const yamlBlocks = findYamlInResponse(responseText);
  const validationWarnings: string[] = [];
  const distinctId = getDistinctId(request);

  for (const yaml of yamlBlocks) {
    // Run local validation first (fast)
    const localResult = validatePipelineYaml(yaml);

    // Run external Expanso validation (authoritative)
    const externalResult = await validateWithExpanso(yaml);

    // Generate unique ID for this YAML
    const yamlId = `yaml_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Categorize local errors
    const structureErrors = localResult.errors
      .filter(e => e.path === 'root' || e.path.startsWith('root.') || e.path === 'pipeline')
      .map(e => `${e.path}: ${e.message}`);
    const bloblangErrors = localResult.errors
      .filter(e => e.path.includes('mapping') || e.path.includes('bloblang'))
      .map(e => `${e.path}: ${e.message}`);
    const componentErrors = localResult.errors
      .filter(e => !structureErrors.includes(`${e.path}: ${e.message}`) &&
                   !bloblangErrors.includes(`${e.path}: ${e.message}`))
      .map(e => `${e.path}: ${e.message}`);

    // Combined validity: both must pass
    const isValid = localResult.valid && externalResult.valid;

    // Store full YAML in KV (non-blocking)
    if (env.CONTENT_CACHE) {
      env.CONTENT_CACHE.put(yamlId, JSON.stringify({
        yaml,
        userMessage: body.message,
        timestamp: new Date().toISOString(),
        localValid: localResult.valid,
        externalValid: externalResult.valid,
        structureErrors,
        bloblangErrors,
        componentErrors,
        externalErrors: externalResult.errors,
      }), { expirationTtl: 60 * 60 * 24 * 90 }) // Keep for 90 days
        .catch(() => {});
    }

    // Track to PostHog with categorized errors (non-blocking)
    trackYamlGenerated(
      env.POSTHOG_API_KEY,
      distinctId,
      yaml,
      body.message,
      {
        valid: isValid,
        errors: [...localResult.errors.map(e => `${e.path}: ${e.message}`), ...externalResult.errors],
        warnings: localResult.warnings,
      },
      yamlId
    ).catch(() => {});

    // Add warnings for any validation failures
    if (!localResult.valid) {
      validationWarnings.push(formatValidationErrors(localResult));
    }
    if (!externalResult.valid && externalResult.errors.length > 0) {
      validationWarnings.push('**Expanso Validation Errors:**\n' + externalResult.errors.map(e => `- ${e}`).join('\n'));
    }
  }

  // Append validation warnings if any YAML is invalid
  if (validationWarnings.length > 0) {
    responseText += '\n\n---\n**Warning: Pipeline Validation Issue**\n' +
      validationWarnings.join('\n\n') +
      '\n\nPlease refer to the [Components documentation](https://docs.expanso.io/components) for valid pipeline syntax.';
  }

  // Add validated component documentation links for any YAML in the response
  if (yamlBlocks.length > 0) {
    const componentsSection = generateComponentsSection(yamlBlocks[0]);
    if (componentsSection) {
      responseText += '\n\n' + componentsSection;
    }
  }

  // Track chat (non-blocking)
  trackChat(
    env.POSTHOG_API_KEY,
    getDistinctId(request),
    body.message,
    responseText.length,
    sources.length
  ).catch(() => {});

  return jsonResponse({
    response: responseText,
    sources,
  }, headers);
}

// MCP discovery document
function getMcpDiscovery(origin: string) {
  return {
    $schema: 'https://modelcontextprotocol.io/schemas/mcp.json',
    name: 'Expanso Documentation',
    description: 'Semantic search and retrieval over Expanso platform documentation',
    homepage: 'https://expanso.io',
    servers: [
      {
        name: 'expanso-docs',
        url: origin,
        description: 'Search and retrieve Expanso documentation',
        capabilities: {
          tools: true,
          resources: true,
        },
      },
    ],
  };
}

// Helper: JSON response
function jsonResponse(
  data: unknown,
  headers: Record<string, string>,
  status = 200
): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

// Helper: Find YAML blocks in response text
function findYamlInResponse(text: string): string[] {
  const blocks: string[] = [];
  // Match code blocks with yaml/yml language hint
  const matches = text.matchAll(/```(?:yaml|yml)?\n([\s\S]*?)```/g);

  for (const match of matches) {
    const yaml = match[1].trim();
    // Only validate if it looks like a pipeline config
    if (yaml.includes('input') || yaml.includes('output') || yaml.includes('components')) {
      blocks.push(yaml);
    }
  }

  return blocks;
}
