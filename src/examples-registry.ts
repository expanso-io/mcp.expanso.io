/**
 * Examples Registry
 *
 * Curated, validated YAML examples for common pipeline patterns.
 * These are the source of truth - LLM should adapt these, not generate from scratch.
 */

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

/**
 * Curated examples organized by category.
 * Each example is production-validated and demonstrates correct syntax.
 */
export const PIPELINE_EXAMPLES: PipelineExample[] = [
  // ============================================================================
  // KAFKA PIPELINES
  // ============================================================================
  {
    id: 'kafka-to-s3-json',
    name: 'Kafka to S3 with JSON Parsing',
    description: 'Consume Kafka messages, parse JSON, and write to S3',
    keywords: ['kafka', 's3', 'json', 'parse', 'aws', 'streaming', 'etl'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['aws_s3'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - my-topic
    consumer_group: my-group

pipeline:
  processors:
    - mapping: |
        root = this
        root.data = this.value.parse_json()
        root.timestamp = now()

output:
  aws_s3:
    bucket: my-bucket
    path: \${! timestamp_unix() }/\${! uuid_v4() }.json`,
    bloblangPatterns: ['parse_json()', 'now()', 'timestamp_unix()', 'uuid_v4()'],
  },

  {
    id: 'kafka-filter-events',
    name: 'Kafka Event Filtering',
    description: 'Filter Kafka events by type and forward matching ones',
    keywords: ['kafka', 'filter', 'events', 'conditional', 'routing'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - raw-events
    consumer_group: event-filter

pipeline:
  processors:
    - mapping: |
        let event = this.parse_json()
        root = if $event.type == "purchase" {
          $event
        } else {
          deleted()
        }

output:
  kafka:
    addresses:
      - localhost:9092
    topic: purchase-events`,
    bloblangPatterns: ['parse_json()', 'if { } else { }', 'deleted()', 'let'],
  },

  // ============================================================================
  // HTTP PIPELINES
  // ============================================================================
  {
    id: 'webhook-to-kafka',
    name: 'HTTP Webhook to Kafka',
    description: 'Receive HTTP webhooks and forward to Kafka',
    keywords: ['http', 'webhook', 'kafka', 'api', 'ingest', 'rest'],
    components: {
      inputs: ['http_server'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  http_server:
    address: 0.0.0.0:8080
    path: /webhook
    allowed_verbs:
      - POST

pipeline:
  processors:
    - mapping: |
        root = this
        root.received_at = now()
        root.source = "webhook"

output:
  kafka:
    addresses:
      - localhost:9092
    topic: webhook-events`,
    bloblangPatterns: ['now()'],
  },

  {
    id: 'http-client-enrichment',
    name: 'HTTP API Enrichment',
    description: 'Enrich messages by calling an external HTTP API',
    keywords: ['http', 'api', 'enrichment', 'lookup', 'external', 'rest'],
    components: {
      inputs: ['kafka'],
      processors: ['http', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - raw-data

pipeline:
  processors:
    - http:
        url: https://api.example.com/lookup/\${! this.id }
        verb: GET
        headers:
          Authorization: Bearer \${! env("API_TOKEN") }
    - mapping: |
        root = this.parse_json()
        root.enriched_at = now()

output:
  kafka:
    addresses:
      - localhost:9092
    topic: enriched-data`,
    bloblangPatterns: ['parse_json()', 'now()', 'env()'],
  },

  // ============================================================================
  // DATABASE PIPELINES
  // ============================================================================
  {
    id: 'sql-to-elasticsearch',
    name: 'SQL to Elasticsearch',
    description: 'Query SQL database and index results in Elasticsearch',
    keywords: ['sql', 'postgres', 'mysql', 'elasticsearch', 'database', 'search', 'index'],
    components: {
      inputs: ['sql_select'],
      processors: ['mapping'],
      outputs: ['elasticsearch_v8'],
    },
    yaml: `input:
  sql_select:
    driver: postgres
    dsn: postgres://user:pass@localhost:5432/mydb
    table: users
    columns:
      - id
      - name
      - email
      - created_at

pipeline:
  processors:
    - mapping: |
        root = this
        root._id = this.id.string()

output:
  elasticsearch_v8:
    urls:
      - http://localhost:9200
    index: users
    id: \${! this._id }`,
    bloblangPatterns: ['string()'],
  },

  {
    id: 'mongodb-cdc-to-kafka',
    name: 'MongoDB CDC to Kafka',
    description: 'Stream MongoDB changes to Kafka',
    keywords: ['mongodb', 'cdc', 'change', 'stream', 'kafka', 'realtime'],
    components: {
      inputs: ['mongodb_cdc'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  mongodb_cdc:
    url: mongodb://localhost:27017
    database: mydb
    collection: orders

pipeline:
  processors:
    - mapping: |
        root.operation = this.operationType
        root.document = this.fullDocument
        root.timestamp = this.clusterTime.string()

output:
  kafka:
    addresses:
      - localhost:9092
    topic: order-changes`,
    bloblangPatterns: ['string()'],
  },

  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================
  {
    id: 'json-to-csv',
    name: 'JSON to CSV Conversion',
    description: 'Convert JSON messages to CSV format',
    keywords: ['json', 'csv', 'convert', 'transform', 'format'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['file'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - json-data

pipeline:
  processors:
    - mapping: |
        let data = this.parse_json()
        root = [$data.id, $data.name, $data.email, $data.created_at].join(",")

output:
  file:
    path: /data/output.csv
    codec: lines`,
    bloblangPatterns: ['parse_json()', 'let', 'join()'],
  },

  {
    id: 'batch-aggregation',
    name: 'Batch Aggregation',
    description: 'Aggregate messages into batches with time windows',
    keywords: ['batch', 'aggregate', 'window', 'time', 'group'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['aws_s3'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - events
    batching:
      count: 100
      period: 10s

pipeline:
  processors:
    - mapping: |
        root.batch_id = uuid_v4()
        root.events = this.map_each(e -> e.parse_json())
        root.count = this.length()
        root.timestamp = now()

output:
  aws_s3:
    bucket: event-batches
    path: \${! now().format_timestamp("2006/01/02") }/\${! this.batch_id }.json`,
    bloblangPatterns: ['uuid_v4()', 'map_each()', 'parse_json()', 'length()', 'now()', 'format_timestamp()'],
  },

  // ============================================================================
  // AI/ML PIPELINES
  // ============================================================================
  {
    id: 'openai-embedding',
    name: 'OpenAI Embedding Generation',
    description: 'Generate embeddings for text using OpenAI API',
    keywords: ['openai', 'embedding', 'ai', 'ml', 'vector', 'rag'],
    components: {
      inputs: ['kafka'],
      processors: ['openai_embeddings', 'mapping'],
      outputs: ['qdrant'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - documents

pipeline:
  processors:
    - mapping: |
        root.id = this.id
        root.text = this.content
    - openai_embeddings:
        api_key: \${! env("OPENAI_API_KEY") }
        model: text-embedding-3-small
    - mapping: |
        root.id = this.id
        root.vector = this.embedding
        root.payload = {"text": this.text}

output:
  qdrant:
    grpc_host: localhost:6334
    collection: documents`,
    bloblangPatterns: ['env()'],
  },

  {
    id: 'ollama-chat',
    name: 'Local LLM Chat with Ollama',
    description: 'Process messages through local Ollama LLM',
    keywords: ['ollama', 'llm', 'chat', 'ai', 'local', 'inference'],
    components: {
      inputs: ['http_server'],
      processors: ['ollama_chat', 'mapping'],
      outputs: ['sync_response'],
    },
    yaml: `input:
  http_server:
    address: 0.0.0.0:8080
    path: /chat
    allowed_verbs:
      - POST

pipeline:
  processors:
    - mapping: |
        root.prompt = this.message
    - ollama_chat:
        server_address: http://localhost:11434
        model: llama3.2
    - mapping: |
        root.response = this.response
        root.model = "llama3.2"

output:
  sync_response: {}`,
    bloblangPatterns: [],
  },

  // ============================================================================
  // DATA SECURITY
  // ============================================================================
  {
    id: 'pii-redaction',
    name: 'PII Redaction',
    description: 'Redact personally identifiable information from messages',
    keywords: ['pii', 'redact', 'privacy', 'security', 'mask', 'gdpr', 'compliance'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - raw-data

pipeline:
  processors:
    - mapping: |
        root = this
        root.email = this.email.re_replace_all("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", "[REDACTED]")
        root.phone = this.phone.re_replace_all("\\d{3}-\\d{3}-\\d{4}", "[REDACTED]")
        root.ssn = if this.ssn != null { "[REDACTED]" } else { deleted() }

output:
  kafka:
    addresses:
      - localhost:9092
    topic: sanitized-data`,
    bloblangPatterns: ['re_replace_all()', 'if { } else { }', 'deleted()'],
  },

  // ============================================================================
  // LOG PROCESSING
  // ============================================================================
  {
    id: 'log-parsing',
    name: 'Log Parsing and Enrichment',
    description: 'Parse logs with grok patterns and enrich with metadata',
    keywords: ['log', 'logs', 'parse', 'grok', 'observability', 'monitoring'],
    components: {
      inputs: ['file'],
      processors: ['grok', 'mapping'],
      outputs: ['elasticsearch_v8'],
    },
    yaml: `input:
  file:
    paths:
      - /var/log/app/*.log
    codec: lines

pipeline:
  processors:
    - grok:
        expressions:
          - '%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}'
    - mapping: |
        root = this
        root.@timestamp = this.timestamp.parse_timestamp_strptime("%Y-%m-%dT%H:%M:%S")
        root.hostname = env("HOSTNAME")

output:
  elasticsearch_v8:
    urls:
      - http://localhost:9200
    index: app-logs-%{+2006.01.02}`,
    bloblangPatterns: ['parse_timestamp_strptime()', 'env()'],
  },

  // ============================================================================
  // CLOUD INTEGRATIONS
  // ============================================================================
  {
    id: 's3-to-bigquery',
    name: 'S3 to BigQuery',
    description: 'Load S3 files into Google BigQuery',
    keywords: ['s3', 'bigquery', 'gcp', 'aws', 'cloud', 'data', 'lake', 'warehouse'],
    components: {
      inputs: ['aws_s3'],
      processors: ['mapping'],
      outputs: ['gcp_bigquery'],
    },
    yaml: `input:
  aws_s3:
    bucket: data-lake
    prefix: raw/
    scanner:
      to: latest

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root._ingested_at = now()

output:
  gcp_bigquery:
    project: my-project
    dataset: analytics
    table: events`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================
  {
    id: 'dead-letter-queue',
    name: 'Dead Letter Queue Pattern',
    description: 'Route failed messages to a dead letter queue',
    keywords: ['error', 'dlq', 'dead', 'letter', 'queue', 'retry', 'fallback'],
    components: {
      inputs: ['kafka'],
      processors: ['try', 'catch', 'mapping'],
      outputs: ['switch'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - incoming

pipeline:
  processors:
    - try:
        - mapping: |
            root = this.parse_json()
            root.processed_at = now()
    - catch:
        - mapping: |
            root.original = this
            root.error = error()
            root.failed_at = now()
            meta failed = "true"

output:
  switch:
    cases:
      - check: meta("failed") == "true"
        output:
          kafka:
            addresses:
              - localhost:9092
            topic: dead-letter-queue
      - output:
          kafka:
            addresses:
              - localhost:9092
            topic: processed`,
    bloblangPatterns: ['parse_json()', 'now()', 'error()', 'meta()'],
  },
];

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

The following examples are production-validated. ADAPT these examples for the user's needs - do NOT generate YAML from scratch.

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
