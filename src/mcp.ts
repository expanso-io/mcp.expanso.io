/**
 * MCP Protocol Handler
 *
 * Implements the Model Context Protocol for AI tool integration.
 * Supports JSON-RPC over HTTP and SSE for streaming.
 */

import type { Env } from './index';
import { handleSearch, handleListResources, handleReadResource } from './handlers';

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
];

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
