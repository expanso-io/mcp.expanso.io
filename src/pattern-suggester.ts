/**
 * Pattern Suggester
 *
 * Suggests pipeline patterns based on natural language use case descriptions.
 * Uses intent extraction and component mapping to find relevant examples.
 */

import { PIPELINE_EXAMPLES, type PipelineExample } from './examples-registry';

// ============================================================================
// Types
// ============================================================================

export interface PatternSuggestion {
  pattern_name: string;
  description: string;
  relevance_score: number; // 0-1
  why_suggested: string;
  yaml: string;
  customization_hints: string[];
}

export interface SuggestOptions {
  use_case: string;
  input_type?: string;
  output_type?: string;
  limit?: number;
}

// ============================================================================
// Concept Mappings
// ============================================================================

/**
 * Maps natural language concepts to component names.
 * Key = concept word/phrase, Value = array of component names
 */
const CONCEPT_TO_COMPONENTS: Record<string, string[]> = {
  // Data sources
  kafka: ['kafka', 'kafka_franz'],
  queue: ['kafka', 'nats', 'amqp_0_9', 'amqp_1', 'aws_sqs', 'gcp_pubsub', 'redis_streams'],
  message: ['kafka', 'nats', 'amqp_0_9', 'amqp_1', 'redis_pubsub'],
  webhook: ['http_server'],
  http: ['http_server', 'http_client', 'http'],
  api: ['http_server', 'http_client', 'http'],
  rest: ['http_server', 'http_client'],
  file: ['file', 'aws_s3', 'gcp_cloud_storage', 'azure_blob_storage'],
  s3: ['aws_s3'],
  storage: ['aws_s3', 'gcp_cloud_storage', 'azure_blob_storage', 'file'],
  database: ['sql_select', 'sql_insert', 'sql_raw', 'mongodb', 'redis'],
  sql: ['sql_select', 'sql_insert', 'sql_raw'],
  postgres: ['sql_select', 'sql_insert', 'sql_raw', 'postgres_cdc'],
  mysql: ['sql_select', 'sql_insert', 'sql_raw', 'mysql_cdc'],
  mongodb: ['mongodb'],
  redis: ['redis', 'redis_streams', 'redis_pubsub'],
  elasticsearch: ['elasticsearch', 'elasticsearch_v8'],
  elastic: ['elasticsearch', 'elasticsearch_v8'],

  // Destinations
  slack: ['http_client'],
  email: ['http_client'],
  notification: ['http_client'],
  alert: ['http_client'],

  // Transformations
  parse: ['mapping', 'jq', 'awk'],
  json: ['mapping'],
  transform: ['mapping', 'jq'],
  filter: ['mapping', 'bloblang'],
  enrich: ['http', 'branch', 'cache'],
  validate: ['mapping', 'schema_registry'],
  aggregate: ['group_by', 'cache'],
  batch: ['batching', 'group_by'],
  dedupe: ['cache', 'redis'],
  dedup: ['cache', 'redis'],
  deduplicate: ['cache', 'redis'],

  // Patterns
  retry: ['retry'],
  backoff: ['retry'], // backoff implies retry pattern
  error: ['catch', 'try', 'retry'],
  fallback: ['try', 'catch', 'fallback'],
  resilience: ['retry', 'try', 'catch'],
  recover: ['retry', 'try', 'catch'],
  parallel: ['workflow', 'branch', 'parallel'],
  workflow: ['workflow', 'branch'],
  split: ['unarchive', 'split'],
  merge: ['archive', 'workflow'],
  route: ['switch', 'broker'],
  routing: ['switch', 'broker'],

  // CDC
  cdc: ['postgres_cdc', 'mysql_cdc', 'mongodb_cdc', 'sql_select'],
  'change data capture': ['postgres_cdc', 'mysql_cdc', 'mongodb_cdc'],
  changes: ['postgres_cdc', 'mysql_cdc', 'mongodb_cdc'],
  change: ['postgres_cdc', 'mysql_cdc', 'mongodb_cdc'],
  capture: ['postgres_cdc', 'mysql_cdc', 'mongodb_cdc'],
  replication: ['postgres_cdc', 'mysql_cdc', 'sql_select', 'sql_insert'],
  sync: ['sql_select', 'sql_insert', 'cache'],

  // AI/ML
  ai: ['http_client', 'aws_bedrock', 'ollama'],
  ml: ['http_client', 'aws_bedrock'],
  llm: ['http_client', 'aws_bedrock', 'ollama', 'openai'],
  embedding: ['http_client', 'aws_bedrock', 'ollama'],
  classify: ['http_client', 'aws_bedrock'],
  classification: ['http_client', 'aws_bedrock'],
  moderate: ['http_client', 'aws_bedrock'],
  moderation: ['http_client', 'aws_bedrock'],
  rag: ['http_client', 'cache'],
};

