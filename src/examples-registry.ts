/**
 * Examples Registry
 *
 * Curated, validated YAML examples for common pipeline patterns.
 * Examples are stored as individual YAML files in examples/ directory
 * and compiled to examples-data.ts at build time.
 */

// Re-export examples from generated data file
export { PIPELINE_EXAMPLES } from './examples-data';

export interface PipelineExample {
  id: string;
  name: string;
  description: string;
  keywords: string[]; // For search matching
  components: {
    inputs: string[];
    processors: string[];
    outputs: string[];
  };
  yaml: string;
  bloblangPatterns?: string[]; // Specific Bloblang techniques demonstrated
}

// Import for use in functions
import { PIPELINE_EXAMPLES } from './examples-data';

/**
 * Search examples by query - returns best matching examples
 */
export function searchExamples(query: string, limit: number = 3): PipelineExample[] {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

  // Score each example
  const scored = PIPELINE_EXAMPLES.map(example => {
    let score = 0;

    // Keyword match (highest weight)
    for (const keyword of example.keywords) {
      if (queryLower.includes(keyword)) {
        score += 3;
      }
      for (const term of queryTerms) {
        if (keyword.includes(term) || term.includes(keyword)) {
          score += 2;
        }
      }
    }

    // Component name match
    const allComponents = [
      ...example.components.inputs,
      ...example.components.processors,
      ...example.components.outputs,
    ];
    for (const comp of allComponents) {
      if (queryLower.includes(comp)) {
        score += 5; // Strong signal when component is mentioned
      }
    }

    // Name/description match
    const text = `${example.name} ${example.description}`.toLowerCase();
    for (const term of queryTerms) {
      if (text.includes(term)) {
        score += 1;
      }
    }

    return { example, score };
  });

  // Sort by score and return top matches
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.example);
}

/**
 * Get example by ID
 */
export function getExampleById(id: string): PipelineExample | undefined {
  return PIPELINE_EXAMPLES.find(e => e.id === id);
}

/**
 * Get examples by component
 */
export function getExamplesByComponent(componentName: string): PipelineExample[] {
  return PIPELINE_EXAMPLES.filter(example => {
    const allComponents = [
      ...example.components.inputs,
      ...example.components.processors,
      ...example.components.outputs,
    ];
    return allComponents.includes(componentName);
  });
}

/**
 * Format examples for LLM context
 */
export function formatExamplesForContext(examples: PipelineExample[]): string {
  if (examples.length === 0) {
    return '';
  }

  const sections = examples.map(ex => `
### Example: ${ex.name}
${ex.description}

**Components:** ${[...ex.components.inputs, ...ex.components.processors, ...ex.components.outputs].join(', ')}

\`\`\`yaml
${ex.yaml}
\`\`\`
${ex.bloblangPatterns && ex.bloblangPatterns.length > 0 ? `\n**Bloblang patterns demonstrated:** ${ex.bloblangPatterns.join(', ')}` : ''}
`);

  return `## Validated Pipeline Examples

The following examples show correct syntax. Use these as REFERENCE when generating pipelines.

${sections.join('\n---\n')}`;
}

/**
 * Welcome example format for API response
 */
export interface WelcomeExample {
  id: string;
  name: string;
  prompt: string;
}

/**
 * Get random examples for welcome screen
 */
export function getRandomExamples(count: number = 6): PipelineExample[] {
  const shuffled = [...PIPELINE_EXAMPLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, PIPELINE_EXAMPLES.length));
}

/**
 * Format examples for welcome screen API
 */
export function formatWelcomeExamples(examples: PipelineExample[]): WelcomeExample[] {
  return examples.map(ex => ({
    id: ex.id,
    name: ex.name,
    prompt: `Show me a ${ex.name.toLowerCase()} pipeline`,
  }));
}

/**
 * Environment bindings required for semantic search
 */
export interface SemanticSearchEnv {
  AI: {
    run(model: string, input: { text: string[] }): Promise<{ data: number[][] }>;
  };
  VECTORIZE?: {
    query(
      vector: number[],
      options: { topK: number; returnMetadata?: 'all' | 'indexed' | 'none'; filter?: Record<string, string> }
    ): Promise<{ matches: Array<{ id: string; score: number; metadata?: Record<string, unknown> }> }>;
  };
}

/**
 * Semantic search for examples using Vectorize embeddings.
 * Falls back to keyword search if Vectorize is unavailable or returns no matches.
 *
 * @param query - Natural language search query
 * @param env - Environment with AI and optional VECTORIZE bindings
 * @param limit - Maximum number of results (default 3)
 * @returns Promise<PipelineExample[]> - Matching examples sorted by relevance
 */
export async function semanticSearchExamples(
  query: string,
  env: SemanticSearchEnv,
  limit: number = 3
): Promise<PipelineExample[]> {
  // If Vectorize is not available, fall back to keyword search
  if (!env.VECTORIZE) {
    return searchExamples(query, limit);
  }

  try {
    // Generate embedding for the query
    const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [query],
    });

    if (!embeddingResult?.data?.[0]) {
      // Embedding generation failed, fall back to keyword search
      return searchExamples(query, limit);
    }

    const embedding = embeddingResult.data[0];

    // Query Vectorize with filter for examples only
    const vectorResults = await env.VECTORIZE.query(embedding, {
      topK: limit * 2, // Get more results to filter
      returnMetadata: 'all',
      filter: { type: 'example' },
    });

    if (vectorResults.matches.length === 0) {
      // No semantic matches found, fall back to keyword search
      return searchExamples(query, limit);
    }

    // Convert matches to PipelineExamples
    const examples: PipelineExample[] = [];
    for (const match of vectorResults.matches) {
      const example = getExampleById(match.id);
      if (example) {
        examples.push(example);
      }
    }

    // If no valid examples from Vectorize, fall back to keyword search
    if (examples.length === 0) {
      return searchExamples(query, limit);
    }

    return examples.slice(0, limit);
  } catch (error) {
    // On any error, fall back to keyword search
    console.error('Semantic search failed, falling back to keyword search:', error);
    return searchExamples(query, limit);
  }
}

/**
 * Get searchable text for an example (used for indexing)
 */
export function getExampleSearchText(example: PipelineExample): string {
  const components = [
    ...example.components.inputs,
    ...example.components.processors,
    ...example.components.outputs,
  ].join(' ');

  const bloblang = example.bloblangPatterns?.join(' ') || '';

  return `${example.name} ${example.description} ${example.keywords.join(' ')} ${components} ${bloblang}`;
}
