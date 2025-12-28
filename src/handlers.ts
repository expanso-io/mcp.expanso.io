/**
 * Request Handlers
 *
 * Implements semantic search using Vectorize and content retrieval.
 */

import type { Env } from './index';

// Resource definition
interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

// Search result
interface SearchResult {
  uri: string;
  title: string;
  snippet: string;
  score: number;
  domain: string;
}

// Content response
interface ContentResponse {
  uri: string;
  content: string;
  title: string;
  domain: string;
}

// All available llms.txt resources
const RESOURCES: Resource[] = [
  // expanso.io
  {
    uri: 'https://expanso.io/llms.txt',
    name: 'Expanso Overview',
    description: 'Master index for Expanso - upstream data governance platform',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://expanso.io/llms/product.txt',
    name: 'Product Overview',
    description: 'Expanso product capabilities and architecture',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://expanso.io/llms/industries.txt',
    name: 'Industries',
    description: 'Industry-specific solutions for healthcare, retail, manufacturing',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://expanso.io/llms/use-cases.txt',
    name: 'Use Cases',
    description: 'Common use cases for edge data processing',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://expanso.io/llms/comparisons.txt',
    name: 'Comparisons',
    description: 'How Expanso compares to alternatives',
    mimeType: 'text/plain',
  },

  // docs.expanso.io
  {
    uri: 'https://docs.expanso.io/llms.txt',
    name: 'Expanso Docs Index',
    description: 'Documentation index for Expanso platform',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://docs.expanso.io/llms/getting-started.txt',
    name: 'Getting Started',
    description: 'Installation and first steps with Expanso',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://docs.expanso.io/llms/cli.txt',
    name: 'CLI Reference',
    description: 'Expanso CLI commands and usage',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://docs.expanso.io/llms/components.txt',
    name: 'Pipeline Components',
    description: 'Inputs, processors, and outputs for data pipelines',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://docs.expanso.io/llms/operations.txt',
    name: 'Operations',
    description: 'Deployment, monitoring, and scaling',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://docs.expanso.io/llms/guides.txt',
    name: 'How-To Guides',
    description: 'Practical integration and configuration guides',
    mimeType: 'text/plain',
  },

  // examples.expanso.io
  {
    uri: 'https://examples.expanso.io/llms.txt',
    name: 'Examples Index',
    description: 'Production-ready pipeline examples',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://examples.expanso.io/llms/data-routing.txt',
    name: 'Data Routing',
    description: 'Circuit breakers, fan-out, priority queues',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://examples.expanso.io/llms/data-security.txt',
    name: 'Data Security',
    description: 'PII removal, encryption, schema validation',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://examples.expanso.io/llms/data-transformation.txt',
    name: 'Data Transformation',
    description: 'Time windows, deduplication, format conversion',
    mimeType: 'text/plain',
  },
  {
    uri: 'https://examples.expanso.io/llms/log-processing.txt',
    name: 'Log Processing',
    description: 'Filtering, enrichment, production pipelines',
    mimeType: 'text/plain',
  },
];

/**
 * Semantic search over documentation
 */
export async function handleSearch(
  env: Env,
  query: string,
  limit: number = 5,
  domain?: string
): Promise<{ results: SearchResult[]; query: string }> {
  // If Vectorize is not configured, use keyword search
  if (!env.VECTORIZE) {
    return {
      results: await fallbackKeywordSearch(env, query, limit, domain),
      query,
    };
  }

  try {
    // Generate embedding for query
    const embedding = await generateEmbedding(env, query);

    // Search Vectorize
    const vectorResults = await env.VECTORIZE.query(embedding, {
      topK: limit * 2, // Get more results to filter
      returnMetadata: 'all',
    });

    // Filter by domain if specified and format results
    let results: SearchResult[] = vectorResults.matches
      .filter((match) => {
        if (!domain) return true;
        const matchDomain = (match.metadata?.domain as string) || '';
        return matchDomain.includes(domain);
      })
      .slice(0, limit)
      .map((match) => ({
        uri: (match.metadata?.uri as string) || '',
        title: (match.metadata?.title as string) || 'Untitled',
        snippet: (match.metadata?.snippet as string) || '',
        score: match.score,
        domain: (match.metadata?.domain as string) || '',
      }));

    // If no vector results (index not populated), fall back to keyword search
    if (results.length === 0) {
      results = await fallbackKeywordSearch(env, query, limit, domain);
    }

    return { results, query };
  } catch (error) {
    console.error('Search error:', error);
    // Fall back to keyword search on any error
    return {
      results: await fallbackKeywordSearch(env, query, limit, domain),
      query,
    };
  }
}

/**
 * Fallback keyword search when vector search is unavailable
 */
async function fallbackKeywordSearch(
  env: Env,
  query: string,
  limit: number,
  domain?: string
): Promise<SearchResult[]> {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/);

  // Filter resources by domain
  const filteredResources = domain
    ? RESOURCES.filter((r) => r.uri.includes(domain))
    : RESOURCES;

  // Score resources by keyword match
  const scored = filteredResources.map((resource) => {
    const text = `${resource.name} ${resource.description}`.toLowerCase();
    let score = 0;

    for (const term of queryTerms) {
      if (text.includes(term)) {
        score += 1;
        // Boost for exact name match
        if (resource.name.toLowerCase().includes(term)) {
          score += 0.5;
        }
      }
    }

    return {
      uri: resource.uri,
      title: resource.name,
      snippet: resource.description,
      score,
      domain: new URL(resource.uri).hostname,
    };
  });

  // Sort by score and return top results
  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * List all available resources
 */
export async function handleListResources(env: Env): Promise<Resource[]> {
  return RESOURCES;
}

/**
 * Read resource content
 */
export async function handleReadResource(
  env: Env,
  uri: string
): Promise<ContentResponse | null> {
  // Validate URI is in our allowed list
  const resource = RESOURCES.find((r) => r.uri === uri);
  if (!resource) {
    return null;
  }

  // Check cache first (if KV is available)
  const cacheKey = `content:${uri}`;
  if (env.CONTENT_CACHE) {
    try {
      const cached = await env.CONTENT_CACHE.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // KV not available, continue without cache
    }
  }

  // Fetch content
  try {
    const response = await fetch(uri, {
      headers: {
        'User-Agent': 'ExpansoMCPServer/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${uri}: ${response.status}`);
      return null;
    }

    const content = await response.text();
    const result: ContentResponse = {
      uri,
      content,
      title: resource.name,
      domain: new URL(uri).hostname,
    };

    // Cache for 1 hour (if KV is available)
    if (env.CONTENT_CACHE) {
      try {
        await env.CONTENT_CACHE.put(cacheKey, JSON.stringify(result), {
          expirationTtl: 3600,
        });
      } catch {
        // KV not available, continue without caching
      }
    }

    return result;
  } catch (error) {
    console.error(`Error fetching ${uri}:`, error);
    return null;
  }
}

/**
 * Generate embedding using Workers AI
 */
async function generateEmbedding(env: Env, text: string): Promise<number[]> {
  const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [text],
  });

  // AI.run returns { data: [[...embedding]] }
  if (result && 'data' in result && Array.isArray(result.data) && result.data.length > 0) {
    return result.data[0] as number[];
  }

  throw new Error('Failed to generate embedding');
}
