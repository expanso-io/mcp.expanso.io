/**
 * Expanso MCP Server
 *
 * Provides semantic search and retrieval over Expanso documentation.
 * Supports both HTTP API and MCP protocol over SSE.
 */

import { handleMcpRequest, handleSseConnection, TOOLS } from './mcp';
import { handleSearch, handleListResources, handleReadResource } from './handlers';
import { getHomeHtml } from './home-page';
import { trackSearch, trackPageView, getDistinctId } from './analytics';
import { validatePipelineYaml } from './pipeline-validator';
import type { components } from './types/validate-api';

// Typed external validation using validate.expanso.io API contract
type ValidateResponse = components['schemas']['ValidateResponse'];

type Hallucination = components['schemas']['Hallucination'];

type ValidationSummary = components['schemas']['ValidationSummary'];

interface ExternalValidationResult {
  valid: boolean;
  error_count: number;
  hallucinations: Hallucination[];
  formatted_yaml?: string;
  corrected_yaml?: string;
  summary?: ValidationSummary;
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
        // Root page: how to connect a client, the tool list, a docs search box
        case '/':
          // Track page view (non-blocking)
          ctx.waitUntil(
            trackPageView(env.POSTHOG_API_KEY, getDistinctId(request), url.pathname)
          );

          return new Response(getHomeHtml(url.origin, TOOLS), {
            headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
          });

        // The chat page used to live here; send old links to the root page
        case '/chat':
          return Response.redirect(`${url.origin}/`, 301);

        // Health check
        case '/health':
          return jsonResponse({ status: 'ok', service: 'expanso-mcp-server' }, corsHeaders);

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

// Helper: JSON response. Generic so callers keep their own body type.
function jsonResponse<Body extends object>(
  data: Body,
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
