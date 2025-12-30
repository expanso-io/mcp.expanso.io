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
import type { components } from './types/validate-api';

// Typed external validation using validate.expanso.io API contract
type ValidateResponse = components['schemas']['ValidateResponse'];
type Hallucination = components['schemas']['Hallucination'];
type HallucinationType = components['schemas']['HallucinationType'];

type ValidationSummary = components['schemas']['ValidationSummary'];
type FirstError = components['schemas']['FirstError'];

interface ExternalValidationResult {
  valid: boolean;
  error_count: number;
  hallucinations: Hallucination[];
  formatted_yaml?: string;
  corrected_yaml?: string;
  summary?: ValidationSummary;
}

// Format a hallucination into a human-readable string
function formatHallucination(h: Hallucination): string {
  const prefix: Record<HallucinationType, string> = {
    'IMAGINED_COMPONENT': '❌ Unknown component',
    'IMAGINED_FIELD': '❌ Unknown field',
    'IMAGINED_STRUCTURE': '🔧 Wrong structure',
    'IMAGINED_SYNTAX': '⚠️ Invalid Bloblang',
    'WRONG_TYPE': '📝 Type error',
    'DUPLICATE_LABEL': '🏷️ Duplicate label',
    'UNDEFINED_RESOURCE': '🔗 Missing resource',
    'UNKNOWN': '❓ Validation error',
  };

  const icon = prefix[h.category] || '❓';
  const correction = h.correction ? ` → use "${h.correction}"` : '';
  const line = h.line ? ` (line ${h.line})` : '';
  return `${icon}: ${h.message}${correction}${line}`;
}

// Convert hallucinations to simple error strings for backwards compatibility
function hallucinationsToErrors(hallucinations: Hallucination[]): string[] {
  return hallucinations
    .filter(h => h.severity === 'ERROR')
    .map(formatHallucination);
}

async function validateWithExpanso(yaml: string, options: { autoCorrect?: boolean; summarize?: boolean } = {}): Promise<ExternalValidationResult> {
  try {
    const params = new URLSearchParams();
    if (options.autoCorrect) params.set('auto_correct', 'true');
    if (options.summarize) params.set('summarize', 'true');
    const queryString = params.toString();
    const url = `https://validate.expanso.io/validate${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: yaml,
    });

    if (!response.ok) {
      // Validation endpoint returned error - treat as invalid
      const errorText = await response.text();
      return {
        valid: false,
        error_count: 1,
        hallucinations: [{
          category: 'UNKNOWN',
          severity: 'ERROR',
          path: 'root',
          hallucination: 'request_failed',
          message: errorText || `Validation failed with status ${response.status}`,
        }],
      };
    }

    // Response is now typed via OpenAPI contract
    const result: ValidateResponse = await response.json();

    return {
      valid: result.valid,
      error_count: result.error_count,
      hallucinations: result.hallucinations,
      formatted_yaml: result.formatted_yaml,
      corrected_yaml: result.corrected_yaml,
      summary: result.summary,
    };
  } catch (error) {
    // Network error - don't block, just log
    console.error('External validation error:', error);
    return { valid: true, error_count: 0, hallucinations: [] }; // Fail open on network issues
  }
}

// Format validation errors for LLM to fix
function formatErrorsForFix(hallucinations: Hallucination[]): string {
  if (hallucinations.length === 0) return '';

  return hallucinations
    .filter(h => h.severity === 'ERROR')
    .map(h => {
      const correction = h.correction ? ` → Use: ${h.correction}` : '';
      return `- ${h.path}: ${h.message}${correction}`;
    })
    .join('\n');
}

// Check if there are uncorrectable errors that need regeneration
function hasUncorrectableErrors(hallucinations: Hallucination[]): boolean {
  return hallucinations.some(h =>
    h.severity === 'ERROR' && !h.correction
  );
}

// Format uncorrectable errors for regeneration prompt
function formatErrorsForRegeneration(hallucinations: Hallucination[]): string {
  const uncorrectable = hallucinations.filter(h =>
    h.severity === 'ERROR' && !h.correction
  );
  if (uncorrectable.length === 0) return '';

  return uncorrectable
    .map(h => `- ${h.path}: ${h.message}`)
    .join('\n');
}

// Ask LLM to fix invalid YAML based on validation errors
async function fixYamlWithLLM(
  env: Env,
  invalidYaml: string,
  errors: string,
  userRequest: string
): Promise<string | null> {
  const fixPrompt = `The following YAML pipeline has validation errors. Fix ONLY the errors listed below.
Do not change anything else. Return ONLY the corrected YAML in a code block.

USER REQUEST: ${userRequest}

INVALID YAML:
\`\`\`yaml
${invalidYaml}
\`\`\`

ERRORS TO FIX:
${errors}

COMMON FIXES:
- "null:" input → use "generate:" instead
- "stdout: format:" → use just "stdout: {}" (no extra fields)
- "topic:" on kafka → use "topics:" (plural, array)
- "from_json()" → use ".parse_json()" method
- Unknown component → check spelling or use closest valid component

Return ONLY the fixed YAML in a code block, nothing else:`;

  try {
    const response = await (env.AI.run as Function)('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages: [
        { role: 'user', content: fixPrompt }
      ],
      max_tokens: 512,
    });

    const responseText = (response as { response: string }).response;
    const yamlMatch = responseText.match(/```(?:yaml|yml)?\n([\s\S]*?)```/);
    return yamlMatch ? yamlMatch[1].trim() : null;
  } catch (error) {
    console.error('LLM fix error:', error);
    return null;
  }
}

