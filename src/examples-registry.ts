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
  // BASIC/SIMPLE PIPELINES (highest priority for simple queries)
  // ============================================================================
  {
    id: 'passthrough',
    name: 'Passthrough Pipeline',
    description: 'Simple passthrough that echoes input to output',
    keywords: ['passthrough', 'pass', 'through', 'echo', 'simple', 'basic', 'identity', 'noop'],
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
        root = this

output:
  stdout: {}`,
    bloblangPatterns: [],
  },

  {
    id: 'basic-example',
    name: 'Basic Pipeline Example',
    description: 'A basic example pipeline that reads, processes, and outputs data',
    keywords: ['basic', 'example', 'simple', 'starter', 'template', 'demo'],
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
      root.id = uuid_v4()
      root.timestamp = now()

pipeline:
  processors:
    - mapping: |
        root = this
        root.processed = true

output:
  stdout: {}`,
    bloblangPatterns: ['uuid_v4()', 'now()'],
  },

  {
    id: 'kafka-consumer',
    name: 'Kafka Consumer Example',
    description: 'Consume messages from a Kafka topic',
    keywords: ['kafka', 'consumer', 'consume', 'read', 'subscribe', 'topic'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - my-topic
    consumer_group: my-consumer-group

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()'],
  },

  {
    id: 'multi-topic-kafka',
    name: 'Multi-Topic Kafka Consumer',
    description: 'Consume messages from multiple Kafka topics',
    keywords: ['kafka', 'multi', 'topic', 'multiple', 'topics', 'consumer'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - topic-one
      - topic-two
      - topic-three
    consumer_group: multi-topic-consumer

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.source_topic = meta("kafka_topic")
        root.processed_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'meta()', 'now()'],
  },

  {
    id: 'kafka-producer',
    name: 'Kafka Producer Pipeline',
    description: 'Produce messages to a Kafka topic',
    keywords: ['kafka', 'producer', 'produce', 'write', 'publish', 'topic'],
    components: {
      inputs: ['generate'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  generate:
    count: 100
    interval: 100ms
    mapping: |
      root.id = uuid_v4()
      root.timestamp = now()

pipeline:
  processors:
    - mapping: |
        root = this

output:
  kafka:
    addresses:
      - localhost:9092
    topic: my-output-topic`,
    bloblangPatterns: ['uuid_v4()', 'now()'],
  },

  {
    id: 'kafka-batching',
    name: 'Kafka Batching Example',
    description: 'Consume Kafka messages with batching configuration',
    keywords: ['kafka', 'batch', 'batching', 'batched', 'batch size', 'buffer'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - events
    consumer_group: batch-consumer
    batching:
      count: 100
      period: 10s

pipeline:
  processors:
    - mapping: |
        root.batch_id = uuid_v4()
        root.messages = this.map_each(msg -> msg.parse_json())
        root.count = this.length()

output:
  stdout: {}`,
    bloblangPatterns: ['uuid_v4()', 'map_each()', 'parse_json()', 'length()'],
  },

  {
    id: 'http-request-processor',
    name: 'HTTP Request Processor',
    description: 'Process HTTP requests from a server input',
    keywords: ['http', 'request', 'processor', 'server', 'process', 'handle'],
    components: {
      inputs: ['http_server'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  http_server:
    address: 0.0.0.0:8080
    path: /process

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.processed_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 'http-response-transformer',
    name: 'HTTP Response Transformer',
    description: 'Transform HTTP responses from an API',
    keywords: ['http', 'response', 'transformer', 'transform', 'api', 'client'],
    components: {
      inputs: ['http_client'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  http_client:
    url: https://api.example.com/data
    verb: GET
    rate_limit: 1s

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.transformed = true
        root.fetched_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 's3-file-processor',
    name: 'S3 File Processor',
    description: 'Process files from S3 bucket',
    keywords: ['s3', 'file', 'processor', 'process', 'aws', 'bucket'],
    components: {
      inputs: ['aws_s3'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  aws_s3:
    bucket: my-bucket
    prefix: incoming/

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.file_key = meta("s3_key")
        root.processed_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'meta()', 'now()'],
  },

  {
    id: 'lambda-trigger',
    name: 'Lambda Trigger Pipeline',
    description: 'Pipeline triggered by AWS Lambda events',
    keywords: ['lambda', 'trigger', 'aws', 'serverless', 'event', 'function'],
    components: {
      inputs: ['aws_sqs'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  aws_sqs:
    url: https://sqs.us-east-1.amazonaws.com/123456789/lambda-trigger-queue
    region: us-east-1

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.triggered_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 'kafka-offset',
    name: 'Kafka Offset Management',
    description: 'Manage Kafka consumer offsets',
    keywords: ['kafka', 'offset', 'management', 'consumer', 'commit', 'position'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - my-topic
    consumer_group: offset-manager
    start_from_oldest: true

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.offset = meta("kafka_offset")
        root.partition = meta("kafka_partition")

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'meta()'],
  },

  {
    id: 'http-to-kafka',
    name: 'HTTP to Kafka Pipeline',
    description: 'Receive HTTP requests and forward to Kafka',
    keywords: ['http', 'kafka', 'webhook', 'ingest', 'forward', 'publish'],
    components: {
      inputs: ['http_server'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  http_server:
    address: 0.0.0.0:8080
    path: /ingest

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.ingested_at = now()

output:
  kafka:
    addresses:
      - localhost:9092
    topic: ingested-events`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 'protobuf-decoder',
    name: 'Protobuf to JSON',
    description: 'Decode Protobuf messages to JSON',
    keywords: ['protobuf', 'proto', 'json', 'decode', 'convert', 'binary'],
    components: {
      inputs: ['kafka'],
      processors: ['protobuf', 'mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - protobuf-events

pipeline:
  processors:
    - protobuf:
        operator: to_json
        message: my.package.MyMessage
        import_paths:
          - /proto
    - mapping: |
        root = this
        root.decoded_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['now()'],
  },

  {
    id: 'data-masking',
    name: 'Data Masking Pipeline',
    description: 'Mask sensitive data fields for privacy',
    keywords: ['data', 'masking', 'mask', 'pii', 'privacy', 'redact', 'sensitive'],
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
        root = this.parse_json()
        root.email = this.email.re_replace_all("(.).*@", "$1***@")
        root.phone = "***-***-" + this.phone.slice(-4)
        root.ssn = "***-**-" + this.ssn.slice(-4)

output:
  kafka:
    addresses:
      - localhost:9092
    topic: masked-data`,
    bloblangPatterns: ['parse_json()', 're_replace_all()', 'slice()'],
  },

  {
    id: 'data-enrichment',
    name: 'Data Enrichment Pipeline',
    description: 'Enrich data with additional information',
    keywords: ['data', 'enrichment', 'enrich', 'enhance', 'augment', 'lookup'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping', 'http'],
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
        root = this.parse_json()
    - http:
        url: http://enrichment-service/lookup
        verb: POST
    - mapping: |
        root = this.parse_json()
        root.enriched_at = now()

output:
  kafka:
    addresses:
      - localhost:9092
    topic: enriched-data`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 'xml-to-json',
    name: 'XML to JSON Pipeline',
    description: 'Convert XML data to JSON format',
    keywords: ['xml', 'json', 'convert', 'transform', 'parse', 'format'],
    components: {
      inputs: ['file'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  file:
    paths:
      - /data/*.xml

pipeline:
  processors:
    - mapping: |
        root = this.parse_xml()
        root.converted_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_xml()', 'now()'],
  },

  {
    id: 'windowed-aggregation',
    name: 'Windowed Aggregation',
    description: 'Aggregate data in time-based windows',
    keywords: ['windowed', 'window', 'aggregation', 'aggregate', 'time', 'batch'],
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
      period: 60s
      count: 1000

pipeline:
  processors:
    - mapping: |
        root.window_id = uuid_v4()
        root.events = this.map_each(e -> e.parse_json())
        root.count = this.length()
        root.window_end = now()

output:
  aws_s3:
    bucket: windowed-data
    path: \${! now().format_timestamp("2006/01/02/15") }/\${! this.window_id }.json`,
    bloblangPatterns: ['uuid_v4()', 'map_each()', 'parse_json()', 'length()', 'now()', 'format_timestamp()'],
  },

  // ============================================================================
  // LOG AGGREGATION PIPELINES (High priority for common queries)
  // ============================================================================
  {
    id: 'log-aggregation-simple',
    name: 'Simple Log Aggregation',
    description: 'Aggregate logs from files and write to Elasticsearch',
    keywords: ['log', 'aggregation', 'aggregate', 'logs', 'collect', 'elasticsearch', 'file', 'parsing'],
    components: {
      inputs: ['file'],
      processors: ['mapping'],
      outputs: ['elasticsearch_v8'],
    },
    yaml: `input:
  file:
    paths:
      - /var/log/*.log
    codec: lines

pipeline:
  processors:
    - mapping: |
        root = this
        root.timestamp = now()
        root.hostname = env("HOSTNAME")
        root.source = meta("path")

output:
  elasticsearch_v8:
    urls:
      - http://localhost:9200
    index: logs-\${! now().format_timestamp("2006.01.02") }`,
    bloblangPatterns: ['now()', 'env()', 'meta()', 'format_timestamp()'],
  },

  {
    id: 's3-to-stdout',
    name: 'S3 to Stdout',
    description: 'Read files from S3 bucket and print to stdout',
    keywords: ['s3', 'stdout', 'aws', 'read', 'print', 'console', 'file', 'bucket'],
    components: {
      inputs: ['aws_s3'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  aws_s3:
    bucket: my-bucket
    prefix: data/

pipeline:
  processors:
    - mapping: |
        root = this
        root.file_path = meta("s3_key")

output:
  stdout: {}`,
    bloblangPatterns: ['meta()'],
  },

  {
    id: 'kinesis-to-stdout',
    name: 'Kinesis Stream Processor',
    description: 'Read from AWS Kinesis stream and process messages',
    keywords: ['kinesis', 'aws', 'stream', 'processor', 'streaming', 'real-time'],
    components: {
      inputs: ['aws_kinesis'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  aws_kinesis:
    stream: my-stream
    dynamodb_table: kinesis_checkpoints

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.processed_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  // =========================================================================
  // ELASTICSEARCH EXAMPLES (for kafka to elasticsearch, etc.)
  // =========================================================================
  {
    id: 'kafka-to-elasticsearch',
    name: 'Kafka to Elasticsearch',
    description: 'Stream Kafka messages to Elasticsearch for indexing',
    keywords: ['kafka', 'elasticsearch', 'elastic', 'index', 'search', 'streaming'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['elasticsearch'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - events
    consumer_group: es-indexer

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.indexed_at = now()

output:
  elasticsearch:
    urls:
      - http://localhost:9200
    index: events-\${! now().format_timestamp("2006.01.02") }`,
    bloblangPatterns: ['parse_json()', 'now()', 'format_timestamp()'],
  },

  // =========================================================================
  // REDIS EXAMPLES (for kafka to redis, etc.)
  // =========================================================================
  {
    id: 'kafka-to-redis',
    name: 'Kafka to Redis Pipeline',
    description: 'Stream Kafka messages to Redis for caching',
    keywords: ['kafka', 'redis', 'cache', 'streaming', 'key-value'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['redis_hash'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - users

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()

output:
  redis_hash:
    url: redis://localhost:6379
    key: user:\${! this.id }
    fields_mapping: |
      root = this`,
    bloblangPatterns: ['parse_json()'],
  },

  // =========================================================================
  // KAFKA TO KAFKA EXAMPLES
  // =========================================================================
  {
    id: 'kafka-to-kafka',
    name: 'Kafka to Kafka Transform',
    description: 'Read from one Kafka topic, transform, and write to another',
    keywords: ['kafka', 'transform', 'topic', 'streaming', 'etl'],
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

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.processed = true
        root.timestamp = now()

output:
  kafka:
    addresses:
      - localhost:9092
    topic: processed-events`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  // =========================================================================
  // HTTP CLIENT EXAMPLES
  // =========================================================================
  {
    id: 'http-client-stdout',
    name: 'HTTP Client to Stdout',
    description: 'Fetch data from HTTP endpoint and print to stdout',
    keywords: ['http', 'client', 'stdout', 'api', 'fetch', 'get', 'request'],
    components: {
      inputs: ['http_client'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  http_client:
    url: https://api.example.com/data
    verb: GET
    rate_limit: 1s

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()'],
  },

  {
    id: 'rest-api-polling',
    name: 'REST API Polling Pipeline',
    description: 'Poll a REST API endpoint periodically and process responses',
    keywords: ['rest', 'api', 'polling', 'poll', 'http', 'periodic', 'interval'],
    components: {
      inputs: ['generate', 'http'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  generate:
    interval: 30s
    mapping: |
      root = {}

pipeline:
  processors:
    - http:
        url: https://api.example.com/status
        verb: GET
    - mapping: |
        root = this.parse_json()
        root.polled_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 'api-gateway',
    name: 'API Gateway Pipeline',
    description: 'HTTP server that receives requests and forwards to backend',
    keywords: ['api', 'gateway', 'http', 'server', 'webhook', 'proxy'],
    components: {
      inputs: ['http_server'],
      processors: ['mapping'],
      outputs: ['http_client'],
    },
    yaml: `input:
  http_server:
    address: 0.0.0.0:8080
    path: /api

pipeline:
  processors:
    - mapping: |
        root = this
        root.received_at = now()

output:
  http_client:
    url: https://backend.example.com/process
    verb: POST`,
    bloblangPatterns: ['now()'],
  },

  {
    id: 'webhook-handler',
    name: 'Webhook Event Handler',
    description: 'Receive webhook events and process them',
    keywords: ['webhook', 'event', 'handler', 'http', 'server', 'callback'],
    components: {
      inputs: ['http_server'],
      processors: ['mapping'],
      outputs: ['stdout'],
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
        root = this.parse_json()
        root.event_id = uuid_v4()
        root.received_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'uuid_v4()', 'now()'],
  },

  // =========================================================================
  // AWS EXAMPLES (DynamoDB, SNS, SQS, CloudWatch)
  // =========================================================================
  {
    id: 'dynamodb-to-s3',
    name: 'DynamoDB to S3',
    description: 'Scan DynamoDB table and write to S3',
    keywords: ['dynamodb', 's3', 'aws', 'database', 'backup', 'export'],
    components: {
      inputs: ['aws_dynamodb'],
      processors: ['mapping'],
      outputs: ['aws_s3'],
    },
    yaml: `input:
  aws_dynamodb:
    table: my-table
    region: us-east-1

pipeline:
  processors:
    - mapping: |
        root = this
        root.exported_at = now()

output:
  aws_s3:
    bucket: my-backup-bucket
    path: dynamodb/\${! timestamp_unix() }.json`,
    bloblangPatterns: ['now()', 'timestamp_unix()'],
  },

  {
    id: 'sns-to-sqs',
    name: 'SNS to SQS Pipeline',
    description: 'Fan out SNS messages to SQS queue',
    keywords: ['sns', 'sqs', 'aws', 'fanout', 'queue', 'pubsub'],
    components: {
      inputs: ['aws_sqs'],
      processors: ['mapping'],
      outputs: ['aws_sqs'],
    },
    yaml: `input:
  aws_sqs:
    url: https://sqs.us-east-1.amazonaws.com/123456789/source-queue
    region: us-east-1

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.processed = true

output:
  aws_sqs:
    url: https://sqs.us-east-1.amazonaws.com/123456789/dest-queue
    region: us-east-1`,
    bloblangPatterns: ['parse_json()'],
  },

  {
    id: 'cloudwatch-logs',
    name: 'AWS CloudWatch Logs',
    description: 'Send logs to AWS CloudWatch Logs',
    keywords: ['cloudwatch', 'logs', 'aws', 'logging', 'monitoring'],
    components: {
      inputs: ['stdin'],
      processors: ['mapping'],
      outputs: ['aws_cloudwatch_logs'],
    },
    yaml: `input:
  stdin:
    codec: lines

pipeline:
  processors:
    - mapping: |
        root.message = this
        root.timestamp = now().ts_unix_milli()

output:
  aws_cloudwatch_logs:
    log_group: /my-app/logs
    log_stream: \${! env("HOSTNAME") }
    region: us-east-1`,
    bloblangPatterns: ['now()', 'ts_unix_milli()', 'env()'],
  },

  // =========================================================================
  // GROK PARSING EXAMPLES
  // =========================================================================
  {
    id: 'grok-log-parsing',
    name: 'Log Parsing with Grok',
    description: 'Parse log files using grok patterns',
    keywords: ['grok', 'log', 'parsing', 'parse', 'regex', 'pattern', 'extract'],
    components: {
      inputs: ['file'],
      processors: ['grok', 'mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  file:
    paths:
      - /var/log/app.log
    codec: lines

pipeline:
  processors:
    - grok:
        expressions:
          - '%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:message}'
    - mapping: |
        root = this
        root.parsed_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['now()'],
  },

  {
    id: 'field-extraction',
    name: 'Field Extraction Pipeline',
    description: 'Extract and transform specific fields from JSON data',
    keywords: ['field', 'extraction', 'extract', 'fields', 'select', 'transform', 'mapping'],
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
        root.user_id = this.id
        root.name = this.user.name
        root.email = this.user.email
        root.extracted_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['now()'],
  },

  // =========================================================================
  // AVRO EXAMPLES
  // =========================================================================
  {
    id: 'avro-decoder',
    name: 'Avro Decoder Pipeline',
    description: 'Decode Avro messages and convert to JSON',
    keywords: ['avro', 'decode', 'decoder', 'schema', 'confluent', 'kafka'],
    components: {
      inputs: ['kafka'],
      processors: ['schema_registry_decode', 'mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - avro-events

pipeline:
  processors:
    - schema_registry_decode:
        url: http://localhost:8081
    - mapping: |
        root = this
        root.decoded_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['now()'],
  },

  // =========================================================================
  // TIME WINDOW / AGGREGATION EXAMPLES
  // =========================================================================
  {
    id: 'time-window-grouping',
    name: 'Time Window Grouping',
    description: 'Group messages by time windows',
    keywords: ['time', 'window', 'grouping', 'batch', 'aggregate', 'interval'],
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
      period: 60s
      count: 1000

pipeline:
  processors:
    - mapping: |
        root.window_id = uuid_v4()
        root.events = this.map_each(e -> e.parse_json())
        root.count = this.length()
        root.window_end = now()

output:
  aws_s3:
    bucket: time-windows
    path: \${! now().format_timestamp("2006/01/02/15") }/\${! this.window_id }.json`,
    bloblangPatterns: ['uuid_v4()', 'map_each()', 'parse_json()', 'length()', 'now()', 'format_timestamp()'],
  },

  {
    id: 'csv-to-json',
    name: 'CSV to JSON Converter',
    description: 'Read CSV files and convert to JSON format',
    keywords: ['csv', 'json', 'convert', 'converter', 'parse', 'transform', 'file'],
    components: {
      inputs: ['file'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  file:
    paths:
      - /data/*.csv
    codec: csv

pipeline:
  processors:
    - mapping: |
        root = this
        root.converted_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['now()'],
  },

  {
    id: 'metrics-aggregation-simple',
    name: 'Simple Metrics Aggregation',
    description: 'Aggregate metrics from Kafka and write summaries',
    keywords: ['metrics', 'aggregation', 'aggregate', 'prometheus', 'kafka', 'batch', 'window'],
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
      - metrics
    batching:
      count: 100
      period: 10s

pipeline:
  processors:
    - mapping: |
        root.window_id = uuid_v4()
        root.metrics = this.map_each(m -> m.parse_json())
        root.count = this.length()
        root.window_end = now()

output:
  aws_s3:
    bucket: metrics-archive
    path: \${! now().format_timestamp("2006/01/02") }/\${! this.window_id }.json`,
    bloblangPatterns: ['uuid_v4()', 'map_each()', 'parse_json()', 'length()', 'now()', 'format_timestamp()'],
  },

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

  // ============================================================================
  // BLOBLANG TRANSFORMATIONS (from UMH 19 Examples)
  // ============================================================================
  {
    id: 'base64-decode',
    name: 'Base64 Decoding',
    description: 'Decode base64-encoded values in messages',
    keywords: ['base64', 'decode', 'encode', 'binary', 'transform'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [encoded-data]

pipeline:
  processors:
    - mapping: |
        root = this
        root.decoded_value = this.encoded_value.decode("base64")

output:
  kafka:
    addresses: [localhost:9092]
    topic: decoded-data`,
    bloblangPatterns: ['decode("base64")'],
  },

  {
    id: 'string-cleaning',
    name: 'String Cleaning and Sanitization',
    description: 'Remove specific characters from strings using replace_all',
    keywords: ['string', 'clean', 'sanitize', 'replace', 'remove', 'characters'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [raw-strings]

pipeline:
  processors:
    - mapping: |
        root = this
        root.cleaned_string = this.raw_string.replace_all("-", "").replace_all("_", "")
        root.topic_clean = this.topic.replace_all(".", "_")

output:
  kafka:
    addresses: [localhost:9092]
    topic: cleaned-data`,
    bloblangPatterns: ['replace_all()'],
  },

  {
    id: 'endianness-swap',
    name: 'Hex Endianness Swap',
    description: 'Handle byte order conversion for Modbus or binary data',
    keywords: ['endian', 'endianness', 'hex', 'binary', 'modbus', 'byte', 'swap', 'reverse'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [modbus-data]

pipeline:
  processors:
    - mapping: |
        root = this
        root.correct_endian = this.hex_value.decode("hex").reverse().encode("hex")

output:
  kafka:
    addresses: [localhost:9092]
    topic: corrected-data`,
    bloblangPatterns: ['decode("hex")', 'reverse()', 'encode("hex")'],
  },

  {
    id: 'json-to-xml',
    name: 'JSON to XML Conversion',
    description: 'Convert JSON objects to XML format',
    keywords: ['json', 'xml', 'convert', 'format', 'transform'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [json-data]

pipeline:
  processors:
    - mapping: |
        root.xml_data = this.json_data.format_xml()

output:
  kafka:
    addresses: [localhost:9092]
    topic: xml-data`,
    bloblangPatterns: ['format_xml()'],
  },

  {
    id: 'conditional-error-detection',
    name: 'Conditional Error Detection',
    description: 'Detect errors using conditional logic (bit relations)',
    keywords: ['conditional', 'error', 'detect', 'boolean', 'logic', 'state'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [machine-state]

pipeline:
  processors:
    - mapping: |
        root = this
        root.Error = this.State == "run" && this.speed == 0
        root.is_idle = this.State == "idle" || this.speed < 10

output:
  kafka:
    addresses: [localhost:9092]
    topic: state-analysis`,
    bloblangPatterns: ['== comparison', '&& and', '|| or'],
  },

  {
    id: 'numeric-calculations',
    name: 'Numeric Calculations',
    description: 'Perform mathematical operations on message values',
    keywords: ['math', 'calculate', 'multiply', 'divide', 'number', 'arithmetic'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [sensor-data]

pipeline:
  processors:
    - mapping: |
        root = this
        root.result = this.value.number() * 10
        root.celsius = (this.fahrenheit.number() - 32) * 5 / 9
        root.percentage = (this.current / this.max) * 100

output:
  kafka:
    addresses: [localhost:9092]
    topic: calculated-data`,
    bloblangPatterns: ['number()', 'arithmetic operators'],
  },

  {
    id: 'random-number-generation',
    name: 'Random Number Generation',
    description: 'Generate random numbers for testing or validation',
    keywords: ['random', 'number', 'generate', 'test', 'validation'],
    components: {
      inputs: ['generate'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  generate:
    count: 100
    interval: 100ms
    mapping: |
      root = {}

pipeline:
  processors:
    - mapping: |
        root.random_number = random_int(max: 100)
        root.random_float = random_int(max: 10000) / 100
        root.timestamp_ms = (timestamp_unix_nano() / 1000000).floor()

output:
  stdout: {}`,
    bloblangPatterns: ['random_int()', 'timestamp_unix_nano()', 'floor()'],
  },

  {
    id: 'datetime-conversion',
    name: 'DateTime Conversion (UTC to Local)',
    description: 'Convert timestamps between UTC and local time formats',
    keywords: ['datetime', 'timestamp', 'utc', 'local', 'timezone', 'convert', 'format'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [events]

pipeline:
  processors:
    - mapping: |
        root = this
        root.local_time = this.utc_time.ts_parse("2006-01-02T15:04:05Z").ts_format("2006-01-02 15:04:05", "Local")
        root.formatted = this.timestamp.ts_parse("RFC3339").ts_format("Jan 02, 2006 3:04 PM")

output:
  kafka:
    addresses: [localhost:9092]
    topic: formatted-events`,
    bloblangPatterns: ['ts_parse()', 'ts_format()'],
  },

  {
    id: 'sql-enrichment',
    name: 'Database Enrichment (SQL)',
    description: 'Enrich messages by fetching data from SQL database',
    keywords: ['sql', 'database', 'postgres', 'mysql', 'enrich', 'lookup', 'join'],
    components: {
      inputs: ['kafka'],
      processors: ['branch', 'sql_select', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [raw-events]

pipeline:
  processors:
    - branch:
        processors:
          - sql_select:
              driver: postgres
              dsn: postgres://user:pass@localhost:5432/mydb
              table: asset_data
              where: asset_id = ?
              args_mapping: root = [this.asset_id]
              columns:
                - latest_value
                - asset_name
        result_map: |
          root.enrichment = this

output:
  kafka:
    addresses: [localhost:9092]
    topic: enriched-events`,
    bloblangPatterns: ['branch', 'sql_select', 'result_map'],
  },

  {
    id: 'match-routing',
    name: 'Match Expression Routing',
    description: 'Route messages using match expressions (Modbus example)',
    keywords: ['match', 'route', 'routing', 'conditional', 'modbus', 'switch'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [modbus-data]

pipeline:
  processors:
    - mapping: |
        let workcell = match {
          meta("modbus_slave_id") == "10" => "Rack_ID_10",
          meta("modbus_slave_id") == "20" => "Rack_ID_20",
          meta("modbus_slave_id") == "30" => "Rack_ID_30",
          _ => "Unknown_Rack"
        }
        root = this
        root.workcell = $workcell
        root.tagname = meta("modbus_tag_name")

output:
  kafka:
    addresses: [localhost:9092]
    topic: routed-data`,
    bloblangPatterns: ['match expression', 'meta()', 'let variable'],
  },

  {
    id: 'tcp-network-device',
    name: 'TCP Network Device Communication',
    description: 'Communicate with network devices (scales, sensors) via TCP',
    keywords: ['tcp', 'network', 'device', 'scale', 'sensor', 'netcat', 'command'],
    components: {
      inputs: ['generate'],
      processors: ['command', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  generate:
    interval: 1s
    mapping: |
      root = "SI\\r\\n"

pipeline:
  processors:
    - command:
        name: nc
        args_mapping: '["10.117.216.80", "8000"]'
    - mapping: |
        if content().string().starts_with("SS") {
          let weight = content()
            .replace_all(" ", "")
            .trim_prefix("SS")
            .trim_suffix("g\\r\\n")
            .number()
          let unit = content().string().re_replace_all("[^a-zA-Z]", "")
          root = {
            "value": $weight,
            "timestamp_ms": (timestamp_unix_nano() / 1000000).floor(),
            "unit": $unit
          }
        } else {
          root = deleted()
        }

output:
  kafka:
    addresses: [localhost:9092]
    topic: scale-readings`,
    bloblangPatterns: ['content()', 'starts_with()', 'trim_prefix()', 'trim_suffix()', 're_replace_all()'],
  },

  {
    id: 'kafka-cache-aggregation',
    name: 'Kafka Cache Aggregation',
    description: 'Aggregate messages from multiple topics using cache',
    keywords: ['cache', 'aggregate', 'kafka', 'combine', 'multiple', 'topics'],
    components: {
      inputs: ['kafka'],
      processors: ['branch', 'cache', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics:
      - classification.topic1
      - classification.topic2
    consumer_group: aggregator

pipeline:
  processors:
    - branch:
        processors:
          - cache:
              resource: memorycache
              operator: set
              key: \${! meta("kafka_topic") }
              value: \${! json("classification") }
    - branch:
        processors:
          - cache:
              resource: memorycache
              operator: get
              key: classification.topic1
        result_map: root.class_1 = content().string()
    - branch:
        processors:
          - cache:
              resource: memorycache
              operator: get
              key: classification.topic2
        result_map: root.class_2 = content().string()
    - mapping: |
        root.final = match {
          this.class_1 == "off" || this.class_2 == "off" => "Machine-off",
          this.class_1 == "on" && this.class_2 == "good" => "good",
          _ => "Unknown"
        }

output:
  kafka:
    addresses: [localhost:9092]
    topic: aggregated-result

cache_resources:
  - label: memorycache
    memory:
      default_ttl: 5m`,
    bloblangPatterns: ['cache processor', 'match expression'],
  },

  {
    id: 'latency-measurement',
    name: 'Message Latency Measurement',
    description: 'Measure processing latency between timestamps',
    keywords: ['latency', 'timing', 'performance', 'measurement', 'timestamp'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [events]

pipeline:
  processors:
    - mapping: |
        root = if !this.exists("timestamp_ms") { deleted() }
    - mapping: |
        let current_timestamp = (timestamp_unix_nano() / 1000000).floor()
        let original_timestamp = this.timestamp_ms.number()
        let latency = $current_timestamp - $original_timestamp
        let process_value_name = meta("kafka_topic").replace_all(".", "_")
        root = {
          "timestamp_ms": $current_timestamp,
          $process_value_name: $latency
        }

output:
  kafka:
    addresses: [localhost:9092]
    topic: latency-metrics`,
    bloblangPatterns: ['timestamp_unix_nano()', 'exists()', 'dynamic field names'],
  },

  {
    id: 'http-camera-capture',
    name: 'HTTP Camera Image Capture',
    description: 'Capture images from network camera and encode to base64',
    keywords: ['http', 'camera', 'image', 'capture', 'base64', 'thermal'],
    components: {
      inputs: ['http_client'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  http_client:
    url: http://camera-ip-address/snapshot.jpg
    verb: GET
    rate_limit: webcam_frequency
    timeout: 5s
    retries: 3

pipeline:
  processors:
    - mapping: |
        let image_base64 = content().encode("base64").string()
        let timestamp = (timestamp_unix_nano() / 1000000).floor()
        root = {
          "timestamp_ms": $timestamp,
          "image_base64": $image_base64
        }

output:
  kafka:
    addresses: [localhost:9092]
    topic: camera-images

rate_limit_resources:
  - label: webcam_frequency
    local:
      count: 1
      interval: 1s`,
    bloblangPatterns: ['content()', 'encode("base64")', 'rate_limit_resources'],
  },

  {
    id: 'archive-squash',
    name: 'Archive and Squash Messages',
    description: 'Combine multiple messages into a single JSON payload',
    keywords: ['archive', 'squash', 'combine', 'merge', 'aggregate', 'opc-ua'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping', 'archive'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [opc-ua-tags]

pipeline:
  processors:
    - mapping: |
        let field_name = match {
          meta("opcua_node_id") == "ns=4;i=3" => "machineNumber",
          meta("opcua_node_id") == "ns=4;i=4" => "dataSetNumber",
          _ => meta("opcua_tag_name")
        }
        root = {
          $field_name: this.value
        }
    - archive:
        format: json_array
    - mapping: |
        root = this
          .append({"timestamp_ms": (timestamp_unix_nano() / 1000000).floor()})
          .squash()

output:
  kafka:
    addresses: [localhost:9092]
    topic: combined-opc-ua`,
    bloblangPatterns: ['archive format: json_array', 'append()', 'squash()'],
  },

  {
    id: 'array-average',
    name: 'Array Average Calculation',
    description: 'Calculate average of numerical values in an array',
    keywords: ['array', 'average', 'sum', 'length', 'calculate', 'aggregate'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [measurements]

pipeline:
  processors:
    - mapping: |
        let values = this.measurements
        let total = $values.sum()
        let count = $values.length()
        let average = $total / $count
        root = {
          "timestamp_ms": (timestamp_unix_nano() / 1000000).floor(),
          "average_measurement": $average,
          "min": $values.min(),
          "max": $values.max()
        }

output:
  kafka:
    addresses: [localhost:9092]
    topic: statistics`,
    bloblangPatterns: ['sum()', 'length()', 'min()', 'max()'],
  },

  {
    id: 'bitmask-logic',
    name: 'Bitmask Status Decoding',
    description: 'Decode status bits from integer values',
    keywords: ['bitmask', 'bit', 'status', 'decode', 'binary', 'flag'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [machine-status]

pipeline:
  processors:
    - mapping: |
        let status_code = this.status.number().round().int64()
        root = {
          "status_code": status_code,
          "machine_running": ($status_code % 2) == 1,
          "error_detected": (($status_code / 2) % 2) == 1,
          "maintenance_required": (($status_code / 4) % 2) == 1,
          "timestamp_ms": (timestamp_unix_nano() / 1000000).floor()
        }

output:
  kafka:
    addresses: [localhost:9092]
    topic: decoded-status`,
    bloblangPatterns: ['int64()', 'modulo %', 'integer division'],
  },

  {
    id: 'state-machine-mapping',
    name: 'State Machine Mapping (Weihenstephaner)',
    description: 'Map machine states to standardized state codes',
    keywords: ['state', 'machine', 'weihenstephaner', 'packml', 'mapping', 'oee'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses: [localhost:9092]
    topics: [machine-state]

pipeline:
  processors:
    - mapping: |
        if this.exists("machine_state_code") {
          root = {
            "start_time_unix_ms": this.timestamp_ms,
            "state": match this.machine_state_code {
              0 => 30000,
              1 => 40000,
              2 => 20000,
              4 => 40000,
              8 => 60000,
              16 => 70000,
              32 => 80000,
              64 => 80000,
              128 => 10000,
              _ => 0
            }
          }
        } else {
          root = deleted()
        }

output:
  kafka:
    addresses: [localhost:9092]
    topic: standardized-state`,
    bloblangPatterns: ['match expression', 'exists()', 'deleted()'],
  },

  {
    id: 'mqtt-bridge',
    name: 'MQTT Broker Bridge',
    description: 'Bridge external MQTT broker to internal system',
    keywords: ['mqtt', 'bridge', 'import', 'broker', 'external'],
    components: {
      inputs: ['mqtt'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  mqtt:
    urls:
      - tcp://external-broker:1883
    topics:
      - external/#
    client_id: mqtt-bridge

pipeline:
  processors:
    - mapping: |
        let mqtt_topic = meta("mqtt_topic").replace_all("/", ".")
        let payload = this.catch(deleted())
        root = if payload != null { payload } else { deleted() }
        root.source_topic = $mqtt_topic
        root.imported_at = now()

output:
  kafka:
    addresses: [localhost:9092]
    topic: imported-mqtt`,
    bloblangPatterns: ['meta("mqtt_topic")', 'catch()', 'null check'],
  },

  {
    id: 'mqtt-ssl-tls',
    name: 'MQTT with SSL/TLS',
    description: 'Connect to MQTT broker with SSL/TLS and self-signed certificates',
    keywords: ['mqtt', 'ssl', 'tls', 'certificate', 'secure', 'encrypted'],
    components: {
      inputs: ['mqtt'],
      processors: ['mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  mqtt:
    urls:
      - ssl://secure-broker:8883
    topics:
      - secure-topic/#
    client_id: ssl-client
    tls:
      enabled: true
      skip_cert_verify: true

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.received_at = now()

output:
  kafka:
    addresses: [localhost:9092]
    topic: secure-data`,
    bloblangPatterns: ['tls configuration', 'parse_json()', 'now()'],
  },

  // ============================================================================
  // INDUSTRIAL/DATABASE INTEGRATIONS (from UMH tutorials)
  // ============================================================================
  {
    id: 'opcua-mqtt-bridge',
    name: 'OPC-UA to MQTT Bridge',
    description: 'Bridge OPC-UA data to MQTT with dynamic topic paths from node metadata',
    keywords: ['opcua', 'mqtt', 'iiot', 'plc', 'industrial', 'bridge', 'ot'],
    components: {
      inputs: ['opcua'],
      processors: ['mapping'],
      outputs: ['mqtt'],
    },
    yaml: `input:
  opcua:
    endpoint: 'opc.tcp://localhost:46010'
    nodeIDs: ['ns=2;s=IoTSensors']

pipeline:
  processors:
    - mapping: |
        root = {
          meta("opcua_path"): this,
          "timestamp_unix": timestamp_unix()
        }

output:
  mqtt:
    urls:
      - 'localhost:1883'
    topic: 'ia/raw/opcuasimulator/\${! meta("opcua_path") }'
    client_id: 'benthos-umh'`,
    bloblangPatterns: ['meta()', 'timestamp_unix()', 'dynamic topic interpolation'],
  },

  {
    id: 'kafka-influxdb-lineprotocol',
    name: 'Kafka to InfluxDB Line Protocol',
    description: 'Transform Kafka messages to InfluxDB line protocol format using topic metadata',
    keywords: ['kafka', 'influxdb', 'timeseries', 'metrics', 'line protocol', 'http'],
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
      - 'ia.raw.development.ioTSensors.*'
    consumer_group: influx-writer

pipeline:
  processors:
    - mapping: |
        let value = content().number().string()
        # Split topic: ia.raw.<measurement>.<location>.<field>
        root = meta("kafka_topic").string().split(".").index(2) +
               ",sensor=" + meta("kafka_topic").string().split(".").index(3) + " " +
               meta("kafka_topic").string().split(".").index(4) + "=" + $value + " "

output:
  http_client:
    url: 'http://influxdb:8086/api/v2/write?org=myorg&bucket=mybucket'
    verb: POST
    headers:
      Authorization: 'Token \${INFLUX_TOKEN}'
      Content-Type: text/plain`,
    bloblangPatterns: ['content()', 'number()', 'string()', 'split()', 'index()', 'meta()'],
  },

  {
    id: 'kafka-mongodb-insert',
    name: 'Kafka to MongoDB',
    description: 'Insert Kafka messages into MongoDB with automatic timestamps',
    keywords: ['kafka', 'mongodb', 'database', 'insert', 'nosql', 'document'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['mongodb'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - my-events
    consumer_group: mongo-writer

pipeline:
  processors:
    - mapping: |
        root = {
          "message": this,
          "timestamp_unix": timestamp_unix()
        }

output:
  mongodb:
    url: mongodb://localhost:27017
    database: mydb
    collection: events
    operation: insert-one
    document_map: |
      root.message = this.message
      root.timestamp_unix = this.timestamp_unix`,
    bloblangPatterns: ['timestamp_unix()', 'document_map', 'object literal'],
  },

  // ============================================================================
  // AWS ADDITIONAL COMPONENTS
  // ============================================================================
  {
    id: 'aws-sns-publish',
    name: 'AWS SNS Publisher',
    description: 'Publish messages to AWS SNS topics for fan-out messaging',
    keywords: ['aws', 'sns', 'publish', 'notify', 'fanout', 'pubsub', 'notification', 'topic'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['aws_sns'],
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
        root.published_at = now()

output:
  aws_sns:
    topic_arn: arn:aws:sns:us-east-1:123456789012:my-topic
    region: us-east-1`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 'aws-kinesis-output',
    name: 'AWS Kinesis Stream Output',
    description: 'Write messages to AWS Kinesis Data Streams',
    keywords: ['aws', 'kinesis', 'stream', 'output', 'write', 'realtime', 'streaming'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['aws_kinesis'],
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
        root.partition_key = this.user_id

output:
  aws_kinesis:
    stream: my-kinesis-stream
    partition_key: \${! this.partition_key }
    region: us-east-1`,
    bloblangPatterns: ['parse_json()'],
  },

  {
    id: 'aws-kinesis-firehose',
    name: 'AWS Kinesis Firehose Delivery',
    description: 'Deliver data to AWS Kinesis Firehose for S3, Redshift, or Elasticsearch',
    keywords: ['aws', 'kinesis', 'firehose', 'delivery', 's3', 'redshift', 'elasticsearch', 'streaming'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['aws_kinesis_firehose'],
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
        root = this.parse_json()
        root.delivered_at = now()

output:
  aws_kinesis_firehose:
    stream: my-firehose-stream
    region: us-east-1`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 'aws-lambda-processor',
    name: 'AWS Lambda Processor',
    description: 'Process messages through AWS Lambda functions',
    keywords: ['aws', 'lambda', 'processor', 'serverless', 'function', 'transform'],
    components: {
      inputs: ['kafka'],
      processors: ['aws_lambda', 'mapping'],
      outputs: ['kafka'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - raw-events

pipeline:
  processors:
    - aws_lambda:
        function: my-processing-function
        region: us-east-1
    - mapping: |
        root = this.parse_json()
        root.processed_by = "lambda"

output:
  kafka:
    addresses:
      - localhost:9092
    topic: processed-events`,
    bloblangPatterns: ['parse_json()'],
  },

  {
    id: 'aws-sqs-to-sns-fanout',
    name: 'SQS to SNS Fan-Out',
    description: 'Read from SQS and publish to multiple SNS topics',
    keywords: ['aws', 'sqs', 'sns', 'fanout', 'queue', 'pubsub', 'broadcast'],
    components: {
      inputs: ['aws_sqs'],
      processors: ['mapping'],
      outputs: ['broker', 'aws_sns'],
    },
    yaml: `input:
  aws_sqs:
    url: https://sqs.us-east-1.amazonaws.com/123456789012/my-queue
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
          topic_arn: arn:aws:sns:us-east-1:123456789012:notifications
          region: us-east-1
      - aws_sns:
          topic_arn: arn:aws:sns:us-east-1:123456789012:analytics
          region: us-east-1`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  {
    id: 'aws-dynamodb-output',
    name: 'AWS DynamoDB Writer',
    description: 'Write data to AWS DynamoDB table',
    keywords: ['aws', 'dynamodb', 'write', 'database', 'nosql', 'put', 'item'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['aws_dynamodb'],
    },
    yaml: `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - users

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.updated_at = now()

output:
  aws_dynamodb:
    table: users
    region: us-east-1
    string_columns:
      id: \${! this.id }
      name: \${! this.name }
      email: \${! this.email }`,
    bloblangPatterns: ['parse_json()', 'now()'],
  },

  // ============================================================================
  // AZURE COMPONENTS
  // ============================================================================
  {
    id: 'azure-blob-storage-input',
    name: 'Azure Blob Storage Input',
    description: 'Read files from Azure Blob Storage containers',
    keywords: ['azure', 'blob', 'storage', 'input', 'read', 'container', 'files', 'microsoft'],
    components: {
      inputs: ['azure_blob_storage'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  azure_blob_storage:
    storage_account: mystorageaccount
    storage_access_key: \${! env("AZURE_STORAGE_KEY") }
    container: my-container
    prefix: incoming/

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.blob_name = meta("blob_storage_key")
        root.processed_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'meta()', 'now()', 'env()'],
  },

  {
    id: 'azure-blob-storage-output',
    name: 'Azure Blob Storage Output',
    description: 'Write data to Azure Blob Storage containers',
    keywords: ['azure', 'blob', 'storage', 'output', 'write', 'container', 'upload', 'microsoft'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['azure_blob_storage'],
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
        root.archived_at = now()

output:
  azure_blob_storage:
    storage_account: mystorageaccount
    storage_access_key: \${! env("AZURE_STORAGE_KEY") }
    container: archive
    path: \${! now().format_timestamp("2006/01/02") }/\${! uuid_v4() }.json`,
    bloblangPatterns: ['parse_json()', 'now()', 'format_timestamp()', 'uuid_v4()', 'env()'],
  },

  {
    id: 'azure-cosmosdb-input',
    name: 'Azure CosmosDB Input',
    description: 'Read documents from Azure CosmosDB',
    keywords: ['azure', 'cosmosdb', 'cosmos', 'database', 'nosql', 'input', 'read', 'microsoft'],
    components: {
      inputs: ['azure_cosmosdb'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  azure_cosmosdb:
    endpoint: https://mycosmosaccount.documents.azure.com:443
    account_key: \${! env("COSMOSDB_KEY") }
    database: mydb
    container: events
    partition_keys_map: root = this.id

pipeline:
  processors:
    - mapping: |
        root = this
        root.read_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['now()', 'env()'],
  },

  {
    id: 'azure-cosmosdb-output',
    name: 'Azure CosmosDB Output',
    description: 'Write documents to Azure CosmosDB',
    keywords: ['azure', 'cosmosdb', 'cosmos', 'database', 'nosql', 'output', 'write', 'microsoft'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['azure_cosmosdb'],
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
        root.id = this.event_id
        root.stored_at = now()

output:
  azure_cosmosdb:
    endpoint: https://mycosmosaccount.documents.azure.com:443
    account_key: \${! env("COSMOSDB_KEY") }
    database: mydb
    container: events
    partition_keys_map: root = this.id
    operation: create`,
    bloblangPatterns: ['parse_json()', 'now()', 'env()'],
  },

  {
    id: 'azure-queue-storage-input',
    name: 'Azure Queue Storage Input',
    description: 'Consume messages from Azure Queue Storage',
    keywords: ['azure', 'queue', 'storage', 'input', 'consume', 'messages', 'microsoft'],
    components: {
      inputs: ['azure_queue_storage'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  azure_queue_storage:
    storage_account: mystorageaccount
    storage_access_key: \${! env("AZURE_STORAGE_KEY") }
    queue_name: my-queue

pipeline:
  processors:
    - mapping: |
        root = this.parse_json()
        root.received_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['parse_json()', 'now()', 'env()'],
  },

  {
    id: 'azure-queue-storage-output',
    name: 'Azure Queue Storage Output',
    description: 'Send messages to Azure Queue Storage',
    keywords: ['azure', 'queue', 'storage', 'output', 'send', 'messages', 'microsoft'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['azure_queue_storage'],
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
        root.queued_at = now()

output:
  azure_queue_storage:
    storage_account: mystorageaccount
    storage_access_key: \${! env("AZURE_STORAGE_KEY") }
    queue_name: processed-events`,
    bloblangPatterns: ['parse_json()', 'now()', 'env()'],
  },

  {
    id: 'azure-table-storage-input',
    name: 'Azure Table Storage Input',
    description: 'Read entities from Azure Table Storage',
    keywords: ['azure', 'table', 'storage', 'input', 'read', 'entities', 'microsoft'],
    components: {
      inputs: ['azure_table_storage'],
      processors: ['mapping'],
      outputs: ['stdout'],
    },
    yaml: `input:
  azure_table_storage:
    storage_account: mystorageaccount
    storage_access_key: \${! env("AZURE_STORAGE_KEY") }
    table_name: mytable

pipeline:
  processors:
    - mapping: |
        root = this
        root.read_at = now()

output:
  stdout: {}`,
    bloblangPatterns: ['now()', 'env()'],
  },

  {
    id: 'azure-table-storage-output',
    name: 'Azure Table Storage Output',
    description: 'Write entities to Azure Table Storage',
    keywords: ['azure', 'table', 'storage', 'output', 'write', 'entities', 'microsoft'],
    components: {
      inputs: ['kafka'],
      processors: ['mapping'],
      outputs: ['azure_table_storage'],
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
        root.PartitionKey = this.category
        root.RowKey = this.id
        root.stored_at = now()

output:
  azure_table_storage:
    storage_account: mystorageaccount
    storage_access_key: \${! env("AZURE_STORAGE_KEY") }
    table_name: events`,
    bloblangPatterns: ['parse_json()', 'now()', 'env()'],
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
