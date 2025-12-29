/**
 * MCP Protocol Handler
 *
 * Implements the Model Context Protocol for AI tool integration.
 * Supports JSON-RPC over HTTP and SSE for streaming.
 */

import type { Env } from './index';
import { handleSearch, handleListResources, handleReadResource } from './handlers';
import { validatePipelineYaml } from './pipeline-validator';
import {
  getComponentSchema,
  getSchemasByCategory,
  listComponentNames,
  formatComponentSchema,
  type ComponentCategory,
} from './component-schemas';
import {
  getByCategory,
  searchBloblang,
  formatBloblangReference,
  type BloblangCategory,
} from './bloblang-reference';
import { suggestWithFallback } from './pattern-suggester';
import { explainError } from './error-explainer';

// MCP Protocol types
interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Tool definitions
const TOOLS = [
  {
    name: 'search_docs',
    description:
      'Search Expanso documentation using semantic search. Returns relevant documentation sections for a given query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query - natural language question or keywords',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 5, max: 20)',
          default: 5,
        },
        domain: {
          type: 'string',
          description:
            'Filter by domain: expanso.io, docs.expanso.io, examples.expanso.io',
          enum: ['expanso.io', 'docs.expanso.io', 'examples.expanso.io'],
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_resource',
    description:
      'Retrieve the full content of a documentation resource by its URI. Use search_docs first to find relevant resources.',
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'The resource URI (e.g., https://docs.expanso.io/llms/getting-started.txt)',
        },
      },
      required: ['uri'],
    },
  },
  {
    name: 'list_resources',
    description:
      'List all available documentation resources across Expanso domains. Returns URIs and descriptions.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'validate_pipeline',
    description:
      'Validate an Expanso pipeline YAML configuration. Returns detailed errors with fix suggestions.',
    inputSchema: {
      type: 'object',
      properties: {
        yaml: {
          type: 'string',
          description: 'Pipeline YAML to validate',
        },
        include_external: {
          type: 'boolean',
          description:
            'Also validate against Expanso external validator (slower but authoritative)',
          default: true,
        },
      },
      required: ['yaml'],
    },
  },
  {
    name: 'get_component_schema',
    description:
      'Get the schema for an Expanso pipeline component including field definitions, types, defaults, and examples. Use this to understand what fields a component accepts.',
    inputSchema: {
      type: 'object',
      properties: {
        component: {
          type: 'string',
          description:
            'Component name (e.g., kafka, http_server, mapping, aws_s3)',
        },
        category: {
          type: 'string',
          description: 'Filter by category: input, processor, output',
          enum: ['input', 'processor', 'output'],
        },
        list_only: {
          type: 'boolean',
          description: 'If true, only list available component names without full schemas',
          default: false,
        },
      },
    },
  },
  {
    name: 'get_bloblang_reference',
    description:
      'Get Bloblang function and method reference for writing data transformations. Use this to find the correct syntax for Bloblang expressions.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Category to list functions/methods from',
          enum: [
            'functions',
            'string',
            'array',
            'object',
            'number',
            'timestamp',
            'encoding',
            'parsing',
            'type',
            'regex',
            'all',
          ],
        },
        search: {
          type: 'string',
          description: 'Search term to filter by name or description',
        },
      },
    },
  },
  {
    name: 'suggest_pipeline_pattern',
    description:
      'Get pipeline pattern suggestions based on a natural language use case description. Returns relevant examples with explanations and customization hints.',
    inputSchema: {
      type: 'object',
      properties: {
        use_case: {
          type: 'string',
          description:
            'Natural language description of what you want to build (e.g., "consume from kafka and write to s3", "filter events and send to slack")',
        },
        input_type: {
          type: 'string',
          description:
            'Optional: filter by source system (kafka, http, s3, database)',
        },
        output_type: {
          type: 'string',
          description:
            'Optional: filter by destination system (kafka, s3, elasticsearch, webhook)',
        },
        limit: {
          type: 'number',
          description: 'Maximum suggestions to return (default: 3)',
          default: 3,
        },
      },
      required: ['use_case'],
    },
  },
  {
    name: 'explain_error',
    description:
      'Get detailed explanation and fix suggestions for a pipeline validation or runtime error. Transforms cryptic error messages into actionable guidance with before/after code examples.',
    inputSchema: {
      type: 'object',
      properties: {
        error_message: {
          type: 'string',
          description: 'The error message to explain',
        },
        context: {
          type: 'string',
          description:
            'Optional: the YAML snippet or code that caused the error',
        },
        error_type: {
          type: 'string',
          enum: ['validation', 'runtime', 'connection', 'bloblang', 'unknown'],
          description: 'Type of error (auto-detected if not specified)',
        },
      },
      required: ['error_message'],
    },
  },
];