/**
 * Intent categories with associated keywords
 */
const INTENT_CATEGORIES: Record<string, string[]> = {
  data_movement: ['etl', 'sync', 'replicate', 'migrate', 'copy', 'move', 'transfer', 'stream'],
  transformation: ['parse', 'convert', 'enrich', 'aggregate', 'transform', 'map', 'modify'],
  filtering: ['filter', 'route', 'split', 'validate', 'reject', 'conditional', 'match'],
  integration: ['webhook', 'api', 'notification', 'alert', 'call', 'send', 'receive'],
  analytics: ['stream', 'window', 'aggregate', 'count', 'metric', 'stats'],
  ai_ml: ['embed', 'classify', 'extract', 'generate', 'moderate', 'ai', 'ml', 'llm', 'rag'],
  resilience: ['retry', 'fallback', 'error', 'handle', 'recover', 'backoff'],
  parallelism: ['parallel', 'concurrent', 'fan-out', 'fan-in', 'workflow', 'dag'],
};

// ============================================================================
// Intent Extraction
// ============================================================================

interface ExtractedIntent {
  source_concepts: string[];
  destination_concepts: string[];
  transformation_concepts: string[];
  matched_categories: string[];
}

/**
 * Extract intent from natural language use case description
 */
function extractIntent(useCase: string): ExtractedIntent {
  const normalized = useCase.toLowerCase();
  const words = normalized.split(/\s+/);

  const source_concepts: string[] = [];
  const destination_concepts: string[] = [];
  const transformation_concepts: string[] = [];
  const matched_categories: string[] = [];

  // Source patterns: "from X", "consume X", "read X", "receive X"
  const sourcePatterns = [
    /from\s+(\w+)/g,
    /consume\s+(\w+)/g,
    /read\s+(\w+)/g,
    /receive\s+(\w+)/g,
    /ingest\s+(\w+)/g,
    /pull\s+(\w+)/g,
  ];

  for (const pattern of sourcePatterns) {
    let match;
    while ((match = pattern.exec(normalized)) !== null) {
      const concept = match[1];
      if (CONCEPT_TO_COMPONENTS[concept]) {
        source_concepts.push(concept);
      }
    }
  }

  // Destination patterns: "to X", "write X", "send X", "forward X"
  const destPatterns = [
    /to\s+(\w+)/g,
    /write\s+(\w+)/g,
    /send\s+(\w+)/g,
    /forward\s+(\w+)/g,
    /push\s+(\w+)/g,
    /store\s+(\w+)/g,
    /into\s+(\w+)/g,
  ];

  for (const pattern of destPatterns) {
    let match;
    while ((match = pattern.exec(normalized)) !== null) {
      const concept = match[1];
      if (CONCEPT_TO_COMPONENTS[concept]) {
        destination_concepts.push(concept);
      }
    }
  }

  // Extract standalone concepts that might indicate source/destination
  for (const word of words) {
    if (CONCEPT_TO_COMPONENTS[word]) {
      // If not already categorized, add to appropriate list based on position
      if (!source_concepts.includes(word) && !destination_concepts.includes(word)) {
        // Check context to determine if source or destination
        const idx = normalized.indexOf(word);
        const before = normalized.slice(Math.max(0, idx - 20), idx);
        const after = normalized.slice(idx, idx + 20);

        if (before.includes('from') || before.includes('consume') || before.includes('read')) {
          source_concepts.push(word);
        } else if (after.includes('to') || before.includes('write') || before.includes('send')) {
          destination_concepts.push(word);
        }
      }
    }
  }

  // Extract transformation concepts
  const transformWords = ['parse', 'filter', 'enrich', 'validate', 'transform', 'convert',
    'aggregate', 'batch', 'dedupe', 'retry', 'split', 'merge', 'route', 'capture', 'changes', 'change',
    'backoff', 'error', 'fallback', 'recover', 'resilience', 'cdc', 'replication'];
  for (const word of words) {
    if (transformWords.includes(word)) {
      transformation_concepts.push(word);
    }
  }

  // Special handling for "database changes" pattern → CDC
  if (normalized.includes('database') && (normalized.includes('change') || normalized.includes('capture'))) {
    transformation_concepts.push('cdc');
  }

  // Match intent categories
  for (const [category, keywords] of Object.entries(INTENT_CATEGORIES)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        if (!matched_categories.includes(category)) {
          matched_categories.push(category);
        }
        break;
      }
    }
  }

  return {
    source_concepts: [...new Set(source_concepts)],
    destination_concepts: [...new Set(destination_concepts)],
    transformation_concepts: [...new Set(transformation_concepts)],
    matched_categories,
  };
}