// Iteratively validate and fix YAML until valid or max retries
async function validateAndFixYaml(
  env: Env,
  yaml: string,
  userRequest: string,
  maxRetries: number = 2
): Promise<{ yaml: string; valid: boolean; attempts: number; hallucinations: Hallucination[] }> {
  let currentYaml = yaml;
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;

    // Validate current YAML
    const result = await validateWithExpanso(currentYaml, { autoCorrect: true });

    // If valid, we're done
    if (result.valid) {
      return { yaml: currentYaml, valid: true, attempts, hallucinations: [] };
    }

    // If we have a valid correction from the validator, use it
    if (result.corrected_yaml) {
      // Verify the correction is actually valid
      const correctionResult = await validateWithExpanso(result.corrected_yaml);
      if (correctionResult.valid) {
        return { yaml: result.corrected_yaml, valid: true, attempts, hallucinations: [] };
      }
      // Correction was bad, fall through to LLM fix
    }

    // No valid correction, ask LLM to fix
    const errorText = formatErrorsForFix(result.hallucinations);
    if (!errorText) {
      // No actionable errors, return as-is
      return { yaml: currentYaml, valid: false, attempts, hallucinations: result.hallucinations };
    }

    const fixedYaml = await fixYamlWithLLM(env, currentYaml, errorText, userRequest);
    if (!fixedYaml) {
      // LLM couldn't fix, return original
      return { yaml: currentYaml, valid: false, attempts, hallucinations: result.hallucinations };
    }

    // Use fixed version for next iteration
    currentYaml = fixedYaml;
  }

  // Max retries reached, do final validation
  const finalResult = await validateWithExpanso(currentYaml);
  return {
    yaml: currentYaml,
    valid: finalResult.valid,
    attempts,
    hallucinations: finalResult.hallucinations
  };
}

export interface Env {
  AI: Ai;
  VECTORIZE?: VectorizeIndex; // Optional - requires vectorize:create permission
  CONTENT_CACHE?: KVNamespace; // Optional - requires kv:create permission
  FEEDBACK_BUCKET?: R2Bucket; // R2 for storing bad YAML feedback
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

        case '/api/bad-yaml':
          return handleBadYamlApi(request, env, corsHeaders);

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

