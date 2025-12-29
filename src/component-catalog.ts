/**
 * Component Catalog
 *
 * Lightweight catalog of all Expanso/Benthos/Redpanda Connect components
 * for the list_components MCP tool. Provides discovery by category, tag, and search.
 *
 * Tags: messaging, cloud, database, http, file, ai, transform, utility, observability
 * Status: stable (production ready), beta (feature complete, testing), experimental (early development)
 */

// ============================================================================
// Types
// ============================================================================

export type ComponentCategory = 'input' | 'processor' | 'output' | 'cache' | 'buffer';

export type ComponentTag =
  | 'messaging'
  | 'cloud'
  | 'database'
  | 'http'
  | 'file'
  | 'ai'
  | 'transform'
  | 'utility'
  | 'observability'
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'streaming';

export type ComponentStatus = 'stable' | 'beta' | 'experimental';

export interface CatalogEntry {
  name: string;
  category: ComponentCategory;
  description: string;
  tags: ComponentTag[];
  status: ComponentStatus;
}

// ============================================================================
// Input Components
// ============================================================================

const INPUT_CATALOG: CatalogEntry[] = [
  // Messaging
  { name: 'amqp_0_9', category: 'input', description: 'Consume from AMQP 0.9.1 queues (RabbitMQ)', tags: ['messaging'], status: 'stable' },
  { name: 'amqp_1', category: 'input', description: 'Consume from AMQP 1.0 queues', tags: ['messaging'], status: 'stable' },
  { name: 'kafka', category: 'input', description: 'Consume from Kafka topics', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'kafka_franz', category: 'input', description: 'High-performance Kafka consumer using franz-go', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'nats', category: 'input', description: 'Subscribe to NATS subjects', tags: ['messaging'], status: 'stable' },
  { name: 'nats_jetstream', category: 'input', description: 'Consume from NATS JetStream streams', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'nats_kv', category: 'input', description: 'Watch NATS Key-Value store changes', tags: ['messaging', 'database'], status: 'stable' },
  { name: 'nats_stream', category: 'input', description: 'Consume from legacy NATS Streaming', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'nsq', category: 'input', description: 'Consume from NSQ topics', tags: ['messaging'], status: 'stable' },
  { name: 'pulsar', category: 'input', description: 'Consume from Apache Pulsar topics', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'redis_list', category: 'input', description: 'Pop messages from Redis lists', tags: ['messaging', 'database'], status: 'stable' },
  { name: 'redis_pubsub', category: 'input', description: 'Subscribe to Redis Pub/Sub channels', tags: ['messaging'], status: 'stable' },
  { name: 'redis_scan', category: 'input', description: 'Scan and read Redis keys', tags: ['database'], status: 'stable' },
  { name: 'redis_streams', category: 'input', description: 'Consume from Redis Streams', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'redpanda', category: 'input', description: 'Consume from Redpanda topics', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'redpanda_common', category: 'input', description: 'Shared Redpanda configuration input', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'redpanda_migrator', category: 'input', description: 'Migrate data from Redpanda clusters', tags: ['messaging', 'utility'], status: 'beta' },
  { name: 'mqtt', category: 'input', description: 'Subscribe to MQTT topics', tags: ['messaging'], status: 'stable' },
  { name: 'ockam_kafka', category: 'input', description: 'Secure Kafka consumption via Ockam', tags: ['messaging', 'streaming'], status: 'beta' },
  { name: 'beanstalkd', category: 'input', description: 'Reserve jobs from Beanstalkd queues', tags: ['messaging'], status: 'stable' },

  // Cloud Storage
  { name: 'aws_s3', category: 'input', description: 'Read objects from AWS S3 buckets', tags: ['cloud', 'aws', 'file'], status: 'stable' },
  { name: 'aws_kinesis', category: 'input', description: 'Consume from AWS Kinesis streams', tags: ['cloud', 'aws', 'streaming'], status: 'stable' },
  { name: 'aws_sqs', category: 'input', description: 'Receive messages from AWS SQS queues', tags: ['cloud', 'aws', 'messaging'], status: 'stable' },
  { name: 'gcp_cloud_storage', category: 'input', description: 'Read objects from Google Cloud Storage', tags: ['cloud', 'gcp', 'file'], status: 'stable' },
  { name: 'gcp_pubsub', category: 'input', description: 'Subscribe to Google Cloud Pub/Sub', tags: ['cloud', 'gcp', 'messaging'], status: 'stable' },
  { name: 'gcp_bigquery_select', category: 'input', description: 'Query data from Google BigQuery', tags: ['cloud', 'gcp', 'database'], status: 'stable' },
  { name: 'azure_blob_storage', category: 'input', description: 'Read blobs from Azure Storage', tags: ['cloud', 'azure', 'file'], status: 'stable' },
  { name: 'azure_queue_storage', category: 'input', description: 'Receive from Azure Queue Storage', tags: ['cloud', 'azure', 'messaging'], status: 'stable' },
  { name: 'azure_table_storage', category: 'input', description: 'Query Azure Table Storage', tags: ['cloud', 'azure', 'database'], status: 'stable' },
  { name: 'azure_cosmosdb', category: 'input', description: 'Query Azure Cosmos DB change feed', tags: ['cloud', 'azure', 'database'], status: 'stable' },

  // Databases
  { name: 'mongodb', category: 'input', description: 'Query documents from MongoDB', tags: ['database'], status: 'stable' },
  { name: 'mongodb_cdc', category: 'input', description: 'Capture MongoDB change stream events', tags: ['database', 'streaming'], status: 'stable' },
  { name: 'cassandra', category: 'input', description: 'Query data from Apache Cassandra', tags: ['database'], status: 'stable' },
  { name: 'sql_raw', category: 'input', description: 'Execute raw SQL queries', tags: ['database'], status: 'stable' },
  { name: 'sql_select', category: 'input', description: 'Run SQL SELECT queries', tags: ['database'], status: 'stable' },
  { name: 'mysql_cdc', category: 'input', description: 'Capture MySQL change data events', tags: ['database', 'streaming'], status: 'stable' },
  { name: 'postgres_cdc', category: 'input', description: 'Capture PostgreSQL change data events', tags: ['database', 'streaming'], status: 'stable' },
  { name: 'cockroachdb_changefeed', category: 'input', description: 'Consume CockroachDB changefeeds', tags: ['database', 'streaming'], status: 'stable' },
  { name: 'gcp_spanner_cdc', category: 'input', description: 'Capture Google Spanner change streams', tags: ['cloud', 'gcp', 'database', 'streaming'], status: 'beta' },
  { name: 'tigerbeetle_cdc', category: 'input', description: 'Capture TigerBeetle change events', tags: ['database', 'streaming'], status: 'experimental' },
  { name: 'microsoft_sql_server_cdc', category: 'input', description: 'Capture SQL Server change data events', tags: ['database', 'streaming'], status: 'stable' },

  // Files
  { name: 'file', category: 'input', description: 'Read messages from files on disk', tags: ['file'], status: 'stable' },
  { name: 'csv', category: 'input', description: 'Parse CSV files into messages', tags: ['file', 'transform'], status: 'stable' },
  { name: 'parquet', category: 'input', description: 'Read Apache Parquet files', tags: ['file'], status: 'stable' },
  { name: 'stdin', category: 'input', description: 'Read messages from standard input', tags: ['utility'], status: 'stable' },
  { name: 'sftp', category: 'input', description: 'Download files via SFTP', tags: ['file'], status: 'stable' },
  { name: 'hdfs', category: 'input', description: 'Read files from Hadoop HDFS', tags: ['file'], status: 'stable' },
  { name: 'git', category: 'input', description: 'Clone and read from Git repositories', tags: ['file', 'utility'], status: 'beta' },

  // HTTP/Network
  { name: 'http_client', category: 'input', description: 'Poll HTTP endpoints for data', tags: ['http'], status: 'stable' },
  { name: 'http_server', category: 'input', description: 'HTTP server for webhooks and APIs', tags: ['http'], status: 'stable' },
  { name: 'websocket', category: 'input', description: 'Receive messages via WebSocket', tags: ['http', 'streaming'], status: 'stable' },
  { name: 'socket', category: 'input', description: 'Read from TCP/UDP sockets', tags: ['utility'], status: 'stable' },
  { name: 'socket_server', category: 'input', description: 'Listen on TCP/UDP sockets', tags: ['utility'], status: 'stable' },
  { name: 'nanomsg', category: 'input', description: 'Receive via nanomsg protocol', tags: ['messaging'], status: 'stable' },
  { name: 'zmq4', category: 'input', description: 'Receive via ZeroMQ sockets', tags: ['messaging'], status: 'stable' },

  // Utility
  { name: 'generate', category: 'input', description: 'Generate messages using Bloblang', tags: ['utility'], status: 'stable' },
  { name: 'inproc', category: 'input', description: 'Receive from in-process channel', tags: ['utility'], status: 'stable' },
  { name: 'resource', category: 'input', description: 'Reference a resource input', tags: ['utility'], status: 'stable' },
  { name: 'broker', category: 'input', description: 'Fan-in from multiple inputs', tags: ['utility'], status: 'stable' },
  { name: 'dynamic', category: 'input', description: 'Dynamically managed inputs', tags: ['utility'], status: 'stable' },
  { name: 'batched', category: 'input', description: 'Batch multiple inputs together', tags: ['utility'], status: 'stable' },
  { name: 'read_until', category: 'input', description: 'Read until a condition is met', tags: ['utility'], status: 'stable' },
  { name: 'sequence', category: 'input', description: 'Read inputs in sequence', tags: ['utility'], status: 'stable' },
  { name: 'subprocess', category: 'input', description: 'Read from subprocess stdout', tags: ['utility'], status: 'stable' },

  // Other
  { name: 'discord', category: 'input', description: 'Receive Discord bot messages', tags: ['messaging'], status: 'beta' },
  { name: 'splunk', category: 'input', description: 'Query Splunk for events', tags: ['observability'], status: 'stable' },
  { name: 'twitter_search', category: 'input', description: 'Search Twitter/X for tweets', tags: ['http'], status: 'experimental' },
  { name: 'spicedb_watch', category: 'input', description: 'Watch SpiceDB permission changes', tags: ['database'], status: 'beta' },
  { name: 'timeplus', category: 'input', description: 'Stream from Timeplus', tags: ['streaming', 'database'], status: 'beta' },
  { name: 'schema_registry', category: 'input', description: 'Fetch schemas from Schema Registry', tags: ['utility', 'streaming'], status: 'stable' },
];