// ============================================================================
// Pipeline Validation Helpers
// ============================================================================

/**
 * Call the external Expanso validator API
 * Fails open on errors (returns valid) to avoid blocking on external service issues
 */
async function callExternalValidator(
  yaml: string
): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const response = await fetch('https://validate.expanso.io/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: yaml,
    });

    if (!response.ok) {
      // Fail open on server errors
      if (response.status >= 500) {
        console.error('External validator 5xx error:', response.status);
        return { valid: true, errors: [] };
      }
      const text = await response.text();
      return { valid: false, errors: [text] };
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      return { valid: true, errors: [] };
    }

    // Parse validation errors from response
    return { valid: false, errors: text.split('\n').filter(Boolean) };
  } catch (error) {
    // Fail open on network errors
    console.error('External validator error:', error);
    return { valid: true, errors: [] };
  }
}

/**
 * Validation result format for MCP tool response
 */
interface McpValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    suggestion?: string;
  }>;
  warnings: string[];
  external_validation?: {
    valid: boolean;
    errors: string[];
  };
}

/**
 * Orchestrate pipeline validation combining local and external validators
 */
async function validatePipelineForMcp(
  yaml: string,
  includeExternal: boolean
): Promise<McpValidationResult> {
  // Run local validation
  const localResult = validatePipelineYaml(yaml);

  // Optionally run external validation
  let externalResult: { valid: boolean; errors: string[] } | undefined;
  if (includeExternal) {
    externalResult = await callExternalValidator(yaml);
  }

  // Combine results
  return {
    valid: localResult.valid && (externalResult?.valid ?? true),
    errors: localResult.errors,
    warnings: localResult.warnings,
    external_validation: externalResult,
  };
}

