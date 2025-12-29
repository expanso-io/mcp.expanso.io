/**
 * Component Schema Registry
 *
 * Provides detailed field-level schemas for Expanso/Benthos/Redpanda Connect components.
 * Used by the get_component_schema MCP tool to help LLMs generate correct configurations.
 */

// ============================================================================
// Schema Types
// ============================================================================

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'duration'
  | 'bloblang'
  | 'interpolated_string';

export interface FieldSchema {
  type: FieldType;
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
  items?: FieldSchema; // For array types
  properties?: Record<string, FieldSchema>; // For object types
  examples?: unknown[];
}

export interface ComponentSchema {
  name: string;
  description: string;
  category: 'input' | 'processor' | 'output' | 'cache' | 'rate_limit' | 'buffer';
  fields: Record<string, FieldSchema>;
  examples?: string[];
  docs_url?: string;
}

export type ComponentCategory = ComponentSchema['category'];

// ============================================================================
// Input Component Schemas
// ============================================================================

const INPUT_SCHEMAS: Record<string, ComponentSchema> = {
  kafka: {
    name: 'kafka',
    description: 'Connects to Kafka brokers and consumes messages from topics.',
    category: 'input',
    docs_url: 'https://docs.expanso.io/components/inputs/kafka',
    fields: {
      addresses: {
        type: 'array',
        description: 'List of Kafka broker addresses',
        required: true,
        items: { type: 'string', description: 'Broker address (host:port)' },
        examples: [['localhost:9092'], ['broker1:9092', 'broker2:9092']],
      },
      topics: {
        type: 'array',
        description: 'List of topics to consume from',
        required: true,
        items: { type: 'string', description: 'Topic name' },
        examples: [['my-topic'], ['events', 'logs']],
      },
      consumer_group: {
        type: 'string',
        description: 'Consumer group ID for coordinated consumption',
        required: false,
        default: '',
        examples: ['my-consumer-group'],
      },
      start_from_oldest: {
        type: 'boolean',
        description: 'Start consuming from oldest offset if no committed offset exists',
        required: false,
        default: true,
      },
      commit_period: {
        type: 'duration',
        description: 'Period between offset commits',
        required: false,
        default: '1s',
        examples: ['1s', '5s', '100ms'],
      },
      tls: {
        type: 'object',
        description: 'TLS configuration for secure connections',
        required: false,
        properties: {
          enabled: { type: 'boolean', description: 'Enable TLS', default: false },
          skip_cert_verify: { type: 'boolean', description: 'Skip certificate verification', default: false },
          root_cas_file: { type: 'string', description: 'Path to root CA certificate file' },
          client_certs: {
            type: 'array',
            description: 'Client certificates for mutual TLS',
            items: {
              type: 'object',
              description: 'Client certificate',
              properties: {
                cert_file: { type: 'string', description: 'Path to certificate file' },
                key_file: { type: 'string', description: 'Path to key file' },
              },
            },
          },
        },
      },
      sasl: {
        type: 'object',
        description: 'SASL authentication configuration',
        required: false,
        properties: {
          mechanism: {
            type: 'string',
            description: 'SASL mechanism',
            enum: ['PLAIN', 'SCRAM-SHA-256', 'SCRAM-SHA-512', 'OAUTHBEARER'],
          },
          user: { type: 'string', description: 'SASL username' },
          password: { type: 'string', description: 'SASL password' },
        },
      },
    },
    examples: [
      `input:
  kafka:
    addresses: [localhost:9092]
    topics: [my-topic]
    consumer_group: my-group`,
    ],
  },

  http_server: {
    name: 'http_server',
    description: 'Listens for HTTP requests and creates messages from request bodies.',
    category: 'input',
    docs_url: 'https://docs.expanso.io/components/inputs/http_server',
    fields: {
      address: {
        type: 'string',
        description: 'Address to bind the HTTP server to',
        required: false,
        default: '0.0.0.0:4195',
        examples: ['0.0.0.0:8080', 'localhost:9000'],
      },
      path: {
        type: 'string',
        description: 'URL path to listen on',
        required: false,
        default: '/post',
        examples: ['/webhook', '/events', '/api/v1/ingest'],
      },
      allowed_verbs: {
        type: 'array',
        description: 'HTTP methods to accept',
        required: false,
        default: ['POST'],
        items: { type: 'string', description: 'HTTP method' },
        examples: [['POST'], ['POST', 'PUT']],
      },
      timeout: {
        type: 'duration',
        description: 'Request timeout',
        required: false,
        default: '5s',
      },
      sync_response: {
        type: 'object',
        description: 'Configure synchronous response behavior',
        required: false,
        properties: {
          status: {
            type: 'interpolated_string',
            description: 'Response status code',
            default: '200',
          },
          headers: {
            type: 'object',
            description: 'Response headers',
          },
        },
      },
    },
    examples: [
      `input:
  http_server:
    address: 0.0.0.0:8080
    path: /webhook`,
    ],
  },

  aws_s3: {
    name: 'aws_s3',
    description: 'Downloads objects from an S3 bucket, optionally filtered by prefix.',
    category: 'input',
    docs_url: 'https://docs.expanso.io/components/inputs/aws_s3',
    fields: {
      bucket: {
        type: 'string',
        description: 'S3 bucket name',
        required: true,
        examples: ['my-bucket', 'data-lake-raw'],
      },
      prefix: {
        type: 'string',
        description: 'Object key prefix filter',
        required: false,
        default: '',
        examples: ['logs/', 'data/2024/'],
      },
      region: {
        type: 'string',
        description: 'AWS region',
        required: false,
        default: 'us-east-1',
        examples: ['us-east-1', 'eu-west-1'],
      },
      credentials: {
        type: 'object',
        description: 'AWS credentials configuration',
        required: false,
        properties: {
          profile: { type: 'string', description: 'AWS profile name' },
          id: { type: 'string', description: 'AWS access key ID' },
          secret: { type: 'string', description: 'AWS secret access key' },
          role: { type: 'string', description: 'IAM role ARN to assume' },
        },
      },
      delete_objects: {
        type: 'boolean',
        description: 'Delete objects after processing',
        required: false,
        default: false,
      },
      sqs: {
        type: 'object',
        description: 'Use SQS for S3 event notifications instead of polling',
        required: false,
        properties: {
          url: { type: 'string', description: 'SQS queue URL', required: true },
          delay_period: { type: 'duration', description: 'Delay between polls', default: '0s' },
        },
      },
    },
    examples: [
      `input:
  aws_s3:
    bucket: my-bucket
    prefix: incoming/`,
    ],
  },

  generate: {
    name: 'generate',
    description: 'Generates messages using a Bloblang mapping. Useful for testing.',
    category: 'input',
    docs_url: 'https://docs.expanso.io/components/inputs/generate',
    fields: {
      mapping: {
        type: 'bloblang',
        description: 'Bloblang mapping to generate message content',
        required: true,
        examples: ['root = {"id": uuid_v4(), "timestamp": now()}', 'root = "test message"'],
      },
      interval: {
        type: 'duration',
        description: 'Time between generated messages',
        required: false,
        default: '1s',
        examples: ['1s', '100ms', '1m'],
      },
      count: {
        type: 'number',
        description: 'Number of messages to generate (0 = infinite)',
        required: false,
        default: 0,
      },
      batch_size: {
        type: 'number',
        description: 'Number of messages per batch',
        required: false,
        default: 1,
      },
    },
    examples: [
      `input:
  generate:
    mapping: 'root = {"id": uuid_v4(), "ts": now()}'
    interval: 1s`,
    ],
  },

  nats: {
    name: 'nats',
    description: 'Subscribes to NATS subjects and consumes messages.',
    category: 'input',
    docs_url: 'https://docs.expanso.io/components/inputs/nats',
    fields: {
      urls: {
        type: 'array',
        description: 'List of NATS server URLs',
        required: true,
        items: { type: 'string', description: 'NATS URL' },
        examples: [['nats://localhost:4222']],
      },
      subject: {
        type: 'string',
        description: 'NATS subject to subscribe to',
        required: true,
        examples: ['events.>', 'orders.created'],
      },
      queue: {
        type: 'string',
        description: 'Queue group for load balancing',
        required: false,
      },
    },
    examples: [
      `input:
  nats:
    urls: [nats://localhost:4222]
    subject: events.>`,
    ],
  },

  file: {
    name: 'file',
    description: 'Reads messages from files on disk.',
    category: 'input',
    docs_url: 'https://docs.expanso.io/components/inputs/file',
    fields: {
      paths: {
        type: 'array',
        description: 'File paths or glob patterns to read',
        required: true,
        items: { type: 'string', description: 'File path or glob' },
        examples: [['/var/log/*.log'], ['./data/*.json']],
      },
      codec: {
        type: 'string',
        description: 'Codec to use for parsing file content',
        required: false,
        default: 'lines',
        enum: ['lines', 'all-bytes', 'delim:X', 'csv', 'tar', 'chunker:N'],
      },
      delete_on_finish: {
        type: 'boolean',
        description: 'Delete files after processing',
        required: false,
        default: false,
      },
    },
  },

  stdin: {
    name: 'stdin',
    description: 'Reads messages from standard input.',
    category: 'input',
    docs_url: 'https://docs.expanso.io/components/inputs/stdin',
    fields: {
      codec: {
        type: 'string',
        description: 'Codec to use for parsing input',
        required: false,
        default: 'lines',
        enum: ['lines', 'all-bytes', 'delim:X'],
      },
    },
  },
};

