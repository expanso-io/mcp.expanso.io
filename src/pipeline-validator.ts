/**
 * Pipeline Validator
 *
 * Validates Expanso pipeline configurations against known component schemas.
 * Based on Redpanda Connect (Benthos) component catalog.
 */

// ============================================================================
// Component Registry - All valid Expanso/Benthos components
// ============================================================================

export const VALID_INPUTS = new Set([
  // Messaging
  'amqp_0_9', 'amqp_1', 'kafka', 'kafka_franz', 'nats', 'nats_jetstream', 'nats_kv',
  'nats_stream', 'nsq', 'pulsar', 'redis_list', 'redis_pubsub', 'redis_scan',
  'redis_streams', 'redpanda', 'redpanda_common', 'redpanda_migrator', 'mqtt',
  'ockam_kafka', 'beanstalkd',
  // Cloud Storage
  'aws_s3', 'aws_kinesis', 'aws_sqs', 'gcp_cloud_storage', 'gcp_pubsub',
  'gcp_bigquery_select', 'azure_blob_storage', 'azure_queue_storage',
  'azure_table_storage', 'azure_cosmosdb',
  // Databases
  'mongodb', 'mongodb_cdc', 'cassandra', 'sql_raw', 'sql_select',
  'mysql_cdc', 'postgres_cdc', 'cockroachdb_changefeed', 'gcp_spanner_cdc',
  'tigerbeetle_cdc', 'microsoft_sql_server_cdc',
  // Files
  'file', 'csv', 'parquet', 'stdin', 'sftp', 'hdfs', 'git',
  // HTTP/Network
  'http_client', 'http_server', 'websocket', 'socket', 'socket_server',
  'nanomsg', 'zmq4',
  // Utility
  'generate', 'inproc', 'resource', 'stdin', 'broker', 'dynamic',
  'batched', 'read_until', 'sequence', 'subprocess',
  // Other
  'discord', 'splunk', 'twitter_search', 'spicedb_watch', 'timeplus',
  'schema_registry',
]);

export const VALID_PROCESSORS = new Set([
  // Data Transformation
  'mapping', 'bloblang', 'jq', 'jmespath', 'awk', 'javascript', 'mutation',
  'xml', 'json_schema', 'protobuf', 'msgpack', 'avro', 'grok', 'parse_log',
  // Encoding/Compression
  'compress', 'decompress', 'archive', 'unarchive',
  'parquet_encode', 'parquet_decode',
  'schema_registry_encode', 'schema_registry_decode',
  // Flow Control
  'branch', 'switch', 'try', 'catch', 'retry', 'while', 'for_each',
  'parallel', 'workflow', 'processors', 'group_by', 'group_by_value',
  // Filtering/Routing
  'bounds_check', 'dedupe', 'select_parts', 'insert_part', 'split',
  // Caching/State
  'cache', 'cached', 'rate_limit',
  // External Services
  'http', 'subprocess', 'command', 'aws_lambda', 'redis', 'redis_script',
  'sql_insert', 'sql_raw', 'sql_select', 'couchbase', 'azure_cosmosdb',
  'mongodb', 'nats_kv', 'nats_request_reply', 'jira',
  'aws_dynamodb_partiql', 'gcp_bigquery_select',
  // AI/ML
  'aws_bedrock_chat', 'aws_bedrock_embeddings',
  'cohere_chat', 'cohere_embeddings', 'cohere_rerank',
  'gcp_vertex_ai_chat', 'gcp_vertex_ai_embeddings',
  'ollama_embeddings', 'ollama_chat', 'ollama_moderation',
  'openai_chat_completion', 'openai_embeddings', 'openai_image_generation',
  'openai_speech', 'openai_transcription', 'openai_translation',
  'qdrant', 'text_chunker',
  // Google Drive
  'google_drive_download', 'google_drive_list_labels', 'google_drive_search',
  // Observability/Debug
  'log', 'metric', 'benchmark', 'sleep', 'crash',
  // Utility
  'resource', 'sync_response', 'wasm', 'redpanda_data_transform',
]);