// Handle MCP JSON-RPC request
export async function handleMcpRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = (await request.json()) as McpRequest;
  const response = await processRequest(body, env);

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Handle SSE connection for streaming MCP
export function handleSseConnection(request: Request, env: Env): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const initMessage = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false },
          },
          serverInfo: {
            name: 'expanso-mcp-server',
            version: '1.0.0',
          },
        },
      };

      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initMessage)}\n\n`));

      // Keep connection alive with periodic pings
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Handle incoming messages would require WebSocket upgrade
      // For now, SSE is read-only from server to client
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Process MCP request
async function processRequest(request: McpRequest, env: Env): Promise<McpResponse> {
  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
              resources: { listChanged: false },
            },
            serverInfo: {
              name: 'expanso-mcp-server',
              version: '1.0.0',
            },
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: { tools: TOOLS },
        };

      case 'tools/call':
        const toolParams = params as ToolCallParams | undefined;
        if (!toolParams?.name) {
          return errorResponse(id, -32602, 'Missing tool name');
        }
        return await handleToolCall(id, toolParams, env);

      case 'resources/list':
        const resources = await handleListResources(env);
        return {
          jsonrpc: '2.0',
          id,
          result: { resources },
        };

      case 'resources/read':
        const uri = (params as { uri: string })?.uri;
        if (!uri) {
          return errorResponse(id, -32602, 'Missing uri parameter');
        }
        const content = await handleReadResource(env, uri);
        if (!content) {
          return errorResponse(id, -32602, 'Resource not found');
        }
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: content.content,
              },
            ],
          },
        };

      case 'ping':
        return {
          jsonrpc: '2.0',
          id,
          result: {},
        };

      default:
        return errorResponse(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    console.error(`MCP error processing ${method}:`, error);
    return errorResponse(id, -32603, error instanceof Error ? error.message : 'Internal error');
  }
}

interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

// Handle tool calls
async function handleToolCall(
  id: string | number,
  params: ToolCallParams,
  env: Env
): Promise<McpResponse> {
  const { name, arguments: args } = params;

  switch (name) {
    case 'search_docs': {
      const query = args?.query as string;
      const limit = Math.min((args?.limit as number) || 5, 20);
      const domain = args?.domain as string | undefined;

      if (!query) {
        return errorResponse(id, -32602, 'Missing required argument: query');
      }

      const results = await handleSearch(env, query, limit, domain);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        },
      };
    }

    case 'get_resource': {
      const uri = args?.uri as string;
      if (!uri) {
        return errorResponse(id, -32602, 'Missing required argument: uri');
      }

      const content = await handleReadResource(env, uri);
      if (!content) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: 'Resource not found',
              },
            ],
            isError: true,
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: content.content,
            },
          ],
        },
      };
    }

    case 'list_resources': {
      const resources = await handleListResources(env);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resources, null, 2),
            },
          ],
        },
      };
    }

    case 'validate_pipeline': {
      const yaml = args?.yaml as string;
      const includeExternal = (args?.include_external as boolean) ?? true;

      if (!yaml) {
        return errorResponse(id, -32602, 'Missing required argument: yaml');
      }

      const result = await validatePipelineForMcp(yaml, includeExternal);

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    }

    case 'get_component_schema': {
      const componentName = args?.component as string | undefined;
      const category = args?.category as ComponentCategory | undefined;
      const listOnly = (args?.list_only as boolean) ?? false;

      // If list_only, just return component names
      if (listOnly) {
        const names = listComponentNames(category);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    components: names,
                    count: names.length,
                    category: category || 'all',
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      // If component specified, get its schema
      if (componentName) {
        const schema = getComponentSchema(componentName);
        if (!schema) {
          // Try to find similar components
          const allNames = listComponentNames();
          const similar = allNames.filter(
            (n) =>
              n.includes(componentName.toLowerCase()) ||
              componentName.toLowerCase().includes(n)
          );
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      error: `Unknown component: ${componentName}`,
                      similar_components: similar.slice(0, 5),
                      hint: 'Use list_only=true to see all available components',
                    },
                    null,
                    2
                  ),
                },
              ],
              isError: true,
            },
          };
        }
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: formatComponentSchema(schema),
              },
            ],
          },
        };
      }

      // If category specified, get all schemas for that category
      if (category) {
        const schemas = getSchemasByCategory(category);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: schemas.map((s) => formatComponentSchema(s)).join('\n\n---\n\n'),
              },
            ],
          },
        };
      }

      // No parameters - return usage info
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  usage:
                    'Provide component name for specific schema, or category to list schemas, or list_only=true for names',
                  available_categories: ['input', 'processor', 'output'],
                  example_components: ['kafka', 'http_server', 'mapping', 'aws_s3'],
                },
                null,
                2
              ),
            },
          ],
        },
      };
    }

    case 'get_bloblang_reference': {
      const category = args?.category as (BloblangCategory | 'functions' | 'all') | undefined;
      const search = args?.search as string | undefined;

      let items;

      // If search is provided, use search
      if (search) {
        items = searchBloblang(search);
      } else if (category) {
        items = getByCategory(category);
      } else {
        // Default to all
        items = getByCategory('all');
      }

      if (items.length === 0) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    results: [],
                    message: search
                      ? `No items found matching "${search}"`
                      : `No items found in category "${category}"`,
                    hint: 'Try searching for "json", "map", "time", or use category: "all"',
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: formatBloblangReference(items),
            },
          ],
        },
      };
    }

    case 'suggest_pipeline_pattern': {
      const use_case = args?.use_case as string;
      const input_type = args?.input_type as string | undefined;
      const output_type = args?.output_type as string | undefined;
      const limit = Math.min((args?.limit as number) || 3, 10);

      if (!use_case) {
        return errorResponse(id, -32602, 'Missing required argument: use_case');
      }

      const result = suggestWithFallback({
        use_case,
        input_type,
        output_type,
        limit,
      });

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    }

    case 'explain_error': {
      const error_message = args?.error_message as string;
      const context = args?.context as string | undefined;
      const error_type = args?.error_type as 'validation' | 'runtime' | 'connection' | 'bloblang' | 'unknown' | undefined;

      if (!error_message) {
        return errorResponse(id, -32602, 'Missing required argument: error_message');
      }

      const result = explainError({
        error_message,
        context,
        error_type,
      });

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    }

    default:
      return errorResponse(id, -32602, `Unknown tool: ${name}`);
  }
}

// Helper: Create error response
function errorResponse(id: string | number, code: number, message: string): McpResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message },
  };
}