// ============================================================================
// Processor Components
// ============================================================================

const PROCESSOR_CATALOG: CatalogEntry[] = [
  // Data Transformation
  { name: 'mapping', category: 'processor', description: 'Transform messages using Bloblang', tags: ['transform'], status: 'stable' },
  { name: 'bloblang', category: 'processor', description: 'Execute Bloblang expressions', tags: ['transform'], status: 'stable' },
  { name: 'jq', category: 'processor', description: 'Transform JSON using jq queries', tags: ['transform'], status: 'stable' },
  { name: 'jmespath', category: 'processor', description: 'Query JSON with JMESPath', tags: ['transform'], status: 'stable' },
  { name: 'awk', category: 'processor', description: 'Process text using AWK', tags: ['transform'], status: 'stable' },
  { name: 'javascript', category: 'processor', description: 'Execute JavaScript code', tags: ['transform'], status: 'beta' },
  { name: 'mutation', category: 'processor', description: 'Mutate message fields', tags: ['transform'], status: 'stable' },
  { name: 'xml', category: 'processor', description: 'Parse and query XML documents', tags: ['transform'], status: 'stable' },
  { name: 'json_schema', category: 'processor', description: 'Validate JSON against schemas', tags: ['transform'], status: 'stable' },
  { name: 'protobuf', category: 'processor', description: 'Encode/decode Protocol Buffers', tags: ['transform'], status: 'stable' },
  { name: 'msgpack', category: 'processor', description: 'Encode/decode MessagePack', tags: ['transform'], status: 'stable' },
  { name: 'avro', category: 'processor', description: 'Encode/decode Apache Avro', tags: ['transform'], status: 'stable' },
  { name: 'grok', category: 'processor', description: 'Parse unstructured text with Grok', tags: ['transform'], status: 'stable' },
  { name: 'parse_log', category: 'processor', description: 'Parse common log formats', tags: ['transform', 'observability'], status: 'stable' },

  // Encoding/Compression
  { name: 'compress', category: 'processor', description: 'Compress message content', tags: ['transform'], status: 'stable' },
  { name: 'decompress', category: 'processor', description: 'Decompress message content', tags: ['transform'], status: 'stable' },
  { name: 'archive', category: 'processor', description: 'Archive messages into tar/zip', tags: ['transform', 'file'], status: 'stable' },
  { name: 'unarchive', category: 'processor', description: 'Extract messages from archives', tags: ['transform', 'file'], status: 'stable' },
  { name: 'parquet_encode', category: 'processor', description: 'Encode messages as Parquet', tags: ['transform', 'file'], status: 'stable' },
  { name: 'parquet_decode', category: 'processor', description: 'Decode Parquet to messages', tags: ['transform', 'file'], status: 'stable' },
  { name: 'schema_registry_encode', category: 'processor', description: 'Encode with Schema Registry', tags: ['transform', 'streaming'], status: 'stable' },
  { name: 'schema_registry_decode', category: 'processor', description: 'Decode with Schema Registry', tags: ['transform', 'streaming'], status: 'stable' },

  // Flow Control
  { name: 'branch', category: 'processor', description: 'Branch and merge processing flows', tags: ['utility'], status: 'stable' },
  { name: 'switch', category: 'processor', description: 'Route messages by conditions', tags: ['utility'], status: 'stable' },
  { name: 'try', category: 'processor', description: 'Wrap processors with error handling', tags: ['utility'], status: 'stable' },
  { name: 'catch', category: 'processor', description: 'Handle errors from try blocks', tags: ['utility'], status: 'stable' },
  { name: 'retry', category: 'processor', description: 'Retry failed processors', tags: ['utility'], status: 'stable' },
  { name: 'while', category: 'processor', description: 'Loop while condition is true', tags: ['utility'], status: 'stable' },
  { name: 'for_each', category: 'processor', description: 'Process each item in arrays', tags: ['utility'], status: 'stable' },
  { name: 'parallel', category: 'processor', description: 'Execute processors in parallel', tags: ['utility'], status: 'stable' },
  { name: 'workflow', category: 'processor', description: 'Execute DAG workflows', tags: ['utility'], status: 'stable' },
  { name: 'processors', category: 'processor', description: 'Group processors sequentially', tags: ['utility'], status: 'stable' },
  { name: 'group_by', category: 'processor', description: 'Group messages by key', tags: ['utility'], status: 'stable' },
  { name: 'group_by_value', category: 'processor', description: 'Group messages by value', tags: ['utility'], status: 'stable' },

  // Filtering/Routing
  { name: 'bounds_check', category: 'processor', description: 'Reject messages outside bounds', tags: ['utility'], status: 'stable' },
  { name: 'dedupe', category: 'processor', description: 'Deduplicate messages by key', tags: ['utility'], status: 'stable' },
  { name: 'select_parts', category: 'processor', description: 'Select specific message parts', tags: ['utility'], status: 'stable' },
  { name: 'insert_part', category: 'processor', description: 'Insert new message parts', tags: ['utility'], status: 'stable' },
  { name: 'split', category: 'processor', description: 'Split messages into multiple', tags: ['utility'], status: 'stable' },

  // Caching/State
  { name: 'cache', category: 'processor', description: 'Get/set values in caches', tags: ['utility', 'database'], status: 'stable' },
  { name: 'cached', category: 'processor', description: 'Cache processor results', tags: ['utility'], status: 'stable' },
  { name: 'rate_limit', category: 'processor', description: 'Apply rate limiting', tags: ['utility'], status: 'stable' },

  // External Services - HTTP
  { name: 'http', category: 'processor', description: 'Make HTTP requests', tags: ['http'], status: 'stable' },
  { name: 'subprocess', category: 'processor', description: 'Execute external commands', tags: ['utility'], status: 'stable' },
  { name: 'command', category: 'processor', description: 'Run shell commands on messages', tags: ['utility'], status: 'stable' },

  // External Services - AWS
  { name: 'aws_lambda', category: 'processor', description: 'Invoke AWS Lambda functions', tags: ['cloud', 'aws'], status: 'stable' },

  // External Services - Databases
  { name: 'redis', category: 'processor', description: 'Execute Redis commands', tags: ['database'], status: 'stable' },
  { name: 'redis_script', category: 'processor', description: 'Run Redis Lua scripts', tags: ['database'], status: 'stable' },
  { name: 'sql_insert', category: 'processor', description: 'Insert data into SQL databases', tags: ['database'], status: 'stable' },
  { name: 'sql_raw', category: 'processor', description: 'Execute raw SQL queries', tags: ['database'], status: 'stable' },
  { name: 'sql_select', category: 'processor', description: 'Run SQL SELECT queries', tags: ['database'], status: 'stable' },
  { name: 'couchbase', category: 'processor', description: 'Execute Couchbase operations', tags: ['database'], status: 'stable' },
  { name: 'azure_cosmosdb', category: 'processor', description: 'Query Azure Cosmos DB', tags: ['cloud', 'azure', 'database'], status: 'stable' },
  { name: 'mongodb', category: 'processor', description: 'Execute MongoDB operations', tags: ['database'], status: 'stable' },
  { name: 'nats_kv', category: 'processor', description: 'Read/write NATS Key-Value', tags: ['messaging', 'database'], status: 'stable' },
  { name: 'nats_request_reply', category: 'processor', description: 'NATS request-reply pattern', tags: ['messaging'], status: 'stable' },
  { name: 'jira', category: 'processor', description: 'Create/update Jira issues', tags: ['http'], status: 'beta' },
  { name: 'aws_dynamodb_partiql', category: 'processor', description: 'Query DynamoDB with PartiQL', tags: ['cloud', 'aws', 'database'], status: 'stable' },
  { name: 'gcp_bigquery_select', category: 'processor', description: 'Query Google BigQuery', tags: ['cloud', 'gcp', 'database'], status: 'stable' },

  // AI/ML
  { name: 'aws_bedrock_chat', category: 'processor', description: 'Chat with AWS Bedrock models', tags: ['ai', 'cloud', 'aws'], status: 'stable' },
  { name: 'aws_bedrock_embeddings', category: 'processor', description: 'Generate embeddings with Bedrock', tags: ['ai', 'cloud', 'aws'], status: 'stable' },
  { name: 'cohere_chat', category: 'processor', description: 'Chat with Cohere models', tags: ['ai'], status: 'stable' },
  { name: 'cohere_embeddings', category: 'processor', description: 'Generate Cohere embeddings', tags: ['ai'], status: 'stable' },
  { name: 'cohere_rerank', category: 'processor', description: 'Rerank results with Cohere', tags: ['ai'], status: 'stable' },
  { name: 'gcp_vertex_ai_chat', category: 'processor', description: 'Chat with Vertex AI models', tags: ['ai', 'cloud', 'gcp'], status: 'stable' },
  { name: 'gcp_vertex_ai_embeddings', category: 'processor', description: 'Generate Vertex AI embeddings', tags: ['ai', 'cloud', 'gcp'], status: 'stable' },
  { name: 'ollama_embeddings', category: 'processor', description: 'Generate embeddings with Ollama', tags: ['ai'], status: 'stable' },
  { name: 'ollama_chat', category: 'processor', description: 'Chat with Ollama models', tags: ['ai'], status: 'stable' },
  { name: 'ollama_moderation', category: 'processor', description: 'Content moderation with Ollama', tags: ['ai'], status: 'beta' },
  { name: 'openai_chat_completion', category: 'processor', description: 'Chat with OpenAI models', tags: ['ai'], status: 'stable' },
  { name: 'openai_embeddings', category: 'processor', description: 'Generate OpenAI embeddings', tags: ['ai'], status: 'stable' },
  { name: 'openai_image_generation', category: 'processor', description: 'Generate images with DALL-E', tags: ['ai'], status: 'stable' },
  { name: 'openai_speech', category: 'processor', description: 'Text-to-speech with OpenAI', tags: ['ai'], status: 'stable' },
  { name: 'openai_transcription', category: 'processor', description: 'Transcribe audio with Whisper', tags: ['ai'], status: 'stable' },
  { name: 'openai_translation', category: 'processor', description: 'Translate with OpenAI', tags: ['ai'], status: 'stable' },
  { name: 'qdrant', category: 'processor', description: 'Vector search with Qdrant', tags: ['ai', 'database'], status: 'stable' },
  { name: 'text_chunker', category: 'processor', description: 'Chunk text for LLM processing', tags: ['ai', 'transform'], status: 'stable' },

  // Google Drive
  { name: 'google_drive_download', category: 'processor', description: 'Download files from Google Drive', tags: ['cloud', 'gcp', 'file'], status: 'beta' },
  { name: 'google_drive_list_labels', category: 'processor', description: 'List Google Drive labels', tags: ['cloud', 'gcp'], status: 'beta' },
  { name: 'google_drive_search', category: 'processor', description: 'Search files in Google Drive', tags: ['cloud', 'gcp', 'file'], status: 'beta' },

  // Observability/Debug
  { name: 'log', category: 'processor', description: 'Log messages for debugging', tags: ['observability'], status: 'stable' },
  { name: 'metric', category: 'processor', description: 'Record custom metrics', tags: ['observability'], status: 'stable' },
  { name: 'benchmark', category: 'processor', description: 'Measure processor performance', tags: ['observability'], status: 'stable' },
  { name: 'sleep', category: 'processor', description: 'Pause processing for duration', tags: ['utility'], status: 'stable' },
  { name: 'crash', category: 'processor', description: 'Intentionally crash for testing', tags: ['utility'], status: 'stable' },

  // Utility
  { name: 'resource', category: 'processor', description: 'Reference a resource processor', tags: ['utility'], status: 'stable' },
  { name: 'sync_response', category: 'processor', description: 'Set synchronous response', tags: ['utility'], status: 'stable' },
  { name: 'wasm', category: 'processor', description: 'Execute WebAssembly modules', tags: ['transform'], status: 'beta' },
  { name: 'redpanda_data_transform', category: 'processor', description: 'Redpanda Data Transforms', tags: ['streaming', 'transform'], status: 'beta' },
];