  // Store bad YAML in R2 for later analysis (when user reports invalid)
  if (!body.isValid && env.FEEDBACK_BUCKET) {
    const timestamp = new Date().toISOString();
    const key = `bad-yaml/${timestamp.replace(/[:.]/g, '-')}.json`;
    const record = {
      yaml: body.yaml,
      userMessage: body.userMessage || '',
      timestamp,
      validatorErrors: validationResult.errors.map(e => ({
        path: e.path,
        message: e.message,
        suggestion: e.suggestion,
      })),
      validatorAgreed: !validationResult.valid,
    };
    env.FEEDBACK_BUCKET.put(key, JSON.stringify(record)).catch(() => {});
  }

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

// HTTP API: Get bad YAML feedback as JSONL for batch processing
async function handleBadYamlApi(
  request: Request,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, headers, 405);
  }

  if (!env.FEEDBACK_BUCKET) {
    return jsonResponse({ error: 'R2 storage not available' }, headers, 503);
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '1000', 10);

  // List all bad-yaml files from R2
  const list = await env.FEEDBACK_BUCKET.list({ prefix: 'bad-yaml/' });
  const keys = list.objects.slice(-limit); // Most recent N

  // Collect records and return as JSONL
  const lines: string[] = [];
  for (const obj of keys) {
    const file = await env.FEEDBACK_BUCKET.get(obj.key);
    if (file) {
      const text = await file.text();
      lines.push(text); // Each file is already a JSON object
    }
  }

  // Return as JSONL (one JSON object per line)
  return new Response(lines.join('\n'), {
    headers: {
      ...headers,
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': 'attachment; filename="bad-yaml.jsonl"',
    },
  });
}

