/**
 * Example Fallback
 *
 * Keyword-based example search behind the suggest_pipeline_pattern MCP
 * tool. It replaces the older pattern-suggester.ts, which had hardcoded
 * concept mappings, and never calls a language model.
 */

import { PIPELINE_EXAMPLES } from './examples-data';
import type { PipelineExample } from './examples-registry';

/**
 * Suggestion result
 */
export interface PatternSuggestion {
  pattern_name: string;
  description: string;
  relevance_score: number;
  why_suggested: string;
  yaml: string;
  customization_hints: string[];
}

/**
 * Options for suggesting patterns
 */
export interface SuggestOptions {
  use_case: string;
  input_type?: string;
  output_type?: string;
  limit?: number;
}

/**
 * Score an example against search keywords
 */
function scoreExample(
  example: PipelineExample,
  keywords: string[],
  inputType?: string,
  outputType?: string
) {
  let score = 0;
  const reasons: string[] = [];

  const searchableText = [
    example.name,
    example.description,
    ...example.keywords,
    example.yaml,
  ].join(' ').toLowerCase();

  // Score keyword matches
  for (const keyword of keywords) {
    if (searchableText.includes(keyword)) {
      score += 1;
      reasons.push(`matches "${keyword}"`);
    }
  }

  // Bonus for input/output type matches
  if (inputType) {
    const inputLower = inputType.toLowerCase();

    if (example.components.inputs.some((i: string) => i.toLowerCase().includes(inputLower))) {
      score += 2;
      reasons.push(`input type: ${inputType}`);
    }
  }

  if (outputType) {
    const outputLower = outputType.toLowerCase();

    if (example.components.outputs.some((o: string) => o.toLowerCase().includes(outputLower))) {
      score += 2;
      reasons.push(`output type: ${outputType}`);
    }
  }

  return { score, reasons };
}

/**
 * Extract keywords from a use case description
 */
function extractKeywords(useCase: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'want',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
    'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than', 'too',
    'very', 'just', 'also', 'now', 'here', 'there', 'i', 'me', 'my',
    'we', 'our', 'you', 'your', 'it', 'its', 'this', 'that', 'these',
    'those', 'which', 'who', 'whom', 'what', 'create', 'make', 'get',
    'use', 'using', 'pipeline', 'data', 'show', 'give',
  ]);

  return useCase
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Generate customization hints for an example
 */
function generateHints(example: PipelineExample): string[] {
  const hints: string[] = [];

  // Add hints based on components used
  for (const input of example.components.inputs) {
    if (input.includes('kafka')) {
      hints.push('Update Kafka broker addresses and topic names');
    } else if (input.includes('http')) {
      hints.push('Configure the HTTP endpoint path and port');
    } else if (input.includes('s3') || input.includes('gcp') || input.includes('azure')) {
      hints.push('Set your cloud credentials and bucket/container names');
    } else if (input.includes('sql') || input.includes('postgres') || input.includes('mysql')) {
      hints.push('Configure database connection string and query');
    }
  }

  for (const output of example.components.outputs) {
    if (output.includes('elasticsearch')) {
      hints.push('Update Elasticsearch URLs and index name');
    } else if (output.includes('kafka')) {
      hints.push('Configure Kafka broker addresses and target topic');
    }
  }

  // Default hint if none generated
  if (hints.length === 0) {
    hints.push('Adjust configuration values for your environment');
  }

  return [...new Set(hints)].slice(0, 3);
}

/**
 * Suggest pipeline patterns based on use case description.
 *
 * This is a simple keyword-based search over the curated examples.
 */
export function suggestPipelinePatterns(options: SuggestOptions): PatternSuggestion[] {
  const { use_case, input_type, output_type, limit = 3 } = options;

  const keywords = extractKeywords(use_case);

  // Score all examples
  const scored = PIPELINE_EXAMPLES.map(example => ({
    example,
    ...scoreExample(example, keywords, input_type, output_type),
  }));

  // Filter and sort
  const results = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results.map(s => ({
    pattern_name: s.example.name,
    description: s.example.description,
    relevance_score: Math.round(s.score * 10) / 10,
    why_suggested: s.reasons.slice(0, 3).join('; '),
    yaml: s.example.yaml,
    customization_hints: generateHints(s.example),
  }));
}

/**
 * Suggestions plus a message when nothing matched
 */
export interface SuggestionResult {
  suggestions: PatternSuggestion[];
  message?: string;
}

/**
 * Get suggestion with helpful message when no matches found
 */
export function suggestWithFallback(options: SuggestOptions): SuggestionResult {
  const suggestions = suggestPipelinePatterns(options);

  if (suggestions.length === 0) {
    const keywords = extractKeywords(options.use_case);
    let message = 'No matching examples found.';

    if (keywords.length > 0) {
      message += ` Keywords searched: ${keywords.slice(0, 5).join(', ')}.`;
    }

    message += ' Try using input_type/output_type filters, or search the docs with search_docs.';

    return { suggestions: [], message };
  }

  return { suggestions };
}