// ============================================================================
// Output Components
// ============================================================================

const OUTPUT_CATALOG: CatalogEntry[] = [
  // Messaging
  { name: 'amqp_0_9', category: 'output', description: 'Publish to AMQP 0.9.1 queues', tags: ['messaging'], status: 'stable' },
  { name: 'amqp_1', category: 'output', description: 'Publish to AMQP 1.0 queues', tags: ['messaging'], status: 'stable' },
  { name: 'kafka', category: 'output', description: 'Produce to Kafka topics', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'kafka_franz', category: 'output', description: 'High-performance Kafka producer', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'nats', category: 'output', description: 'Publish to NATS subjects', tags: ['messaging'], status: 'stable' },
  { name: 'nats_jetstream', category: 'output', description: 'Publish to NATS JetStream', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'nats_kv', category: 'output', description: 'Write to NATS Key-Value store', tags: ['messaging', 'database'], status: 'stable' },
  { name: 'nats_stream', category: 'output', description: 'Publish to NATS Streaming', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'nsq', category: 'output', description: 'Publish to NSQ topics', tags: ['messaging'], status: 'stable' },
  { name: 'pulsar', category: 'output', description: 'Produce to Apache Pulsar', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'redis_list', category: 'output', description: 'Push to Redis lists', tags: ['messaging', 'database'], status: 'stable' },
  { name: 'redis_pubsub', category: 'output', description: 'Publish to Redis channels', tags: ['messaging'], status: 'stable' },
  { name: 'redis_streams', category: 'output', description: 'Write to Redis Streams', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'redis_hash', category: 'output', description: 'Write to Redis hashes', tags: ['database'], status: 'stable' },
  { name: 'redpanda', category: 'output', description: 'Produce to Redpanda topics', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'redpanda_common', category: 'output', description: 'Shared Redpanda output config', tags: ['messaging', 'streaming'], status: 'stable' },
  { name: 'redpanda_migrator', category: 'output', description: 'Migrate data to Redpanda', tags: ['messaging', 'utility'], status: 'beta' },
  { name: 'mqtt', category: 'output', description: 'Publish to MQTT topics', tags: ['messaging'], status: 'stable' },
  { name: 'ockam_kafka', category: 'output', description: 'Secure Kafka via Ockam', tags: ['messaging', 'streaming'], status: 'beta' },
  { name: 'beanstalkd', category: 'output', description: 'Put jobs in Beanstalkd', tags: ['messaging'], status: 'stable' },
  { name: 'pusher', category: 'output', description: 'Push to Pusher channels', tags: ['messaging', 'http'], status: 'stable' },

  // Cloud Storage
  { name: 'aws_s3', category: 'output', description: 'Upload objects to AWS S3', tags: ['cloud', 'aws', 'file'], status: 'stable' },
  { name: 'aws_kinesis', category: 'output', description: 'Put records to Kinesis', tags: ['cloud', 'aws', 'streaming'], status: 'stable' },
  { name: 'aws_kinesis_firehose', category: 'output', description: 'Send to Kinesis Firehose', tags: ['cloud', 'aws', 'streaming'], status: 'stable' },
  { name: 'aws_sqs', category: 'output', description: 'Send to AWS SQS queues', tags: ['cloud', 'aws', 'messaging'], status: 'stable' },
  { name: 'aws_sns', category: 'output', description: 'Publish to AWS SNS topics', tags: ['cloud', 'aws', 'messaging'], status: 'stable' },
  { name: 'aws_dynamodb', category: 'output', description: 'Write to DynamoDB tables', tags: ['cloud', 'aws', 'database'], status: 'stable' },
  { name: 'gcp_cloud_storage', category: 'output', description: 'Upload to Cloud Storage', tags: ['cloud', 'gcp', 'file'], status: 'stable' },
  { name: 'gcp_pubsub', category: 'output', description: 'Publish to Cloud Pub/Sub', tags: ['cloud', 'gcp', 'messaging'], status: 'stable' },
  { name: 'gcp_bigquery', category: 'output', description: 'Load data into BigQuery', tags: ['cloud', 'gcp', 'database'], status: 'stable' },
  { name: 'azure_blob_storage', category: 'output', description: 'Upload to Azure Blob Storage', tags: ['cloud', 'azure', 'file'], status: 'stable' },
  { name: 'azure_data_lake_gen2', category: 'output', description: 'Write to Azure Data Lake', tags: ['cloud', 'azure', 'file'], status: 'stable' },
  { name: 'azure_queue_storage', category: 'output', description: 'Send to Azure Queues', tags: ['cloud', 'azure', 'messaging'], status: 'stable' },
  { name: 'azure_table_storage', category: 'output', description: 'Insert to Azure Tables', tags: ['cloud', 'azure', 'database'], status: 'stable' },
  { name: 'azure_cosmosdb', category: 'output', description: 'Write to Cosmos DB', tags: ['cloud', 'azure', 'database'], status: 'stable' },

  // Databases
  { name: 'mongodb', category: 'output', description: 'Insert documents to MongoDB', tags: ['database'], status: 'stable' },
  { name: 'elasticsearch_v8', category: 'output', description: 'Index to Elasticsearch 8.x', tags: ['database'], status: 'stable' },
  { name: 'opensearch', category: 'output', description: 'Index to OpenSearch', tags: ['database'], status: 'stable' },
  { name: 'sql_insert', category: 'output', description: 'Insert into SQL databases', tags: ['database'], status: 'stable' },
  { name: 'sql_raw', category: 'output', description: 'Execute raw SQL statements', tags: ['database'], status: 'stable' },
  { name: 'couchbase', category: 'output', description: 'Write to Couchbase', tags: ['database'], status: 'stable' },
  { name: 'questdb', category: 'output', description: 'Write to QuestDB', tags: ['database'], status: 'stable' },
  { name: 'snowflake_put', category: 'output', description: 'Stage files to Snowflake', tags: ['cloud', 'database'], status: 'stable' },
  { name: 'snowflake_streaming', category: 'output', description: 'Stream to Snowflake', tags: ['cloud', 'database', 'streaming'], status: 'stable' },
  { name: 'cyborgdb', category: 'output', description: 'Write to CyborgDB', tags: ['database'], status: 'experimental' },
  { name: 'cypher', category: 'output', description: 'Execute Cypher queries (Neo4j)', tags: ['database'], status: 'stable' },

  // Vector DBs
  { name: 'pinecone', category: 'output', description: 'Upsert vectors to Pinecone', tags: ['ai', 'database'], status: 'stable' },
  { name: 'qdrant', category: 'output', description: 'Upsert vectors to Qdrant', tags: ['ai', 'database'], status: 'stable' },

  // Files
  { name: 'file', category: 'output', description: 'Write messages to files', tags: ['file'], status: 'stable' },
  { name: 'stdout', category: 'output', description: 'Write to standard output', tags: ['utility'], status: 'stable' },
  { name: 'sftp', category: 'output', description: 'Upload files via SFTP', tags: ['file'], status: 'stable' },
  { name: 'hdfs', category: 'output', description: 'Write to Hadoop HDFS', tags: ['file'], status: 'stable' },

  // HTTP/Network
  { name: 'http_client', category: 'output', description: 'Send HTTP requests', tags: ['http'], status: 'stable' },
  { name: 'http_server', category: 'output', description: 'HTTP server responses', tags: ['http'], status: 'stable' },
  { name: 'websocket', category: 'output', description: 'Send via WebSocket', tags: ['http', 'streaming'], status: 'stable' },
  { name: 'socket', category: 'output', description: 'Write to TCP/UDP sockets', tags: ['utility'], status: 'stable' },
  { name: 'nanomsg', category: 'output', description: 'Send via nanomsg', tags: ['messaging'], status: 'stable' },
  { name: 'zmq4', category: 'output', description: 'Send via ZeroMQ', tags: ['messaging'], status: 'stable' },

  // Observability
  { name: 'splunk_hec', category: 'output', description: 'Send to Splunk HEC', tags: ['observability'], status: 'stable' },

  // Utility
  { name: 'cache', category: 'output', description: 'Write to cache resources', tags: ['utility', 'database'], status: 'stable' },
  { name: 'drop', category: 'output', description: 'Drop/discard messages', tags: ['utility'], status: 'stable' },
  { name: 'drop_on', category: 'output', description: 'Drop messages conditionally', tags: ['utility'], status: 'stable' },
  { name: 'reject', category: 'output', description: 'Reject messages with error', tags: ['utility'], status: 'stable' },
  { name: 'reject_errored', category: 'output', description: 'Reject errored messages', tags: ['utility'], status: 'stable' },
  { name: 'inproc', category: 'output', description: 'Send to in-process channel', tags: ['utility'], status: 'stable' },
  { name: 'resource', category: 'output', description: 'Reference a resource output', tags: ['utility'], status: 'stable' },
  { name: 'broker', category: 'output', description: 'Fan-out to multiple outputs', tags: ['utility'], status: 'stable' },
  { name: 'dynamic', category: 'output', description: 'Dynamically managed outputs', tags: ['utility'], status: 'stable' },
  { name: 'fallback', category: 'output', description: 'Fallback to next output on error', tags: ['utility'], status: 'stable' },
  { name: 'retry', category: 'output', description: 'Retry failed outputs', tags: ['utility'], status: 'stable' },
  { name: 'switch', category: 'output', description: 'Route to outputs by condition', tags: ['utility'], status: 'stable' },
  { name: 'sync_response', category: 'output', description: 'Synchronous response output', tags: ['utility'], status: 'stable' },
  { name: 'subprocess', category: 'output', description: 'Pipe to subprocess stdin', tags: ['utility'], status: 'stable' },

  // Other
  { name: 'discord', category: 'output', description: 'Send Discord messages', tags: ['messaging'], status: 'beta' },
  { name: 'slack_reaction', category: 'output', description: 'Add Slack reactions', tags: ['messaging'], status: 'beta' },
  { name: 'timeplus', category: 'output', description: 'Stream to Timeplus', tags: ['streaming', 'database'], status: 'beta' },
  { name: 'schema_registry', category: 'output', description: 'Register schemas', tags: ['utility', 'streaming'], status: 'stable' },
];