// ============================================================================
// Scoring
// ============================================================================

interface ScoredExample {
  example: PipelineExample;
  score: number;
  matchReasons: string[];
}

/**
 * Score an example against extracted intent
 */
function scoreExample(
  example: PipelineExample,
  intent: ExtractedIntent,
  inputFilter?: string,
  outputFilter?: string
): ScoredExample {
  let score = 0;
  const matchReasons: string[] = [];

  // Apply input filter (must match if specified)
  if (inputFilter) {
    const normalizedFilter = inputFilter.toLowerCase();
    const hasMatchingInput = example.components.inputs.some(
      (i) => i.toLowerCase().includes(normalizedFilter) ||
             normalizedFilter.includes(i.toLowerCase())
    );
    if (!hasMatchingInput) {
      return { example, score: 0, matchReasons: [] };
    }
    score += 0.15;
    matchReasons.push(`Uses ${inputFilter} input`);
  }

  // Apply output filter (must match if specified)
  if (outputFilter) {
    const normalizedFilter = outputFilter.toLowerCase();
    const hasMatchingOutput = example.components.outputs.some(
      (o) => o.toLowerCase().includes(normalizedFilter) ||
             normalizedFilter.includes(o.toLowerCase())
    );
    if (!hasMatchingOutput) {
      return { example, score: 0, matchReasons: [] };
    }
    score += 0.15;
    matchReasons.push(`Writes to ${outputFilter}`);
  }

  // Score based on source concept matches
  for (const concept of intent.source_concepts) {
    const mappedComponents = CONCEPT_TO_COMPONENTS[concept] || [];
    for (const comp of mappedComponents) {
      if (example.components.inputs.includes(comp)) {
        score += 0.2;
        matchReasons.push(`Matches source "${concept}" (${comp})`);
        break;
      }
    }
  }

  // Score based on destination concept matches
  for (const concept of intent.destination_concepts) {
    const mappedComponents = CONCEPT_TO_COMPONENTS[concept] || [];
    for (const comp of mappedComponents) {
      if (example.components.outputs.includes(comp)) {
        score += 0.2;
        matchReasons.push(`Matches destination "${concept}" (${comp})`);
        break;
      }
    }
  }

  // Score based on transformation concept matches
  for (const concept of intent.transformation_concepts) {
    const mappedComponents = CONCEPT_TO_COMPONENTS[concept] || [];
    for (const comp of mappedComponents) {
      if (example.components.processors.includes(comp)) {
        score += 0.15;
        matchReasons.push(`Demonstrates ${concept} pattern`);
        break;
      }
    }
  }

  // Score based on keyword matches
  const exampleKeywords = example.keywords.map((k) => k.toLowerCase());
  const descWords = example.description.toLowerCase().split(/\s+/);
  const allExampleTerms = [...exampleKeywords, ...descWords];

  // Direct keyword match: boost examples whose keywords directly match query concepts
  const allConcepts = [
    ...intent.source_concepts,
    ...intent.destination_concepts,
    ...intent.transformation_concepts,
  ];
  for (const concept of allConcepts) {
    if (exampleKeywords.includes(concept)) {
      score += 0.25; // Strong boost for direct keyword match
      matchReasons.push(`Direct match on "${concept}"`);
    }
  }

  for (const category of intent.matched_categories) {
    const categoryKeywords = INTENT_CATEGORIES[category];
    const categoryMatches = categoryKeywords.filter((k) =>
      allExampleTerms.some((t) => t.includes(k) || k.includes(t))
    );
    if (categoryMatches.length > 0) {
      score += 0.1 * Math.min(categoryMatches.length, 3);
      matchReasons.push(`Matches ${category.replace('_', ' ')} intent`);
    }
  }

  // Bonus for name/description relevance
  const nameWords = example.name.toLowerCase().split(/\s+/);
  const queryWords = [
    ...intent.source_concepts,
    ...intent.destination_concepts,
    ...intent.transformation_concepts,
  ];
  const nameOverlap = queryWords.filter((q) => nameWords.some((n) => n.includes(q) || q.includes(n)));
  if (nameOverlap.length > 0) {
    score += 0.05 * nameOverlap.length;
  }

  // Cap score at 1.0
  score = Math.min(score, 1.0);

  return { example, score, matchReasons };
}