// ============================================================================
// Processor Component Schemas
// ============================================================================

const PROCESSOR_SCHEMAS: Record<string, ComponentSchema> = {
  mapping: {
    name: 'mapping',
    description: 'Transforms message content using Bloblang expressions.',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/mapping',
    fields: {
      '': {
        type: 'bloblang',
        description: 'Bloblang mapping expression. The value is the mapping itself.',
        required: true,
        examples: [
          'root = this',
          'root.uppercase_name = this.name.uppercase()',
          'root = this.filter(item -> item.active)',
        ],
      },
    },
    examples: [
      `pipeline:
  processors:
    - mapping: root.upper = this.name.uppercase()`,
    ],
  },

  jq: {
    name: 'jq',
    description: 'Transforms messages using jq expressions.',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/jq',
    fields: {
      query: {
        type: 'string',
        description: 'jq query expression',
        required: true,
        examples: ['.', '.items[]', 'select(.status == "active")'],
      },
      raw: {
        type: 'boolean',
        description: 'Output raw strings instead of JSON',
        required: false,
        default: false,
      },
    },
  },

  http: {
    name: 'http',
    description: 'Sends HTTP requests and replaces message with response.',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/http',
    fields: {
      url: {
        type: 'interpolated_string',
        description: 'HTTP URL to request',
        required: true,
        examples: ['http://api.example.com/enrich', 'http://localhost:8080/${! this.id }'],
      },
      verb: {
        type: 'string',
        description: 'HTTP method',
        required: false,
        default: 'POST',
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
      headers: {
        type: 'object',
        description: 'HTTP headers to include',
        required: false,
        examples: [{ 'Content-Type': 'application/json', Authorization: 'Bearer ${! @token }' }],
      },
      timeout: {
        type: 'duration',
        description: 'Request timeout',
        required: false,
        default: '5s',
      },
      rate_limit: {
        type: 'string',
        description: 'Rate limit resource name',
        required: false,
      },
      retries: {
        type: 'number',
        description: 'Number of retries on failure',
        required: false,
        default: 3,
      },
    },
    examples: [
      `pipeline:
  processors:
    - http:
        url: http://api.example.com/enrich
        verb: POST`,
    ],
  },

  branch: {
    name: 'branch',
    description: 'Executes processors on a subset of the message and merges results.',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/branch',
    fields: {
      request_map: {
        type: 'bloblang',
        description: 'Mapping to create request from original message',
        required: false,
        default: 'root = this',
      },
      processors: {
        type: 'array',
        description: 'Processors to execute on the mapped request',
        required: true,
        items: { type: 'object', description: 'Processor configuration' },
      },
      result_map: {
        type: 'bloblang',
        description: 'Mapping to merge result back into original message',
        required: false,
        default: 'root = this',
      },
    },
    examples: [
      `pipeline:
  processors:
    - branch:
        request_map: 'root = this.user_id'
        processors:
          - http:
              url: http://api.example.com/users/\${! content() }
        result_map: 'root.user = this'`,
    ],
  },

  log: {
    name: 'log',
    description: 'Logs message content or metadata for debugging.',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/log',
    fields: {
      level: {
        type: 'string',
        description: 'Log level',
        required: false,
        default: 'INFO',
        enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'],
      },
      message: {
        type: 'interpolated_string',
        description: 'Log message template',
        required: true,
        examples: ['Processing message: ${! content() }', 'Received ID: ${! this.id }'],
      },
      fields_mapping: {
        type: 'bloblang',
        description: 'Mapping to extract structured log fields',
        required: false,
      },
    },
  },

  cache: {
    name: 'cache',
    description: 'Performs cache operations (get, set, delete, etc.).',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/cache',
    fields: {
      resource: {
        type: 'string',
        description: 'Cache resource name defined in resources section',
        required: true,
      },
      operator: {
        type: 'string',
        description: 'Cache operation to perform',
        required: true,
        enum: ['get', 'set', 'add', 'delete', 'keys'],
      },
      key: {
        type: 'interpolated_string',
        description: 'Cache key',
        required: true,
        examples: ['${! this.id }', 'user:${! @user_id }'],
      },
      value: {
        type: 'interpolated_string',
        description: 'Value to set (for set/add operations)',
        required: false,
      },
      ttl: {
        type: 'duration',
        description: 'Time-to-live for cached value',
        required: false,
      },
    },
  },

  switch: {
    name: 'switch',
    description: 'Routes messages to different processors based on conditions.',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/switch',
    fields: {
      '': {
        type: 'array',
        description: 'List of case conditions and their processors',
        required: true,
        items: {
          type: 'object',
          description: 'Switch case',
          properties: {
            check: {
              type: 'bloblang',
              description: 'Condition to match',
              required: false,
            },
            processors: {
              type: 'array',
              description: 'Processors to run if condition matches',
            },
          },
        },
      },
    },
  },

  try: {
    name: 'try',
    description: 'Wraps processors and catches errors.',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/try',
    fields: {
      '': {
        type: 'array',
        description: 'List of processors to attempt',
        required: true,
        items: { type: 'object', description: 'Processor configuration' },
      },
    },
  },

  catch: {
    name: 'catch',
    description: 'Handles errors from try processor.',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/catch',
    fields: {
      '': {
        type: 'array',
        description: 'List of processors to run on error',
        required: true,
        items: { type: 'object', description: 'Processor configuration' },
      },
    },
  },

  sleep: {
    name: 'sleep',
    description: 'Pauses processing for a specified duration.',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/sleep',
    fields: {
      duration: {
        type: 'interpolated_string',
        description: 'Duration to sleep',
        required: true,
        examples: ['1s', '${! this.delay }ms'],
      },
    },
  },

  compress: {
    name: 'compress',
    description: 'Compresses message content using various algorithms.',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/compress',
    fields: {
      algorithm: {
        type: 'string',
        description: 'Compression algorithm',
        required: true,
        enum: ['gzip', 'zlib', 'flate', 'snappy', 'lz4', 'zstd'],
      },
      level: {
        type: 'number',
        description: 'Compression level (algorithm-dependent)',
        required: false,
        default: -1,
      },
    },
  },

  decompress: {
    name: 'decompress',
    description: 'Decompresses message content.',
    category: 'processor',
    docs_url: 'https://docs.expanso.io/components/processors/decompress',
    fields: {
      algorithm: {
        type: 'string',
        description: 'Decompression algorithm',
        required: true,
        enum: ['gzip', 'zlib', 'flate', 'snappy', 'lz4', 'zstd'],
      },
    },
  },
};

// ============================================================================
// Output Component Schemas
// ============================================================================

const OUTPUT_SCHEMAS: Record<string, ComponentSchema> = {
  kafka: {
    name: 'kafka',
    description: 'Publishes messages to Kafka topics.',
    category: 'output',
    docs_url: 'https://docs.expanso.io/components/outputs/kafka',
    fields: {
      addresses: {
        type: 'array',
        description: 'List of Kafka broker addresses',
        required: true,
        items: { type: 'string', description: 'Broker address' },
      },
      topic: {
        type: 'interpolated_string',
        description: 'Topic to publish to',
        required: true,
        examples: ['my-topic', '${! @topic }', 'events-${! this.type }'],
      },
      key: {
        type: 'interpolated_string',
        description: 'Message key for partitioning',
        required: false,
        examples: ['${! this.id }', '${! @partition_key }'],
      },
      partitioner: {
        type: 'string',
        description: 'Partitioning strategy',
        required: false,
        default: 'fnv1a_hash',
        enum: ['fnv1a_hash', 'murmur2_hash', 'random', 'round_robin', 'manual'],
      },
      compression: {
        type: 'string',
        description: 'Message compression',
        required: false,
        default: 'none',
        enum: ['none', 'snappy', 'lz4', 'gzip', 'zstd'],
      },
      max_in_flight: {
        type: 'number',
        description: 'Maximum in-flight requests',
        required: false,
        default: 64,
      },
      tls: {
        type: 'object',
        description: 'TLS configuration',
        required: false,
        properties: {
          enabled: { type: 'boolean', description: 'Enable TLS' },
          skip_cert_verify: { type: 'boolean', description: 'Skip certificate verification' },
        },
      },
      sasl: {
        type: 'object',
        description: 'SASL authentication',
        required: false,
        properties: {
          mechanism: { type: 'string', description: 'SASL mechanism', enum: ['PLAIN', 'SCRAM-SHA-256', 'SCRAM-SHA-512'] },
          user: { type: 'string', description: 'Username' },
          password: { type: 'string', description: 'Password' },
        },
      },
    },
  },

  aws_s3: {
    name: 'aws_s3',
    description: 'Uploads messages as objects to an S3 bucket.',
    category: 'output',
    docs_url: 'https://docs.expanso.io/components/outputs/aws_s3',
    fields: {
      bucket: {
        type: 'interpolated_string',
        description: 'S3 bucket name',
        required: true,
      },
      path: {
        type: 'interpolated_string',
        description: 'Object key/path',
        required: false,
        default: '${!count("files")}-${!timestamp_unix_nano()}.txt',
        examples: ['${! uuid_v4() }.json', 'data/${! now().format("2006/01/02") }/${! uuid_v4() }.json'],
      },
      content_type: {
        type: 'interpolated_string',
        description: 'Object content type',
        required: false,
        default: 'application/octet-stream',
      },
      region: {
        type: 'string',
        description: 'AWS region',
        required: false,
        default: 'us-east-1',
      },
      credentials: {
        type: 'object',
        description: 'AWS credentials',
        required: false,
        properties: {
          profile: { type: 'string', description: 'AWS profile name' },
          id: { type: 'string', description: 'Access key ID' },
          secret: { type: 'string', description: 'Secret access key' },
          role: { type: 'string', description: 'IAM role ARN to assume' },
        },
      },
      batching: {
        type: 'object',
        description: 'Batching configuration for multi-object writes',
        required: false,
        properties: {
          count: { type: 'number', description: 'Batch size', default: 0 },
          period: { type: 'duration', description: 'Batch period', default: '' },
          byte_size: { type: 'number', description: 'Batch byte limit', default: 0 },
        },
      },
    },
  },

  http_client: {
    name: 'http_client',
    description: 'Sends messages to an HTTP endpoint.',
    category: 'output',
    docs_url: 'https://docs.expanso.io/components/outputs/http_client',
    fields: {
      url: {
        type: 'interpolated_string',
        description: 'HTTP URL to send messages to',
        required: true,
        examples: ['http://api.example.com/events', 'http://localhost:8080/ingest'],
      },
      verb: {
        type: 'string',
        description: 'HTTP method',
        required: false,
        default: 'POST',
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
      headers: {
        type: 'object',
        description: 'HTTP headers',
        required: false,
      },
      timeout: {
        type: 'duration',
        description: 'Request timeout',
        required: false,
        default: '5s',
      },
      retries: {
        type: 'number',
        description: 'Number of retries on failure',
        required: false,
        default: 3,
      },
      retry_period: {
        type: 'duration',
        description: 'Base retry delay',
        required: false,
        default: '1s',
      },
      max_retry_backoff: {
        type: 'duration',
        description: 'Maximum retry backoff',
        required: false,
        default: '300s',
      },
      batching: {
        type: 'object',
        description: 'Batching configuration',
        required: false,
        properties: {
          count: { type: 'number', description: 'Batch size' },
          period: { type: 'duration', description: 'Batch period' },
        },
      },
    },
  },

  stdout: {
    name: 'stdout',
    description: 'Writes messages to standard output.',
    category: 'output',
    docs_url: 'https://docs.expanso.io/components/outputs/stdout',
    fields: {
      codec: {
        type: 'string',
        description: 'Output codec',
        required: false,
        default: 'lines',
        enum: ['lines', 'all-bytes', 'delim:X'],
      },
    },
  },

  drop: {
    name: 'drop',
    description: 'Drops all messages (useful for testing or routing).',
    category: 'output',
    docs_url: 'https://docs.expanso.io/components/outputs/drop',
    fields: {},
  },

  nats: {
    name: 'nats',
    description: 'Publishes messages to NATS subjects.',
    category: 'output',
    docs_url: 'https://docs.expanso.io/components/outputs/nats',
    fields: {
      urls: {
        type: 'array',
        description: 'List of NATS server URLs',
        required: true,
        items: { type: 'string', description: 'NATS URL' },
      },
      subject: {
        type: 'interpolated_string',
        description: 'NATS subject to publish to',
        required: true,
        examples: ['events.${! this.type }', 'orders.created'],
      },
    },
  },

  mongodb: {
    name: 'mongodb',
    description: 'Writes documents to MongoDB collections.',
    category: 'output',
    docs_url: 'https://docs.expanso.io/components/outputs/mongodb',
    fields: {
      url: {
        type: 'string',
        description: 'MongoDB connection URL',
        required: true,
        examples: ['mongodb://localhost:27017', 'mongodb+srv://user:pass@cluster.mongodb.net'],
      },
      database: {
        type: 'string',
        description: 'Database name',
        required: true,
      },
      collection: {
        type: 'interpolated_string',
        description: 'Collection name',
        required: true,
      },
      operation: {
        type: 'string',
        description: 'MongoDB operation',
        required: false,
        default: 'insert-one',
        enum: ['insert-one', 'update-one', 'replace-one', 'delete-one', 'upsert'],
      },
      document_map: {
        type: 'bloblang',
        description: 'Mapping to create the document',
        required: false,
        default: 'root = this',
      },
      filter_map: {
        type: 'bloblang',
        description: 'Mapping to create filter for update/delete',
        required: false,
      },
    },
  },

  elasticsearch_v8: {
    name: 'elasticsearch_v8',
    description: 'Indexes documents in Elasticsearch.',
    category: 'output',
    docs_url: 'https://docs.expanso.io/components/outputs/elasticsearch_v8',
    fields: {
      urls: {
        type: 'array',
        description: 'Elasticsearch cluster URLs',
        required: true,
        items: { type: 'string', description: 'URL' },
      },
      index: {
        type: 'interpolated_string',
        description: 'Index name',
        required: true,
        examples: ['logs-${! now().format("2006.01.02") }'],
      },
      id: {
        type: 'interpolated_string',
        description: 'Document ID',
        required: false,
      },
      action: {
        type: 'string',
        description: 'Index action',
        required: false,
        default: 'index',
        enum: ['index', 'create', 'update', 'upsert', 'delete'],
      },
    },
  },
};

// ============================================================================
// Category-specific Registries (to handle components that exist in multiple categories)
// ============================================================================

const SCHEMAS_BY_CATEGORY: Record<ComponentCategory, Record<string, ComponentSchema>> = {
  input: INPUT_SCHEMAS,
  processor: PROCESSOR_SCHEMAS,
  output: OUTPUT_SCHEMAS,
  cache: {},
  rate_limit: {},
  buffer: {},
};

/**
 * Combined registry - note: for components that exist in multiple categories
 * (e.g., kafka as input and output), we store both with unique keys
 */
export const COMPONENT_SCHEMAS: Record<string, ComponentSchema> = {};

// Build combined registry with unique keys for duplicates
for (const [category, schemas] of Object.entries(SCHEMAS_BY_CATEGORY)) {
  for (const [name, schema] of Object.entries(schemas)) {
    // Check if already exists from another category
    if (COMPONENT_SCHEMAS[name]) {
      // Use category-suffixed key for the duplicate
      COMPONENT_SCHEMAS[`${name}_${category}`] = schema;
    } else {
      COMPONENT_SCHEMAS[name] = schema;
    }
  }
}

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Get schema for a specific component by name, optionally filtered by category
 * If category is specified, looks up directly in that category's registry
 * Otherwise, returns the first match found
 */
export function getComponentSchema(
  name: string,
  category?: ComponentCategory
): ComponentSchema | undefined {
  if (category) {
    return SCHEMAS_BY_CATEGORY[category]?.[name];
  }
  // Check all categories, returning first match
  for (const catSchemas of Object.values(SCHEMAS_BY_CATEGORY)) {
    if (catSchemas[name]) {
      return catSchemas[name];
    }
  }
  return undefined;
}

/**
 * Get all component schemas for a category
 */
export function getSchemasByCategory(category: ComponentCategory): ComponentSchema[] {
  return Object.values(SCHEMAS_BY_CATEGORY[category] || {});
}

/**
 * List all available component names by category
 */
export function listComponentNames(category?: ComponentCategory): string[] {
  if (category) {
    return Object.keys(SCHEMAS_BY_CATEGORY[category] || {});
  }
  // Return unique names across all categories
  const allNames = new Set<string>();
  for (const schemas of Object.values(SCHEMAS_BY_CATEGORY)) {
    for (const name of Object.keys(schemas)) {
      allNames.add(name);
    }
  }
  return Array.from(allNames);
}

/**
 * Search components by name or description
 */
export function searchComponents(query: string): ComponentSchema[] {
  const lowerQuery = query.toLowerCase();
  const results: ComponentSchema[] = [];
  const seen = new Set<string>();

  for (const schemas of Object.values(SCHEMAS_BY_CATEGORY)) {
    for (const schema of Object.values(schemas)) {
      const key = `${schema.name}-${schema.category}`;
      if (seen.has(key)) continue;

      if (
        schema.name.toLowerCase().includes(lowerQuery) ||
        schema.description.toLowerCase().includes(lowerQuery)
      ) {
        results.push(schema);
        seen.add(key);
      }
    }
  }
  return results;
}

/**
 * Format a component schema as a human-readable string
 */
export function formatComponentSchema(schema: ComponentSchema): string {
  const lines: string[] = [];

  lines.push(`# ${schema.name}`);
  lines.push(`Category: ${schema.category}`);
  lines.push(`Description: ${schema.description}`);
  if (schema.docs_url) {
    lines.push(`Documentation: ${schema.docs_url}`);
  }
  lines.push('');
  lines.push('## Fields');
  lines.push('');

  for (const [fieldName, field] of Object.entries(schema.fields)) {
    const displayName = fieldName || '(value)';
    const requiredMark = field.required ? ' (required)' : '';
    lines.push(`### ${displayName}${requiredMark}`);
    lines.push(`Type: ${field.type}`);
    lines.push(field.description);
    if (field.default !== undefined) {
      lines.push(`Default: ${JSON.stringify(field.default)}`);
    }
    if (field.enum) {
      lines.push(`Values: ${field.enum.join(', ')}`);
    }
    if (field.examples) {
      lines.push(`Examples: ${JSON.stringify(field.examples)}`);
    }
    lines.push('');
  }

  if (schema.examples && schema.examples.length > 0) {
    lines.push('## Example Usage');
    lines.push('');
    for (const example of schema.examples) {
      lines.push('```yaml');
      lines.push(example);
      lines.push('```');
      lines.push('');
    }
  }

  return lines.join('\n');
}