// ============================================================================
// Combined Catalog
// ============================================================================

export const COMPONENT_CATALOG: CatalogEntry[] = [
  ...INPUT_CATALOG,
  ...PROCESSOR_CATALOG,
  ...OUTPUT_CATALOG,
];

// Build lookup indexes
const BY_CATEGORY = new Map<ComponentCategory, CatalogEntry[]>();
const BY_TAG = new Map<ComponentTag, CatalogEntry[]>();
const BY_NAME = new Map<string, CatalogEntry[]>();

for (const entry of COMPONENT_CATALOG) {
  // Index by category
  const catEntries = BY_CATEGORY.get(entry.category) || [];
  catEntries.push(entry);
  BY_CATEGORY.set(entry.category, catEntries);

  // Index by tags
  for (const tag of entry.tags) {
    const tagEntries = BY_TAG.get(tag) || [];
    tagEntries.push(entry);
    BY_TAG.set(tag, tagEntries);
  }

  // Index by name (may have multiple categories)
  const nameEntries = BY_NAME.get(entry.name) || [];
  nameEntries.push(entry);
  BY_NAME.set(entry.name, nameEntries);
}

// ============================================================================
// Query Functions
// ============================================================================

export interface ListComponentsOptions {
  category?: ComponentCategory | 'all';
  tag?: ComponentTag;
  search?: string;
}