// ============================================================================
// Customization Hints
// ============================================================================

/**
 * Generate customization hints based on the example components
 */
function generateCustomizationHints(example: PipelineExample): string[] {
  const hints: string[] = [];

  // Input-specific hints
  for (const input of example.components.inputs) {
    switch (input) {
      case 'kafka':
      case 'kafka_franz':
        hints.push('Update kafka addresses and topic names for your cluster');
        hints.push('Set consumer_group to a unique name for your application');
        break;
      case 'http_server':
        hints.push('Change the address/port and path for your webhook endpoint');
        hints.push('Configure allowed_verbs based on your API requirements');
        break;
      case 'aws_s3':
        hints.push('Update bucket name and path pattern for your S3 location');
        hints.push('Configure AWS credentials via environment or IAM role');
        break;
      case 'generate':
        hints.push('Replace generate input with your actual data source');
        break;
      case 'postgres_cdc':
      case 'mysql_cdc':
        hints.push('Configure database connection string and credentials');
        hints.push('Set the tables and schema to monitor for changes');
        break;
    }
  }

  // Output-specific hints
  for (const output of example.components.outputs) {
    switch (output) {
      case 'kafka':
      case 'kafka_franz':
        hints.push('Update kafka addresses and target topic name');
        break;
      case 'aws_s3':
        hints.push('Set your S3 bucket and path pattern');
        hints.push('Configure AWS credentials via environment or IAM role');
        break;
      case 'elasticsearch_v8':
      case 'elasticsearch':
        hints.push('Update Elasticsearch URLs and index name');
        hints.push('Configure authentication if required');
        break;
      case 'http_client':
        hints.push('Set the target URL for your API/webhook');
        hints.push('Add required headers like Authorization');
        break;
      case 'stdout':
        hints.push('Replace stdout with your production output');
        break;
    }
  }

  // Processor-specific hints
  for (const proc of example.components.processors) {
    switch (proc) {
      case 'mapping':
        hints.push('Customize the mapping logic for your data schema');
        break;
      case 'http':
        hints.push('Configure the enrichment API URL and authentication');
        break;
      case 'cache':
        hints.push('Set cache TTL and resource name for your use case');
        break;
      case 'retry':
        hints.push('Adjust max_retries and backoff_on based on your SLAs');
        break;
    }
  }

  // Dedupe and return top hints
  const uniqueHints = [...new Set(hints)];
  return uniqueHints.slice(0, 5);
}

// ============================================================================
// Main Suggester
// ============================================================================

/**
 * Suggest pipeline patterns based on use case description
 */
export function suggestPipelinePatterns(options: SuggestOptions): PatternSuggestion[] {
  const { use_case, input_type, output_type, limit = 3 } = options;

  // Extract intent from use case
  const intent = extractIntent(use_case);

  // Score all examples
  const scored: ScoredExample[] = PIPELINE_EXAMPLES.map((example) =>
    scoreExample(example, intent, input_type, output_type)
  );

  // Filter and sort by score
  const filtered = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Convert to suggestions
  return filtered.map((s) => ({
    pattern_name: s.example.name,
    description: s.example.description,
    relevance_score: Math.round(s.score * 100) / 100,
    why_suggested: s.matchReasons.slice(0, 3).join('; '),
    yaml: s.example.yaml,
    customization_hints: generateCustomizationHints(s.example),
  }));
}

/**
 * Get suggestion with helpful message when no matches found
 */
export function suggestWithFallback(options: SuggestOptions): {
  suggestions: PatternSuggestion[];
  message?: string;
} {
  const suggestions = suggestPipelinePatterns(options);

  if (suggestions.length === 0) {
    // Extract what we understood
    const intent = extractIntent(options.use_case);
    const understoodConcepts = [
      ...intent.source_concepts,
      ...intent.destination_concepts,
      ...intent.transformation_concepts,
    ];

    let message = 'No matching patterns found.';
    if (understoodConcepts.length > 0) {
      message += ` Understood concepts: ${understoodConcepts.join(', ')}.`;
    }
    message += ' Try being more specific about source/destination systems, or use input_type/output_type filters.';

    return { suggestions: [], message };
  }

  return { suggestions };
}