// HTTP API: Validate YAML with auto-correction
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

  // Run external Expanso validation with auto-correction and summarize for first_error
  const externalResult = await validateWithExpanso(body.yaml, { autoCorrect: true, summarize: true });

  // Check if we have a corrected version
  const hasCorrectedYaml = !externalResult.valid && !!externalResult.corrected_yaml;

  // Combine results - include rich hallucination data from external validator
  const allErrors: Array<{ path: string; message: string; suggestion?: string; category?: string; line?: number }> = [
    ...localResult.errors.map(e => ({
      path: e.path,
      message: e.message,
      suggestion: e.suggestion,
    })),
    ...externalResult.hallucinations
      .filter(h => h.severity === 'ERROR')
      .map(h => ({
        path: h.path,
        message: h.message,
        suggestion: h.correction || undefined,
        category: h.category,
        line: h.line || undefined,
      })),
  ];

  const isValid = localResult.valid && externalResult.valid;

  // Extract first_error for frontend highlighting
  const firstError = externalResult.summary?.first_error;

  return jsonResponse({
    valid: isValid || hasCorrectedYaml, // Consider corrected as "valid enough"
    errors: hasCorrectedYaml ? [] : allErrors, // Don't show errors if we have correction
    warnings: localResult.warnings,
    corrected_yaml: hasCorrectedYaml ? externalResult.corrected_yaml : undefined,
    hallucinations: hasCorrectedYaml ? [] : externalResult.hallucinations,
    first_error: hasCorrectedYaml ? undefined : firstError, // Include for UI line highlighting
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

${hasExamples ? `VALIDATED EXAMPLES ARE PROVIDED BELOW.
Use these examples as REFERENCE for correct syntax and patterns.
When generating pipelines, you may adapt examples OR create new ones.

` : ''}ALWAYS GENERATE PIPELINES:
- When a user asks for a pipeline, ALWAYS provide YAML - never refuse
- Use examples as reference for correct syntax patterns
- If unsure, make your best attempt - the system auto-validates and corrects YAML
- Be creative: combine patterns, modify examples, create new solutions

COMMUNICATION STYLE:
- Write in plain, simple English - avoid jargon
- Keep explanations SHORT (2-3 sentences max per point)
- Use bullet points, not paragraphs
- Be direct: "This reads from X and writes to Y"

GUIDELINES:
1. For documentation questions, use information from the context below
2. For pipeline requests, ALWAYS generate YAML - the system will validate and auto-correct it
3. Follow the YAML patterns shown in examples and the format guide below
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

COMMON COMPONENTS:
- Data generation: use "generate:" input (NOT "null:" or "random:")
  generate: { count: 10, interval: 1s, mapping: "root = {}" }
- Print to console: use "stdout: {}" (no extra fields needed)
  stdout: {} - NEVER use "stdout: format:" or "stdout: output:"

NEVER USE THESE PATTERNS:
- Multiple "---" separated documents (wrong) - ONE document only
- "components:" (wrong) - use "input:", "pipeline:", "output:"
- "pipeline: with:" (wrong) - use "pipeline: processors:"
- "from_json()" (wrong) - use .parse_json() method
- "if x then y else z" (wrong) - use if x { y } else { z }
- "input: null:" (wrong) - use "input: generate:"
- "stdout: format:" (wrong) - use just "stdout: {}"

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

  // Validate and auto-fix any YAML code blocks in the response
  const yamlBlocks = findYamlInResponse(responseText);
  const distinctId = getDistinctId(request);
  let finalYaml = yamlBlocks[0] || ''; // Track the final YAML for component links

  // Track validation state across loop (for last YAML block)
  let lastFixResult: Awaited<ReturnType<typeof validateAndFixYaml>> | null = null;
  let lastLocalResult: ReturnType<typeof validatePipelineYaml> | null = null;
  let lastIsValid = true;
  let lastWasCorrected = false;

  for (const yaml of yamlBlocks) {
    // Generate unique ID for this YAML
    const yamlId = `yaml_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // ITERATIVE VALIDATION: Try to fix YAML until valid (max 2 retries)
    const fixResult = await validateAndFixYaml(env, yaml, body.message, 2);

    // Run local validation on final result
    const localResult = validatePipelineYaml(fixResult.yaml);

    // Categorize local errors (for analytics only)
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

    // Check if YAML was modified during fix process
    const wasCorrected = fixResult.yaml !== yaml;

    // Replace YAML in response with fixed version
    if (wasCorrected) {
      responseText = replaceYamlInResponse(responseText, yaml, fixResult.yaml);
      finalYaml = fixResult.yaml;
    } else if (yaml === yamlBlocks[0]) {
      finalYaml = yaml;
    }

    // Combined validity
    const isValid = fixResult.valid && localResult.valid;

    // Store full YAML in KV (non-blocking) - include correction info
    if (env.CONTENT_CACHE) {
      env.CONTENT_CACHE.put(yamlId, JSON.stringify({
        yaml: fixResult.yaml,
        originalYaml: wasCorrected ? yaml : undefined,
        userMessage: body.message,
        timestamp: new Date().toISOString(),
        localValid: localResult.valid,
        externalValid: fixResult.valid,
        wasAutoCorrected: wasCorrected,
        fixAttempts: fixResult.attempts,
        structureErrors,
        bloblangErrors,
        componentErrors,
        hallucinations: fixResult.hallucinations,
      }), { expirationTtl: 60 * 60 * 24 * 90 }) // Keep for 90 days
        .catch(() => {});
    }

    // Track to PostHog with categorized errors (non-blocking) - track corrections
    const externalErrors = hallucinationsToErrors(fixResult.hallucinations);
    trackYamlGenerated(
      env.POSTHOG_API_KEY,
      distinctId,
      fixResult.yaml,
      body.message,
      {
        valid: isValid,
        errors: isValid ? [] : [...localResult.errors.map(e => `${e.path}: ${e.message}`), ...externalErrors],
        warnings: localResult.warnings,
        autoCorrected: wasCorrected,
        fixAttempts: fixResult.attempts,
      },
      yamlId
    ).catch(() => {});

    // Store validation state for response (last block wins)
    lastFixResult = fixResult;
    lastLocalResult = localResult;
    lastIsValid = isValid;
    lastWasCorrected = wasCorrected;
  }

  // REGENERATION: If there are uncorrectable errors, ask LLM to regenerate with error context
  if (!lastIsValid && lastFixResult && hasUncorrectableErrors(lastFixResult.hallucinations)) {
    const uncorrectableErrors = formatErrorsForRegeneration(lastFixResult.hallucinations);

    // Add error feedback as assistant + user messages for context
    messages.push({
      role: 'assistant',
      content: responseText
    });
    messages.push({
      role: 'user',
      content: `The YAML you generated has errors that cannot be auto-corrected:

${uncorrectableErrors}

Please regenerate the pipeline with these issues fixed. Use valid component names and structures.`
    });

    // Regenerate with error context
    const regenResponse = await (env.AI.run as Function)('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages,
      max_tokens: 768,
    });

    const regenText = (regenResponse as { response: string }).response;
    const regenYamlBlocks = findYamlInResponse(regenText);

    // If we got YAML, validate and use if better
    if (regenYamlBlocks.length > 0) {
      const regenYaml = regenYamlBlocks[0];
      const regenResult = await validateWithExpanso(regenYaml, { autoCorrect: true });
      const regenLocalResult = validatePipelineYaml(regenResult.corrected_yaml || regenYaml);

      const regenIsValid = regenResult.valid && regenLocalResult.valid;

      // Use regenerated response if it's valid or has fewer/no uncorrectable errors
      if (regenIsValid || !hasUncorrectableErrors(regenResult.hallucinations)) {
        responseText = regenText;
        finalYaml = regenResult.corrected_yaml || regenYaml;
        lastIsValid = regenIsValid;
        lastFixResult = {
          yaml: finalYaml,
          valid: regenResult.valid,
          attempts: 1,
          hallucinations: regenResult.hallucinations
        };
        lastLocalResult = regenLocalResult;
        lastWasCorrected = !!regenResult.corrected_yaml;

        // Replace YAML in response if it was corrected
        if (regenResult.corrected_yaml) {
          responseText = replaceYamlInResponse(responseText, regenYaml, regenResult.corrected_yaml);
        }
      }
    }
  }

  // Add validated component documentation links for any YAML in the response
  if (finalYaml) {
    // Strip any LLM-generated "Components used" section to avoid duplicates
    // The LLM sometimes generates its own list, but we want OUR validated one
    responseText = responseText.replace(
      /\n*\*?\*?Components used:?\*?\*?:?\n(?:[-•*]\s*(?:Input|Output|Processor|Cache|Rate Limit|Buffer|Metric):[^\n]+\n?)*/gi,
      ''
    ).trim();

    const componentsSection = generateComponentsSection(finalYaml);
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

  // Build response with validation info when we have YAML
  const chatResponse: {
    response: string;
    sources: Array<{ title: string; url: string }>;
    validation?: {
      valid: boolean;
      errors: Array<{ path: string; message: string; suggestion?: string; line?: number }>;
      was_corrected: boolean;
    };
  } = {
    response: responseText,
    sources,
  };

  // Include validation errors if YAML was generated but has unfixed issues
  if (finalYaml && !lastIsValid && lastLocalResult && lastFixResult) {
    const allErrors = [
      ...lastLocalResult.errors.map(e => ({
        path: e.path,
        message: e.message,
        suggestion: e.suggestion,
      })),
      ...lastFixResult.hallucinations.map(h => ({
        path: h.path,
        message: h.message,
        suggestion: h.correction || undefined,
        line: h.line,
      })),
    ];

    chatResponse.validation = {
      valid: false,
      errors: allErrors,
      was_corrected: lastWasCorrected,
    };
  }

  return jsonResponse(chatResponse, headers);
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

// Helper: Replace YAML blocks in response text
function replaceYamlInResponse(text: string, originalYaml: string, newYaml: string): string {
  // Find the code block containing the original YAML and replace it
  const escapedYaml = originalYaml.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('```(?:yaml|yml)?\\n' + escapedYaml + '\\n?```', 'g');
  return text.replace(pattern, '```yaml\n' + newYaml + '\n```');
}