export interface ListComponentsResult {
  category: string;
  count: number;
  components: CatalogEntry[];
}

/**
 * List components with optional filtering by category, tag, and search term.
 */
export function listComponents(options: ListComponentsOptions = {}): ListComponentsResult {
  const { category = 'all', tag, search } = options;

  let results: CatalogEntry[];

  // Start with category filter
  if (category === 'all') {
    results = [...COMPONENT_CATALOG];
  } else {
    results = BY_CATEGORY.get(category) || [];
  }

  // Apply tag filter
  if (tag) {
    const tagSet = new Set(BY_TAG.get(tag) || []);
    results = results.filter((e) => tagSet.has(e));
  }

  // Apply search filter (case-insensitive, matches name or description)
  if (search) {
    const lower = search.toLowerCase();
    results = results.filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        e.description.toLowerCase().includes(lower)
    );
  }

  // Sort by name for consistent output
  results.sort((a, b) => a.name.localeCompare(b.name));

  return {
    category: category === 'all' ? 'all' : category,
    count: results.length,
    components: results,
  };
}

/**
 * Get all available tags with their component counts.
 */
export function getAvailableTags(): Array<{ tag: ComponentTag; count: number }> {
  const tags: Array<{ tag: ComponentTag; count: number }> = [];
  for (const [tag, entries] of BY_TAG) {
    tags.push({ tag, count: entries.length });
  }
  return tags.sort((a, b) => b.count - a.count);
}

