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

  {
    id: 'retry-with-backoff',
    name: 'Retry with Exponential Backoff',
    description: 'Retry failed operations with exponential backoff',
    keywords: ['retry', 'backoff', 'exponential', 'error', 'resilience', 'fault', 'tolerance', 'recover', 'failure'],
    components: {
      inputs: ['kafka'],
      processors: ['retry', 'http', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - orders

pipeline:
  processors:
    - retry:
        max_retries: 5
        backoff:
          initial_interval: 1s
          max_interval: 30s
          max_elapsed_time: 5m
        processors:
          - http:
              url: https://api.example.com/process
              verb: POST
              headers:
                Content-Type: application/json
    - mapping: |
        root = this.parse_json()
        root.processed_at = now()

output:
  kafka:
    addresses:
      - localhost:9092
    topic: processed-orders`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 'try-catch-fallback',
    name: 'Try-Catch with Fallback Processing',
    description: 'Handle errors with fallback logic using try/catch',
    keywords: ['try', 'catch', 'fallback', 'error', 'handling', 'graceful', 'degradation', 'recovery'],
    components: {
      inputs: ['kafka'],
      processors: ['try', 'catch', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - events

pipeline:
  processors:
    - try:
        - mapping: |
            root = this.parse_json()
            root.validated = true
    - catch:
        - mapping: |
            # Fallback: keep original as string if JSON parsing fails
            root.raw_data = this
            root.validated = false
            root.parse_error = error()
    - mapping: |
        root.processed_at = now()

output:
  kafka:
    addresses:
      - localhost:9092
    topic: validated-events`,
    bloblangPatterns: ['parse_json()', 'error()', 'now()'],
  },

  {
    id: 'validation-rejection',
    name: 'Message Validation with Rejection',
    description: 'Validate messages and reject malformed ones',
    keywords: ['validate', 'validation', 'reject', 'schema', 'check', 'filter', 'malformed', 'quality'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
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
    - mapping: |
        let data = this.parse_json()

        # Validate required fields
        let valid = $data.id != null && $data.type != null && $data.payload != null

        root = $data
        meta valid = if $valid { "true" } else { "false" }
        meta rejection_reason = if !$valid {
          if $data.id == null { "missing id" }
          else if $data.type == null { "missing type" }
          else { "missing payload" }
        } else { "" }

output:
  switch:
    cases:
      - check: meta("valid") == "true"
        output:
          kafka:
            addresses:
              - localhost:9092
            topic: valid-messages
      - output:
          kafka:
            addresses:
              - localhost:9092
            topic: rejected-messages`,
    bloblangPatterns: ['parse_json()', 'let', 'if { } else { }', 'meta'],
  },

  {
    id: 'rate-limited-processing',
    name: 'Rate Limited Processing',
    description: 'Process messages with rate limiting to protect downstream services',
    keywords: ['rate', 'limit', 'throttle', 'backpressure', 'protect', 'downstream', 'control', 'flow'],
    components: {
      inputs: ['kafka'],
      processors: ['rate_limit', 'http', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - requests

pipeline:
  processors:
    - rate_limit:
        resource: api_limiter
        count: 100
    - http:
        url: https://api.example.com/process
        verb: POST
    - mapping: |
        root = this.parse_json()
        root.rate_limited_at = now()

rate_limit_resources:
  - label: api_limiter
    local:
      count: 100
      interval: 1s

output:
  kafka:
    addresses:
      - localhost:9092
    topic: processed`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  // ============================================================================
  // PARALLELISM & WORKFLOW
  // ============================================================================
  {
    id: 'fan-out-fan-in',
    name: 'Fan-Out Fan-In Pattern',
    description: 'Split message, process branches in parallel, merge results',
    keywords: ['parallel', 'fan', 'out', 'in', 'branch', 'merge', 'concurrent', 'split', 'workflow'],
    components: {
      inputs: ['kafka'],
      processors: ['branch', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - orders

pipeline:
  processors:
    - branch:
        request_map: 'root = this'
        processors:
          - mapping: |
              root.enriched_user = {"lookup": "user", "id": this.user_id}
        result_map: 'root.user_data = this.enriched_user'
    - branch:
        request_map: 'root = this'
        processors:
          - mapping: |
              root.enriched_product = {"lookup": "product", "id": this.product_id}
        result_map: 'root.product_data = this.enriched_product'
    - mapping: |
        root = this
        root.enriched_at = now()

output:
  kafka:
    addresses:
      - localhost:9092
    topic: enriched-orders`,
    bloblangPatterns: ['now()'],
  },

  {
    id: 'workflow-dag',
    name: 'Workflow DAG Processing',
    description: 'Process messages through a directed acyclic graph of stages',
    keywords: ['workflow', 'dag', 'pipeline', 'stages', 'dependencies', 'orchestration', 'graph'],
    components: {
      inputs: ['kafka'],
      processors: ['workflow', 'mapping'],
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
    - workflow:
        meta_path: workflow_status
        order:
          - - parse
          - - validate
            - enrich
          - - transform
        branches:
          parse:
            request_map: 'root = this'
            processors:
              - mapping: 'root = this.parse_json()'
            result_map: 'root.parsed = this'
          validate:
            request_map: 'root = this.parsed'
            processors:
              - mapping: 'root.valid = this.id != null'
            result_map: 'root.validation = this'
          enrich:
            request_map: 'root = this.parsed'
            processors:
              - mapping: 'root.enriched = true'
            result_map: 'root.enrichment = this'
          transform:
            request_map: 'root = this'
            processors:
              - mapping: |
                  root = this.parsed
                  root.metadata = this.validation.merge(this.enrichment)
            result_map: 'root = this'

output:
  kafka:
    addresses:
      - localhost:9092
    topic: processed-data`,
    bloblangPatterns: ['parse_json()', 'merge()'],
  },

  {
    id: 'parallel-enrichment',
    name: 'Parallel HTTP Enrichment',
    description: 'Enrich messages from multiple APIs in parallel',
    keywords: ['parallel', 'enrich', 'http', 'api', 'concurrent', 'lookup', 'multiple', 'sources'],
    components: {
      inputs: ['kafka'],
      processors: ['parallel', 'http', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - users

pipeline:
  processors:
    - parallel:
        cap: 10
        processors:
          - branch:
              request_map: 'root = this.user_id'
              processors:
                - http:
                    url: https://api.example.com/user/\${! this }
                    verb: GET
              result_map: 'root.profile = this.parse_json()'
          - branch:
              request_map: 'root = this.user_id'
              processors:
                - http:
                    url: https://api.example.com/preferences/\${! this }
                    verb: GET
              result_map: 'root.preferences = this.parse_json()'
    - mapping: |
        root = this
        root.enriched_at = now()

output:
  kafka:
    addresses:
      - localhost:9092
    topic: enriched-users`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 'batch-window-processing',
    name: 'Batch Window Processing',
    description: 'Process messages in time-based or count-based windows',
    keywords: ['batch', 'window', 'time', 'count', 'aggregate', 'group', 'buffer', 'collect'],
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
      count: 1000
      period: 60s
      processors:
        - mapping: |
            root = this.map_each(e -> e.parse_json())

pipeline:
  processors:
    - mapping: |
        root.window_id = uuid_v4()
        root.events = this
        root.event_count = this.length()
        root.window_start = this.index(0).timestamp
        root.window_end = now()

output:
  aws_s3:
    bucket: event-windows
    path: \${! now().format_timestamp("2006/01/02/15") }/\${! this.window_id }.json`,
    bloblangPatterns: ['map_each()', 'parse_json()', 'uuid_v4()', 'length()', 'index()', 'now()', 'format_timestamp()'],
  },

  // ============================================================================
  // CDC & DATABASE (Additional)
  // ============================================================================
  {
    id: 'postgres-cdc-to-kafka',
    name: 'PostgreSQL CDC to Kafka',
    description: 'Stream PostgreSQL changes to Kafka using CDC',
    keywords: ['postgres', 'postgresql', 'cdc', 'change', 'data', 'capture', 'kafka', 'replication', 'wal'],
    components: {
      inputs: ['postgres_cdc'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  postgres_cdc:
    dsn: postgres://user:pass@localhost:5432/mydb?replication=database
    slot_name: my_slot
    tables:
      - public.orders
      - public.customers

pipeline:
  processors:
    - mapping: |
        root.table = this.table
        root.operation = this.operation
        root.data = this.after
        root.before = this.before
        root.timestamp = now()

output:
  kafka:
    addresses:
      - localhost:9092
    topic: cdc-\${! this.table }`,
    bloblangPatterns: ['now()'],
  },

  {
    id: 'mysql-cdc-to-elasticsearch',
    name: 'MySQL CDC to Elasticsearch',
    description: 'Stream MySQL changes to Elasticsearch for search indexing',
    keywords: ['mysql', 'cdc', 'elasticsearch', 'search', 'index', 'binlog', 'replication', 'sync'],
    components: {
      inputs: ['mysql_cdc'],
      processors: ['mapping'],
      outputs: ['elasticsearch_v8'],
    },
    yaml: `input:
  mysql_cdc:
    dsn: user:pass@tcp(localhost:3306)/mydb
    tables:
      - products
    snapshot_mode: initial

pipeline:
  processors:
    - mapping: |
        root = match this.operation {
          "delete" => {
            "_op_type": "delete",
            "_id": this.before.id.string()
          }
          _ => {
            "_id": this.after.id.string(),
            "name": this.after.name,
            "description": this.after.description,
            "price": this.after.price,
            "updated_at": now()
          }
        }

output:
  elasticsearch_v8:
    urls:
      - http://localhost:9200
    index: products
    id: \${! this._id }
    action: \${! this._op_type.or("index") }`,
    bloblangPatterns: ['match', 'string()', 'now()', 'or()'],
  },

  {
    id: 'cockroachdb-changefeed',
    name: 'CockroachDB Changefeed',
    description: 'Process CockroachDB changefeed events',
    keywords: ['cockroachdb', 'changefeed', 'cdc', 'distributed', 'sql', 'streaming', 'change'],
    components: {
      inputs: ['cockroachdb_changefeed'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  cockroachdb_changefeed:
    dsn: postgres://root@localhost:26257/mydb
    tables:
      - transactions
    cursor_cache: file://./cursor.txt

pipeline:
  processors:
    - mapping: |
        root.id = this.key.string()
        root.payload = this.value
        root.timestamp = this.updated.string()
        root.operation = if this.value == null { "delete" } else { "upsert" }

output:
  kafka:
    addresses:
      - localhost:9092
    topic: transaction-changes`,
    bloblangPatterns: ['string()', 'if { } else { }'],
  },

  {
    id: 'sql-upsert-sync',
    name: 'SQL Upsert Synchronization',
    description: 'Upsert data from one database to another',
    keywords: ['sql', 'upsert', 'sync', 'database', 'insert', 'update', 'replicate', 'postgres', 'mysql'],
    components: {
      inputs: ['sql_select'],
      processors: ['mapping'],
      outputs: ['sql_raw'],
    },
    yaml: `input:
  sql_select:
    driver: postgres
    dsn: postgres://user:pass@source:5432/db
    table: products
    columns: ["*"]
    where: updated_at > NOW() - INTERVAL '1 hour'

pipeline:
  processors:
    - mapping: |
        root = this
        root.synced_at = now()

output:
  sql_raw:
    driver: postgres
    dsn: postgres://user:pass@target:5432/db
    query: |
      INSERT INTO products (id, name, price, synced_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        synced_at = EXCLUDED.synced_at
    args_mapping: 'root = [this.id, this.name, this.price, this.synced_at]'`,
    bloblangPatterns: ['now()'],
  },

  // ============================================================================
  // AI/ML PIPELINES (Additional)
  // ============================================================================
  {
    id: 'rag-embedding-pipeline',
    name: 'RAG Embedding Pipeline',
    description: 'Generate embeddings for RAG applications with chunking',
    keywords: ['rag', 'embedding', 'vector', 'chunk', 'ai', 'ml', 'retrieval', 'augmented', 'generation'],
    components: {
      inputs: ['kafka'],
      processors: ['text_chunker', 'openai_embeddings', 'mapping'],
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
        root.doc_id = this.id
        root.text = this.content
    - text_chunker:
        chunk_size: 512
        chunk_overlap: 50
    - openai_embeddings:
        api_key: \${! env("OPENAI_API_KEY") }
        model: text-embedding-3-small
    - mapping: |
        root.id = uuid_v4()
        root.doc_id = this.doc_id
        root.chunk_index = this.chunk_index
        root.vector = this.embedding
        root.payload = {
          "text": this.text,
          "doc_id": this.doc_id,
          "chunk_index": this.chunk_index
        }

output:
  qdrant:
    grpc_host: localhost:6334
    collection: document_chunks`,
    bloblangPatterns: ['env()', 'uuid_v4()'],
  },

  {
    id: 'llm-classification',
    name: 'LLM Text Classification',
    description: 'Classify text using LLM with structured output',
    keywords: ['llm', 'classify', 'classification', 'ai', 'ml', 'openai', 'category', 'label', 'nlp'],
    components: {
      inputs: ['kafka'],
      processors: ['openai_chat_completion', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - support-tickets

pipeline:
  processors:
    - mapping: |
        root.messages = [
          {
            "role": "system",
            "content": "Classify the support ticket. Respond with JSON: {\"category\": \"billing|technical|general\", \"priority\": \"low|medium|high\", \"sentiment\": \"positive|neutral|negative\"}"
          },
          {
            "role": "user",
            "content": this.content
          }
        ]
    - openai_chat_completion:
        api_key: \${! env("OPENAI_API_KEY") }
        model: gpt-4o-mini
        response_format:
          type: json_object
    - mapping: |
        root.ticket_id = this.ticket_id
        root.content = this.content
        root.classification = this.choices.index(0).message.content.parse_json()
        root.classified_at = now()

output:
  kafka:
    addresses:
      - localhost:9092
    topic: classified-tickets`,
    bloblangPatterns: ['env()', 'index()', 'parse_json()', 'now()'],
  },

  {
    id: 'content-moderation',
    name: 'AI Content Moderation',
    description: 'Moderate content using OpenAI moderation API',
    keywords: ['moderation', 'content', 'safety', 'ai', 'openai', 'filter', 'toxic', 'harmful', 'compliance'],
    components: {
      inputs: ['kafka'],
      processors: ['http', 'mapping'],
      outputs: ['switch'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - user-content

pipeline:
  processors:
    - mapping: |
        root.input = this.content
    - http:
        url: https://api.openai.com/v1/moderations
        verb: POST
        headers:
          Authorization: Bearer \${! env("OPENAI_API_KEY") }
          Content-Type: application/json
    - mapping: |
        let result = this.parse_json()
        root.content_id = this.content_id
        root.content = this.content
        root.flagged = $result.results.index(0).flagged
        root.categories = $result.results.index(0).categories
        meta flagged = if $result.results.index(0).flagged { "true" } else { "false" }

output:
  switch:
    cases:
      - check: meta("flagged") == "true"
        output:
          kafka:
            addresses:
              - localhost:9092
            topic: flagged-content
      - output:
          kafka:
            addresses:
              - localhost:9092
            topic: approved-content`,
    bloblangPatterns: ['env()', 'parse_json()', 'index()', 'if { } else { }', 'meta'],
  },

  {
    id: 'bedrock-summarization',
    name: 'AWS Bedrock Summarization',
    description: 'Summarize documents using AWS Bedrock Claude',
    keywords: ['bedrock', 'aws', 'summarize', 'summary', 'claude', 'ai', 'ml', 'document', 'text'],
    components: {
      inputs: ['aws_s3'],
      processors: ['aws_bedrock_chat', 'mapping'],
      outputs: ['aws_s3'],
    },
    yaml: `input:
  aws_s3:
    bucket: documents
    prefix: raw/

pipeline:
  processors:
    - mapping: |
        root.messages = [
          {
            "role": "user",
            "content": "Summarize the following document in 3 bullet points:\\n\\n" + this
          }
        ]
    - aws_bedrock_chat:
        model: anthropic.claude-3-haiku-20240307-v1:0
        region: us-east-1
    - mapping: |
        root.original_key = this.key
        root.summary = this.choices.index(0).message.content
        root.summarized_at = now()

output:
  aws_s3:
    bucket: documents
    path: summaries/\${! this.original_key }.json`,
    bloblangPatterns: ['index()', 'now()'],
  },

  // ============================================================================
  // MESSAGING PATTERNS
  // ============================================================================
  {
    id: 'nats-request-reply',
    name: 'NATS Request-Reply',
    description: 'Implement request-reply pattern with NATS',
    keywords: ['nats', 'request', 'reply', 'rpc', 'sync', 'pattern', 'messaging', 'queue'],
    components: {
      inputs: ['nats'],
      processors: ['mapping', 'nats_request_reply'],
      outputs: ['nats'],
    },
    yaml: `input:
  nats:
    urls:
      - nats://localhost:4222
    subject: requests

pipeline:
  processors:
    - mapping: |
        root.request_id = uuid_v4()
        root.payload = this.parse_json()
    - nats_request_reply:
        urls:
          - nats://localhost:4222
        subject: backend.process
        timeout: 5s
    - mapping: |
        root.request_id = this.request_id
        root.response = this.parse_json()
        root.completed_at = now()

output:
  nats:
    urls:
      - nats://localhost:4222
    subject: responses`,
    bloblangPatterns: ['uuid_v4()', 'parse_json()', 'now()'],
  },

  {
    id: 'redis-streams-consumer',
    name: 'Redis Streams Consumer Group',
    description: 'Process Redis Streams with consumer groups',
    keywords: ['redis', 'streams', 'consumer', 'group', 'queue', 'distributed', 'messaging'],
    components: {
      inputs: ['redis_streams'],
      processors: ['mapping'],
      outputs: ['redis_streams'],
    },
    yaml: `input:
  redis_streams:
    url: redis://localhost:6379
    body_key: body
    streams:
      - stream: orders:new
        consumer_group: order-processor
        consumer_name: worker-1
        start_from_oldest: true

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.processed_by = env("HOSTNAME")
        root.processed_at = now()

output:
  redis_streams:
    url: redis://localhost:6379
    stream: orders:processed
    max_length: 10000`,
    bloblangPatterns: ['parse_json()', 'env()', 'now()'],
  },

  {
    id: 'sqs-to-sns-fanout',
    name: 'AWS SQS to SNS Fanout',
    description: 'Fan out SQS messages to multiple SNS topics',
    keywords: ['sqs', 'sns', 'aws', 'fanout', 'pubsub', 'broadcast', 'multiple', 'topics'],
    components: {
      inputs: ['aws_sqs'],
      processors: ['mapping'],
      outputs: ['broker'],
    },
    yaml: `input:
  aws_sqs:
    url: https://sqs.us-east-1.amazonaws.com/123456789/incoming
    region: us-east-1

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.distributed_at = now()

output:
  broker:
    pattern: fan_out
    outputs:
      - aws_sns:
          topic_arn: arn:aws:sns:us-east-1:123456789:notifications
          region: us-east-1
      - aws_sns:
          topic_arn: arn:aws:sns:us-east-1:123456789:analytics
          region: us-east-1
      - aws_sns:
          topic_arn: arn:aws:sns:us-east-1:123456789:archival
          region: us-east-1`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 'pubsub-filtering',
    name: 'GCP Pub/Sub with Filtering',
    description: 'Filter and route GCP Pub/Sub messages by attributes',
    keywords: ['pubsub', 'gcp', 'google', 'filter', 'attributes', 'route', 'cloud', 'messaging'],
    components: {
      inputs: ['gcp_pubsub'],
      processors: ['mapping'],
      outputs: ['switch'],
    },
    yaml: `input:
  gcp_pubsub:
    project: my-project
    subscription: my-subscription

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.event_type = meta("event_type")
        root.priority = meta("priority").or("normal")

output:
  switch:
    cases:
      - check: this.priority == "high"
        output:
          gcp_pubsub:
            project: my-project
            topic: high-priority
      - check: this.event_type == "error"
        output:
          gcp_pubsub:
            project: my-project
            topic: errors
      - output:
          gcp_pubsub:
            project: my-project
            topic: standard`,
    bloblangPatterns: ['parse_json()', 'meta()', 'or()'],
  },

  // ============================================================================
  // ADVANCED ROUTING
  // ============================================================================
  {
    id: 'content-based-router',
    name: 'Content-Based Router',
    description: 'Route messages based on content fields using switch',
    keywords: ['router', 'routing', 'switch', 'content', 'based', 'conditional', 'branch', 'dispatch'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['switch'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - events

pipeline:
  processors:
    - mapping: |
        let event = this.parse_json()
        root = $event
        meta event_type = $event.type

output:
  switch:
    cases:
      - check: meta("event_type") == "order"
        output:
          kafka:
            addresses:
              - localhost:9092
            topic: orders
      - check: meta("event_type") == "payment"
        output:
          kafka:
            addresses:
              - localhost:9092
            topic: payments
      - check: meta("event_type") == "shipment"
        output:
          kafka:
            addresses:
              - localhost:9092
            topic: shipments
      - output:
          kafka:
            addresses:
              - localhost:9092
            topic: other-events`,
    bloblangPatterns: ['parse_json()', 'let', 'meta'],
  },

  {
    id: 'multi-output-broker',
    name: 'Multi-Output Broker',
    description: 'Write to multiple outputs simultaneously',
    keywords: ['broker', 'multi', 'output', 'duplicate', 'copy', 'multiple', 'destinations', 'fanout'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['broker'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - events

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.replicated_at = now()

output:
  broker:
    pattern: fan_out
    outputs:
      - kafka:
          addresses:
            - localhost:9092
          topic: events-primary
      - aws_s3:
          bucket: events-archive
          path: \${! now().format_timestamp("2006/01/02") }/\${! uuid_v4() }.json
      - elasticsearch_v8:
          urls:
            - http://localhost:9200
          index: events`,
    bloblangPatterns: ['parse_json()', 'now()', 'format_timestamp()', 'uuid_v4()'],
  },

  {
    id: 'fallback-chain',
    name: 'Fallback Output Chain',
    description: 'Try outputs in order until one succeeds',
    keywords: ['fallback', 'chain', 'backup', 'redundant', 'failover', 'resilience', 'output'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['fallback'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - critical-events

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.processed_at = now()

output:
  fallback:
    - http_client:
        url: https://primary-api.example.com/ingest
        verb: POST
        retries: 3
    - http_client:
        url: https://secondary-api.example.com/ingest
        verb: POST
        retries: 3
    - aws_s3:
        bucket: fallback-storage
        path: failed/\${! uuid_v4() }.json`,
    bloblangPatterns: ['parse_json()', 'now()', 'uuid_v4()'],
  },

  {
    id: 'dynamic-routing',
    name: 'Dynamic Output Selection',
    description: 'Dynamically select output based on message content',
    keywords: ['dynamic', 'routing', 'output', 'select', 'variable', 'destination', 'runtime'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['dynamic'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - events

pipeline:
  processors:
    - mapping: |
        let event = this.parse_json()
        root = $event
        # Set dynamic output based on region
        meta output_target = match $event.region {
          "us" => "kafka_us"
          "eu" => "kafka_eu"
          "asia" => "kafka_asia"
          _ => "kafka_default"
        }

output:
  dynamic:
    outputs:
      kafka_us:
        kafka:
          addresses:
            - us-kafka:9092
          topic: regional-events
      kafka_eu:
        kafka:
          addresses:
            - eu-kafka:9092
          topic: regional-events
      kafka_asia:
        kafka:
          addresses:
            - asia-kafka:9092
          topic: regional-events
      kafka_default:
        kafka:
          addresses:
            - localhost:9092
          topic: unrouted-events`,
    bloblangPatterns: ['parse_json()', 'let', 'match', 'meta'],
  },

  // ============================================================================
  // RESOURCE PATTERNS
  // ============================================================================
  {
    id: 'shared-cache',
    name: 'Shared Cache Pattern',
    description: 'Use shared cache across processors for deduplication',
    keywords: ['cache', 'shared', 'dedupe', 'deduplication', 'resource', 'memory', 'redis'],
    components: {
      inputs: ['kafka'],
      processors: ['cache', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - events

pipeline:
  processors:
    - cache:
        resource: dedupe_cache
        operator: add
        key: \${! this.id }
        value: "1"
        ttl: 1h
    - mapping: |
        root = if errored() {
          # Already seen this ID, skip
          deleted()
        } else {
          this.parse_json()
        }

cache_resources:
  - label: dedupe_cache
    redis:
      url: redis://localhost:6379
      default_ttl: 1h

output:
  kafka:
    addresses:
      - localhost:9092
    topic: deduplicated-events`,
    bloblangPatterns: ['errored()', 'deleted()', 'parse_json()'],
  },

  {
    id: 'connection-pooling',
    name: 'HTTP Connection Pooling',
    description: 'Configure connection pooling for HTTP outputs',
    keywords: ['connection', 'pool', 'pooling', 'http', 'performance', 'concurrent', 'optimization'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['http_client'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - events

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()

output:
  http_client:
    url: https://api.example.com/ingest
    verb: POST
    headers:
      Content-Type: application/json
    max_in_flight: 64
    batching:
      count: 100
      period: 1s
    timeout: 30s
    retry_period: 1s
    max_retry_backoff: 30s
    retries: 3`,
    bloblangPatterns: ['parse_json()'],
  },

  // ============================================================================
  // DATA GENERATION & TESTING
  // ============================================================================
  {
    id: 'generate-uuid-stdout',
    name: 'Generate UUIDs to Stdout',
    description: 'Generate random UUIDs and print to standard output',
    keywords: ['generate', 'uuid', 'stdout', 'random', 'test', 'debug', 'print', 'console'],
    components: {
      inputs: ['generate'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  generate:
    count: 10
    interval: 1s
    mapping: |
      root = {}

pipeline:
  processors:
    - mapping: |
        root.uuid = uuid_v4()
        root.timestamp = now()
    - mapping: |
        root.formatted = root.timestamp.format_timestamp("2006-01-02T15:04:05Z07:00")
        root.unix = root.timestamp.ts_unix()

output:
  stdout: {}`,
    bloblangPatterns: ['uuid_v4()', 'now()', 'format_timestamp()', 'ts_unix()'],
  },

  {
    id: 'generate-random-data',
    name: 'Generate Random Test Data',
    description: 'Generate random test data with multiple transformations',
    keywords: ['generate', 'random', 'test', 'data', 'stdout', 'transform', 'hash'],
    components: {
      inputs: ['generate'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  generate:
    count: 0
    interval: 500ms
    mapping: |
      root.id = uuid_v4()

pipeline:
  processors:
    - mapping: |
        root.id = this.id
        root.created_at = now()
        root.random_number = random_int(max: 1000)
    - mapping: |
        root.hash = root.id.hash("sha256").encode("hex").slice(0, 16)
        root.is_even = root.random_number % 2 == 0

output:
  stdout: {}`,
    bloblangPatterns: ['uuid_v4()', 'now()', 'random_int()', 'hash()', 'encode()', 'slice()'],
  },

  {
    id: 'stdin-transform-stdout',
    name: 'Stdin to Stdout Transform',
    description: 'Read from stdin, transform, and write to stdout',
    keywords: ['stdin', 'stdout', 'transform', 'cli', 'pipe', 'test'],
    components: {
      inputs: ['stdin'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  stdin: {}

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.processed_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'now()'],
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