export const VALID_OUTPUTS = new Set([
  // Messaging
  'amqp_0_9', 'amqp_1', 'kafka', 'kafka_franz', 'nats', 'nats_jetstream',
  'nats_kv', 'nats_stream', 'nsq', 'pulsar', 'redis_list', 'redis_pubsub',
  'redis_streams', 'redis_hash', 'redpanda', 'redpanda_common',
  'redpanda_migrator', 'mqtt', 'ockam_kafka', 'beanstalkd', 'pusher',
  // Cloud Storage
  'aws_s3', 'aws_kinesis', 'aws_kinesis_firehose', 'aws_sqs', 'aws_sns',
  'aws_dynamodb', 'gcp_cloud_storage', 'gcp_pubsub', 'gcp_bigquery',
  'azure_blob_storage', 'azure_data_lake_gen2', 'azure_queue_storage',
  'azure_table_storage', 'azure_cosmosdb',
  // Databases
  'mongodb', 'elasticsearch_v8', 'opensearch', 'sql_insert', 'sql_raw',
  'couchbase', 'questdb', 'snowflake_put', 'snowflake_streaming',
  'cyborgdb', 'cypher',
  // Vector DBs
  'pinecone', 'qdrant',
  // Files
  'file', 'stdout', 'sftp', 'hdfs',
  // HTTP/Network
  'http_client', 'http_server', 'websocket', 'socket', 'nanomsg', 'zmq4',
  // Observability
  'splunk_hec',
  // Utility
  'cache', 'drop', 'drop_on', 'reject', 'reject_errored', 'inproc',
  'resource', 'broker', 'dynamic', 'fallback', 'retry', 'switch',
  'sync_response', 'subprocess',
  // Other
  'discord', 'slack_reaction', 'timeplus', 'schema_registry',
]);

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationError {
  path: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// ============================================================================
// Pipeline Validator
// ============================================================================

/**
 * Validate a pipeline configuration object
 */
export function validatePipeline(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Must be an object
  if (!config || typeof config !== 'object') {
    errors.push({
      path: 'root',
      message: 'Pipeline configuration must be an object',
    });
    return { valid: false, errors, warnings };
  }

  const pipeline = config as Record<string, unknown>;

  // Check for common hallucination patterns - Structure Hallucinations (Category 1)
  const hallucinatedKeys = [
    'components', 'with', 'steps', 'tasks', 'stages', 'jobs',
    'sources', 'sinks', 'transforms', 'actions', 'flows',
  ];
  for (const key of hallucinatedKeys) {
    if (key in pipeline) {
      errors.push({
        path: `root.${key}`,
        message: `Invalid key "${key}". Expanso pipelines use "input", "pipeline", and "output"`,
        suggestion: 'Structure: input: <type>: <config>, pipeline: processors: [...], output: <type>: <config>',
      });
    }
  }

  // Kubernetes-style hallucinations
  const k8sKeys = ['apiVersion', 'kind', 'metadata', 'spec', 'version'];
  for (const key of k8sKeys) {
    if (key in pipeline) {
      errors.push({
        path: `root.${key}`,
        message: `Invalid Kubernetes-style key "${key}". This is not a K8s manifest`,
        suggestion: 'Expanso pipelines use: input:, pipeline: processors: [...], output:',
      });
    }
  }

  if ('type' in pipeline && typeof pipeline.type === 'string') {
    errors.push({
      path: 'root.type',
      message: `Invalid top-level "type: ${pipeline.type}". This looks like hallucinated syntax`,
      suggestion: 'Pipeline components are defined as: input: <component_type>: <config>',
    });
  }

  // Check for GitHub Actions style
  if ('name' in pipeline && 'on' in pipeline) {
    errors.push({
      path: 'root',
      message: 'This looks like a GitHub Actions workflow, not an Expanso pipeline',
      suggestion: 'Expanso pipelines use: input:, pipeline: processors: [...], output:',
    });
  }

  // Check for Docker Compose style
  if ('services' in pipeline || 'volumes' in pipeline) {
    errors.push({
      path: 'root',
      message: 'This looks like a Docker Compose file, not an Expanso pipeline',
      suggestion: 'Expanso pipelines use: input:, pipeline: processors: [...], output:',
    });
  }

  // Check pipeline section structure
  if ('pipeline' in pipeline && pipeline.pipeline) {
    const pipelineSection = pipeline.pipeline as Record<string, unknown>;

    // Check for hallucinated pipeline keys
    const validPipelineKeys = new Set(['processors', 'threads']);
    for (const key of Object.keys(pipelineSection)) {
      if (!validPipelineKeys.has(key)) {
        errors.push({
          path: `pipeline.${key}`,
          message: `Invalid pipeline key "${key}". Use "processors" for transformations`,
          suggestion: 'Correct structure: pipeline: processors: [- mapping: ..., - jq: ...]',
        });
      }
    }
  }

  // Validate required sections
  if (!('input' in pipeline)) {
    errors.push({
      path: 'root',
      message: 'Missing required "input" section',
      suggestion: 'Add an input section like: input: kafka: addresses: [...]',
    });
  } else {
    validateComponent(pipeline.input, 'input', VALID_INPUTS, errors);
  }

  if (!('output' in pipeline)) {
    errors.push({
      path: 'root',
      message: 'Missing required "output" section',
      suggestion: 'Add an output section like: output: aws_s3: bucket: my-bucket',
    });
  } else {
    validateComponent(pipeline.output, 'output', VALID_OUTPUTS, errors);
  }

  // Validate optional pipeline.processors section
  if ('pipeline' in pipeline && pipeline.pipeline) {
    const pipelineSection = pipeline.pipeline as Record<string, unknown>;
    if ('processors' in pipelineSection && Array.isArray(pipelineSection.processors)) {
      pipelineSection.processors.forEach((proc, index) => {
        validateComponent(proc, `pipeline.processors[${index}]`, VALID_PROCESSORS, errors);
      });
    }
  }

  // Validate optional buffer section
  if ('buffer' in pipeline && pipeline.buffer) {
    validateBuffer(pipeline.buffer, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single component (input, processor, or output)
 */
function validateComponent(
  component: unknown,
  path: string,
  validTypes: Set<string>,
  errors: ValidationError[]
): void {
  if (!component || typeof component !== 'object') {
    errors.push({
      path,
      message: `${path} must be an object`,
    });
    return;
  }

  const comp = component as Record<string, unknown>;

  // Filter out metadata fields to find the component type
  const metadataFields = new Set(['_expanso_component_id', 'label', 'description', 'processors']);
  const componentKeys = Object.keys(comp).filter(k => !metadataFields.has(k) && !k.startsWith('_'));

  if (componentKeys.length === 0) {
    errors.push({
      path,
      message: `No component type found in ${path}`,
      suggestion: 'Specify a component type like: kafka:, aws_s3:, http_server:, etc.',
    });
    return;
  }

  // Check if it's a known component type
  const componentType = componentKeys[0];

  // Special handling for broker/switch/fallback which wrap other components
  if (['broker', 'switch', 'fallback', 'try', 'catch', 'dynamic'].includes(componentType)) {
    // These are valid meta-components
    return;
  }

  // Validate Bloblang content in mapping/bloblang processors
  if (componentType === 'mapping' || componentType === 'bloblang') {
    const bloblangContent = comp[componentType];
    if (typeof bloblangContent === 'string') {
      validateBloblang(bloblangContent, `${path}.${componentType}`, errors);
    } else if (typeof bloblangContent === 'object' && bloblangContent !== null) {
      // Check for nested query field
      const nested = bloblangContent as Record<string, unknown>;
      if (typeof nested.query === 'string') {
        validateBloblang(nested.query, `${path}.${componentType}.query`, errors);
      }
    }
  }

  if (!validTypes.has(componentType)) {
    const category = path.includes('processor') ? 'processor' : path.split('.')[0];
    const suggestions = findSimilar(componentType, validTypes);

    errors.push({
      path: `${path}.${componentType}`,
      message: `Unknown ${category} type: "${componentType}"`,
      suggestion: suggestions.length > 0
        ? `Did you mean: ${suggestions.join(', ')}?`
        : `Check the Expanso documentation for valid ${category} types`,
    });
  }
}

/**
 * Validate Bloblang syntax in mapping/bloblang processors
 */
function validateBloblang(
  content: string,
  path: string,
  errors: ValidationError[]
): void {
  for (const check of BLOBLANG_ERRORS) {
    if (check.pattern.test(content)) {
      errors.push({
        path,
        message: check.message,
        suggestion: check.suggestion,
      });
    }
  }
}

/**
 * Validate buffer section
 */
function validateBuffer(buffer: unknown, errors: ValidationError[]): void {
  if (!buffer || typeof buffer !== 'object') {
    return;
  }

  const validBuffers = new Set(['memory', 'none', 'system_window']);
  const bufferObj = buffer as Record<string, unknown>;
  const bufferType = Object.keys(bufferObj)[0];

  if (bufferType && !validBuffers.has(bufferType)) {
    errors.push({
      path: `buffer.${bufferType}`,
      message: `Unknown buffer type: "${bufferType}"`,
      suggestion: 'Valid buffer types are: memory, none, system_window',
    });
  }
}

/**
 * Common Bloblang syntax errors that LLMs generate
 */
const BLOBLANG_ERRORS: Array<{
  pattern: RegExp;
  message: string;
  suggestion: string;
}> = [
  {
    pattern: /from_json\s*\(/,
    message: 'Invalid function "from_json()". This is not Bloblang syntax',
    suggestion: 'Use method syntax: this.parse_json() or this.value.parse_json()',
  },
  {
    pattern: /to_json\s*\(/,
    message: 'Invalid function "to_json()". This is not Bloblang syntax',
    suggestion: 'Use method syntax: this.format_json() or root.format_json()',
  },
  {
    pattern: /if\s+.+\s+then\s*$/m,
    message: 'Invalid "if...then" syntax. Bloblang does not use "then" keyword',
    suggestion: 'Use: if condition { value } else { other_value }',
  },
  {
    pattern: /\belse\s*$/m,
    message: 'Invalid standalone "else". Bloblang uses inline conditionals',
    suggestion: 'Use: if condition { value } else { other_value }',
  },
  {
    pattern: /root\s*=\s*null\b/,
    message: 'Invalid "root = null". This does not drop messages',
    suggestion: 'Use: root = deleted() to drop messages',
  },
  {
    pattern: /\breturn\s+/,
    message: 'Invalid "return" statement. Bloblang does not use return',
    suggestion: 'Assign directly to root: root = <value>',
  },
  {
    pattern: /\bfunction\s+\w+\s*\(/,
    message: 'Invalid function definition. Bloblang does not support custom functions inline',
    suggestion: 'Use mapping expressions directly or define in resources',
  },
  {
    pattern: /\bvar\s+\w+\s*=/,
    message: 'Invalid "var" declaration. Bloblang uses "let" for variables',
    suggestion: 'Use: let myVar = value',
  },
  {
    pattern: /\bconst\s+\w+\s*=/,
    message: 'Invalid "const" declaration. Bloblang uses "let" for variables',
    suggestion: 'Use: let myVar = value',
  },
  {
    pattern: /\.\s*map\s*\(\s*\w+\s*=>/,
    message: 'Invalid JavaScript-style .map() with arrow function',
    suggestion: 'Use: this.map_each(item -> item.field)',
  },
  {
    pattern: /\.\s*filter\s*\(\s*\w+\s*=>/,
    message: 'Invalid JavaScript-style .filter() with arrow function',
    suggestion: 'Use: this.filter(item -> item.active)',
  },
  {
    pattern: /\$\{\s*\w+\s*\}/,
    message: 'Invalid ${var} interpolation inside mapping. This is only for config strings',
    suggestion: 'Use variable directly: myVar or this.field',
  },
  // Additional Category 2 - Bloblang Syntax Hallucinations
  {
    pattern: /\basync\s+/,
    message: 'Invalid "async" keyword. Bloblang does not support async/await',
    suggestion: 'Bloblang is synchronous. Use pipeline-level parallelism for concurrency',
  },
  {
    pattern: /\bawait\s+/,
    message: 'Invalid "await" keyword. Bloblang does not support async/await',
    suggestion: 'Bloblang is synchronous. Use pipeline-level parallelism for concurrency',
  },
  {
    pattern: /\bfor\s+\w+\s+in\s+/,
    message: 'Invalid Python-style "for x in items" loop',
    suggestion: 'Use: items.map_each(x -> x.transform()) or items.filter(x -> x.active)',
  },
  {
    pattern: /f"[^"]*\{/,
    message: 'Invalid Python f-string syntax',
    suggestion: 'Use string interpolation: "%s-%s".format(a, b) or concatenation: a + "-" + b',
  },
  {
    pattern: /`[^`]*\$\{/,
    message: 'Invalid JavaScript template literal syntax',
    suggestion: 'Use string interpolation: "%s-%s".format(a, b) or concatenation: a + "-" + b',
  },
  {
    pattern: /root\s*=\s*nil\b/i,
    message: 'Invalid "root = nil". This is not valid Bloblang',
    suggestion: 'Use: root = deleted() to drop messages',
  },
  {
    pattern: /root\s*=\s*None\b/,
    message: 'Invalid "root = None". This is Python syntax, not Bloblang',
    suggestion: 'Use: root = deleted() to drop messages',
  },
  {
    pattern: /\.forEach\s*\(/,
    message: 'Invalid JavaScript-style .forEach()',
    suggestion: 'Use: this.map_each(item -> item.transform())',
  },
  {
    pattern: /\.reduce\s*\(/,
    message: 'Invalid JavaScript-style .reduce()',
    suggestion: 'Use: this.fold(initial, (acc, x) -> acc + x)',
  },
  {
    pattern: /import\s+/,
    message: 'Invalid "import" statement. Bloblang does not support imports',
    suggestion: 'Define all logic inline or use resources for reusable components',
  },
  {
    pattern: /class\s+\w+/,
    message: 'Invalid "class" definition. Bloblang is not object-oriented',
    suggestion: 'Use mapping expressions and let variables for data transformations',
  },
  {
    pattern: /def\s+\w+\s*\(/,
    message: 'Invalid Python-style function definition',
    suggestion: 'Bloblang does not support custom functions. Use inline expressions',
  },
  {
    pattern: /lambda\s+/,
    message: 'Invalid Python-style "lambda"',
    suggestion: 'Use arrow functions: (x -> x.field) or (x, y -> x + y)',
  },
];

/**
 * Common misspellings/abbreviations that LLMs generate
 */
const MISSPELLINGS: Record<string, string> = {
  // Bloblang misspellings
  'blobl': 'bloblang',
  'blobang': 'bloblang',
  'blob': 'bloblang',
  'map': 'mapping',
  'transform': 'mapping',
  'filter': 'mapping',  // filter is done via mapping in Benthos

  // Kafka misspellings
  'kafaka': 'kafka',
  'kafk': 'kafka',
  'kafka_consumer': 'kafka',
  'kafka_producer': 'kafka',

  // Cloud storage
  's3': 'aws_s3',
  'amazon_s3': 'aws_s3',
  'gcs': 'gcp_cloud_storage',
  'google_cloud_storage': 'gcp_cloud_storage',
  'azure_blob': 'azure_blob_storage',

  // Elasticsearch
  'elasticsearch': 'elasticsearch_v8',
  'elastic': 'elasticsearch_v8',
  'es': 'elasticsearch_v8',
  'elastic_search': 'elasticsearch_v8',

  // Databases
  'pg': 'sql_select',
  'postgres': 'sql_select',
  'postgresql': 'sql_select',
  'mysql': 'sql_select',
  'sql': 'sql_select',
  'database': 'sql_select',
  'db': 'sql_select',
  'mongo': 'mongodb',
  'mongdb': 'mongodb',

  // HTTP
  'http': 'http_client',
  'webhook': 'http_server',
  'rest': 'http_client',
  'api': 'http_client',
  'https': 'http_client',

  // NATS
  'nat': 'nats',
  'nats_consumer': 'nats',
  'nats_producer': 'nats',

  // Redis
  'redis_queue': 'redis_list',
  'redis_stream': 'redis_streams',

  // Common hallucinated components that don't exist
  'resize': 'mapping',
  'image': 'mapping',
  'audio': 'mapping',
  'video': 'mapping',
  'rtsp': 'http_client',
  'queue': 'nats',
  'stream': 'kafka',
  'pubsub': 'gcp_pubsub',
};

/**
 * Components that LLMs hallucinate but don't exist
 */
const HALLUCINATED_COMPONENTS = new Set([
  // Generic/made-up names
  'resize', 'image', 'audio', 'video', 'rtsp', 'grpc',
  'database', 'queue', 'stream', 'api', 'webhook',
  'message', 'event', 'data', 'pipeline', 'transform',
  'filter', 'aggregate', 'window', 'join', 'merge', 'split',
  // Wrong casing/format
  'Kafka', 'KAFKA', 'S3', 'HTTP', 'NATS', 'Redis', 'REDIS',
  // Non-existent cloud components
  'cloudwatch', 'cloudfront', 'lambda', 'rds', 'aurora',
  'datadog', 'newrelic', 'grafana', 'prometheus',
]);

/**
 * Find similar component names for suggestions
 */
function findSimilar(input: string, validTypes: Set<string>): string[] {
  const inputLower = input.toLowerCase();

  // Check for known misspellings first
  if (MISSPELLINGS[inputLower]) {
    return [MISSPELLINGS[inputLower]];
  }

  // Check if it's a known hallucinated component
  if (HALLUCINATED_COMPONENTS.has(input) || HALLUCINATED_COMPONENTS.has(inputLower)) {
    // Try to suggest based on common patterns
    if (inputLower.includes('kafka') || inputLower.includes('stream')) {
      return ['kafka', 'nats', 'redis_streams'];
    }
    if (inputLower.includes('s3') || inputLower.includes('storage') || inputLower.includes('blob')) {
      return ['aws_s3', 'gcp_cloud_storage', 'azure_blob_storage'];
    }
    if (inputLower.includes('http') || inputLower.includes('api') || inputLower.includes('webhook')) {
      return ['http_client', 'http_server'];
    }
    if (inputLower.includes('db') || inputLower.includes('sql') || inputLower.includes('database')) {
      return ['sql_select', 'sql_insert', 'mongodb'];
    }
  }

  const matches: string[] = [];

  for (const valid of validTypes) {
    // Check if input is a substring of valid type or vice versa
    if (valid.includes(inputLower) || inputLower.includes(valid)) {
      matches.push(valid);
    }
    // Check for common prefix (at least 3 chars)
    else if (inputLower.length >= 3 && valid.substring(0, 3) === inputLower.substring(0, 3)) {
      matches.push(valid);
    }
  }

  return matches.slice(0, 3);
}

/**
 * Parse YAML and validate as pipeline
 */
export function validatePipelineYaml(yamlString: string): ValidationResult {
  // Check for multiple YAML documents (--- separator) which is a common LLM mistake
  const documents = yamlString.split(/\n---\s*\n/);
  if (documents.length > 1) {
    // Check if multiple documents have pipeline sections
    const pipelineDocs = documents.filter(doc =>
      doc.includes('pipeline:') || doc.includes('input:') || doc.includes('output:')
    );

    if (pipelineDocs.length > 1) {
      return {
        valid: false,
        errors: [{
          path: 'root',
          message: 'Multiple pipeline documents detected. A pipeline must be a single YAML document',
          suggestion: 'Combine all processors into one pipeline: processors: [...] array. Do not use --- separators',
        }],
        warnings: [],
      };
    }
  }

  try {
    const config = parseYaml(yamlString);
    return validatePipeline(config);
  } catch (error) {
    return {
      valid: false,
      errors: [{
        path: 'root',
        message: `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      warnings: [],
    };
  }
}

/**
 * Parse YAML string to object
 * Uses a simple parser that handles common pipeline YAML patterns
 */
function parseYaml(yamlStr: string): Record<string, unknown> {
  // Try JSON first
  try {
    return JSON.parse(yamlStr);
  } catch {
    // Continue with YAML parsing
  }

  // Simple YAML parser for pipeline configs
  const result: Record<string, unknown> = {};
  const lines = yamlStr.split('\n');
  const stack: { indent: number; obj: Record<string, unknown>; key?: string }[] = [
    { indent: -1, obj: result },
  ];

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Calculate indent
    const indent = line.search(/\S/);
    const content = line.trim();

    // Pop stack until we find parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];

    // Handle key: value
    const colonIndex = content.indexOf(':');
    if (colonIndex > 0) {
      const key = content.substring(0, colonIndex).trim();
      let value = content.substring(colonIndex + 1).trim();

      // Handle inline value
      if (value) {
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        // Handle arrays like [a, b, c]
        if (value.startsWith('[') && value.endsWith(']')) {
          const items = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
          (parent.obj as Record<string, unknown>)[key] = items;
        } else if (value === 'true') {
          (parent.obj as Record<string, unknown>)[key] = true;
        } else if (value === 'false') {
          (parent.obj as Record<string, unknown>)[key] = false;
        } else if (!isNaN(Number(value))) {
          (parent.obj as Record<string, unknown>)[key] = Number(value);
        } else {
          (parent.obj as Record<string, unknown>)[key] = value;
        }
      } else {
        // Nested object
        const newObj: Record<string, unknown> = {};
        (parent.obj as Record<string, unknown>)[key] = newObj;
        stack.push({ indent, obj: newObj, key });
      }
    }
    // Handle list items
    else if (content.startsWith('- ')) {
      const parentKey = parent.key;
      if (parentKey) {
        const parentParent = stack[stack.length - 2]?.obj;
        if (parentParent) {
          let arr = parentParent[parentKey] as unknown[];
          if (!Array.isArray(arr)) {
            arr = [];
            (parentParent as Record<string, unknown>)[parentKey] = arr;
          }

          const itemContent = content.substring(2).trim();
          // Check if it's a key: value in the list item
          const itemColonIndex = itemContent.indexOf(':');
          if (itemColonIndex > 0) {
            const itemObj: Record<string, unknown> = {};
            const itemKey = itemContent.substring(0, itemColonIndex).trim();
            const itemValue = itemContent.substring(itemColonIndex + 1).trim();
            if (itemValue) {
              itemObj[itemKey] = itemValue;
            } else {
              itemObj[itemKey] = {};
              stack.push({ indent: indent + 2, obj: itemObj[itemKey] as Record<string, unknown>, key: itemKey });
            }
            arr.push(itemObj);
          } else {
            arr.push(itemContent);
          }
        }
      }
    }
  }

  return result;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) {
    return '✓ Pipeline configuration is valid';
  }

  const lines = ['✗ Pipeline validation failed:', ''];

  for (const error of result.errors) {
    lines.push(`  • ${error.path}: ${error.message}`);
    if (error.suggestion) {
      lines.push(`    → ${error.suggestion}`);
    }
  }

  return lines.join('\n');
}