/**
 * Get component counts by category.
 */
export function getCategoryCounts(): Record<ComponentCategory, number> {
  return {
    input: BY_CATEGORY.get('input')?.length || 0,
    processor: BY_CATEGORY.get('processor')?.length || 0,
    output: BY_CATEGORY.get('output')?.length || 0,
    cache: BY_CATEGORY.get('cache')?.length || 0,
    buffer: BY_CATEGORY.get('buffer')?.length || 0,
  };
}

/**
 * Format a component list result as human-readable text.
 */
export function formatComponentList(result: ListComponentsResult): string {
  const lines: string[] = [];

  lines.push(`# ${result.category === 'all' ? 'All' : result.category.charAt(0).toUpperCase() + result.category.slice(1)} Components`);
  lines.push(`Found ${result.count} components\n`);

  // Group by status for better readability
  const stable = result.components.filter((c) => c.status === 'stable');
  const beta = result.components.filter((c) => c.status === 'beta');
  const experimental = result.components.filter((c) => c.status === 'experimental');

  if (stable.length > 0) {
    lines.push('## Stable');
    for (const c of stable) {
      lines.push(`- **${c.name}** (${c.category}): ${c.description}`);
      lines.push(`  Tags: ${c.tags.join(', ')}`);
    }
    lines.push('');
  }

  if (beta.length > 0) {
    lines.push('## Beta');
    for (const c of beta) {
      lines.push(`- **${c.name}** (${c.category}): ${c.description}`);
      lines.push(`  Tags: ${c.tags.join(', ')}`);
    }
    lines.push('');
  }

  if (experimental.length > 0) {
    lines.push('## Experimental');
    for (const c of experimental) {
      lines.push(`- **${c.name}** (${c.category}): ${c.description}`);
      lines.push(`  Tags: ${c.tags.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
