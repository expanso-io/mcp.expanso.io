/**
 * Documentation Link Validator
 *
 * Maintains a lookup table of valid Expanso documentation URLs.
 * Links are validated before being added to responses.
 */

import type { Env } from './index';

const DOCS_BASE = 'https://docs.expanso.io';
const CACHE_KEY = 'valid-docs-links';
const CACHE_TTL = 86400; // 24 hours

// Valid component paths - fetched from sitemap
// Last updated: 2024-12-28
const VALID_COMPONENTS: Record<string, Set<string>> = {
  inputs: new Set([
    'amqp_0_9', 'amqp_1', 'aws_kinesis', 'aws_s3', 'aws_sqs',
    'azure_blob_storage', 'azure_cosmosdb', 'azure_queue_storage', 'azure_table_storage',
    'batched', 'beanstalkd', 'broker', 'cassandra', 'cockroachdb_changefeed',
    'csv', 'cypher', 'discord', 'dynamic', 'etcd', 'file',
    'gcp_bigquery_select', 'gcp_cloud_storage', 'gcp_pubsub', 'gcp_spanner_cdc',
    'generate', 'hdfs', 'http_client', 'http_server', 'inproc',
    'kafka', 'kafka_franz', 'mongodb', 'mongodb_cdc', 'mqtt', 'nanomsg',
    'nats', 'nats_jetstream', 'nats_kv', 'nats_object_store', 'nsq',
    'parquet', 'pulsar', 'read_until', 'redis_list', 'redis_pubsub',
    'redis_scan', 'redis_streams', 'resource', 's2', 'sequence',
    'sftp', 'socket', 'socket_server', 'sql_raw', 'sql_select',
    'stdin', 'subprocess', 'twitter_search', 'websocket', 'zmq4', 'zmq4n',
  ]),
  outputs: new Set([
    'amqp_0_9', 'amqp_1', 'aws_dynamodb', 'aws_kinesis', 'aws_kinesis_firehose',
    'aws_s3', 'aws_sns', 'aws_sqs', 'azure_blob_storage', 'azure_cosmosdb',
    'azure_queue_storage', 'azure_table_storage', 'beanstalkd', 'broker',
    'cache', 'cassandra', 'cypher', 'discord', 'drop', 'drop_on',
    'dynamic', 'elasticsearch', 'elasticsearch_v2', 'fallback', 'file',
    'gcp_bigquery', 'gcp_bigquery_write_api', 'gcp_cloud_storage', 'gcp_pubsub',
    'hdfs', 'http_client', 'http_server', 'inproc', 'kafka', 'kafka_franz',
    'mongodb', 'mqtt', 'nanomsg', 'nats', 'nats_jetstream', 'nats_kv',
    'nats_object_store', 'nsq', 'opensearch', 'pulsar', 'pusher', 'questdb',
    'redis_hash', 'redis_list', 'redis_pubsub', 'redis_streams',
    'reject', 'reject_errored', 'resource', 'retry', 's2', 'sftp',
    'snowflake_put', 'socket', 'splunk_hec', 'sql_insert', 'sql_raw',
    'stdout', 'subprocess', 'switch', 'sync_response', 'websocket', 'zmq4', 'zmq4n',
  ]),
  processors: new Set([
    'archive', 'avro', 'awk', 'aws_dynamodb_partiql', 'aws_lambda', 'aws_s3',
    'azure_cosmosdb', 'bloblang', 'bounds_check', 'branch', 'cache', 'cached',
    'catch', 'command', 'compress', 'couchbase', 'decompress', 'dedupe',
    'for_each', 'gcp_bigquery_select', 'grok', 'group_by', 'group_by_value',
    'http', 'insert_part', 'javascript', 'jmespath', 'jq', 'json_schema',
    'log', 'mapping', 'metric', 'mongodb', 'msgpack', 'mutation',
    'nats_kv', 'nats_object_store', 'nats_request_reply',
    'nlp_classify_text', 'nlp_classify_tokens', 'nlp_extract_features', 'nlp_zero_shot_classify',
    'noop', 'opensnowcat', 'parallel', 'parquet_decode', 'parquet_encode',
    'parse_log', 'processors', 'protobuf', 'rate_limit', 'redis', 'redis_script',
    'resource', 'retry', 'schema_registry_decode', 'schema_registry_encode',
    'select_parts', 'sentry_capture', 'sleep', 'split', 'sql_insert', 'sql_raw',
    'sql_select', 'subprocess', 'switch', 'sync_response', 'try',
    'unarchive', 'wasm', 'while', 'workflow', 'xml',
  ]),
  caches: new Set([
    'aws_dynamodb', 'aws_s3', 'couchbase', 'file', 'gcp_cloud_storage',
    'lru', 'memcached', 'memory', 'mongodb', 'multilevel', 'nats_kv',
    'noop', 'redis', 'ristretto', 'sql', 'ttlru',
  ]),
  buffers: new Set([
    'memory', 'none', 'sqlite', 'system_window',
  ]),
};

// Mapping of common aliases to canonical names
const COMPONENT_ALIASES: Record<string, string> = {
  's3': 'aws_s3',
  'kinesis': 'aws_kinesis',
  'sqs': 'aws_sqs',
  'sns': 'aws_sns',
  'dynamodb': 'aws_dynamodb',
  'lambda': 'aws_lambda',
  'pubsub': 'gcp_pubsub',
  'bigquery': 'gcp_bigquery',
  'cloud_storage': 'gcp_cloud_storage',
  'blob_storage': 'azure_blob_storage',
  'cosmosdb': 'azure_cosmosdb',
  'es': 'elasticsearch_v2',
  'elastic': 'elasticsearch_v2',
  'mongo': 'mongodb',
  'postgres': 'sql_select', // SQL components handle postgres
  'mysql': 'sql_select',
  'http': 'http_client',
};

/**
 * Check if a component exists in a category
 */
export function isValidComponent(category: string, component: string): boolean {
  const normalized = component.toLowerCase().replace(/-/g, '_');
  const canonical = COMPONENT_ALIASES[normalized] || normalized;
  return VALID_COMPONENTS[category]?.has(canonical) || false;
}

/**
 * Get the documentation URL for a component
 */
export function getComponentUrl(category: string, component: string): string | null {
  const normalized = component.toLowerCase().replace(/-/g, '_');
  const canonical = COMPONENT_ALIASES[normalized] || normalized;

  if (VALID_COMPONENTS[category]?.has(canonical)) {
    return `${DOCS_BASE}/components/${category}/${canonical}`;
  }
  return null;
}

/**
 * Extract components from YAML and return their documentation links
 */
export function extractComponentsFromYaml(yaml: string): {
  input?: { name: string; url: string };
  processors: { name: string; url: string }[];
  output?: { name: string; url: string };
} {
  const result: {
    input?: { name: string; url: string };
    processors: { name: string; url: string }[];
    output?: { name: string; url: string };
  } = { processors: [] };

  // Extract input component (first key under input:)
  const inputMatch = yaml.match(/^input:\s*\n\s+(\w+):/m);
  if (inputMatch) {
    const url = getComponentUrl('inputs', inputMatch[1]);
    if (url) {
      result.input = { name: inputMatch[1], url };
    }
  }

  // Extract output component (first key under output:)
  const outputMatch = yaml.match(/^output:\s*\n\s+(\w+):/m);
  if (outputMatch) {
    const url = getComponentUrl('outputs', outputMatch[1]);
    if (url) {
      result.output = { name: outputMatch[1], url };
    }
  }

  // Extract processors (look for - processor_name: or - mapping:)
  const processorPattern = /^\s+-\s+(\w+):\s*(?:\||>|{|\[|"|\d|true|false|null|\n)/gm;
  let procMatch;
  const seenProcessors = new Set<string>();

  while ((procMatch = processorPattern.exec(yaml)) !== null) {
    const procName = procMatch[1];
    if (!seenProcessors.has(procName)) {
      const url = getComponentUrl('processors', procName);
      if (url) {
        result.processors.push({ name: procName, url });
        seenProcessors.add(procName);
      }
    }
  }

  return result;
}

/**
 * Generate a "Components used" section with validated links
 */
export function generateComponentsSection(yaml: string): string {
  const components = extractComponentsFromYaml(yaml);
  const lines: string[] = ['**Components used:**'];

  if (components.input) {
    lines.push(`- Input: [${components.input.name}](${components.input.url})`);
  }

  if (components.processors.length > 0) {
    for (const proc of components.processors) {
      lines.push(`- Processor: [${proc.name}](${proc.url})`);
    }
  }

  if (components.output) {
    lines.push(`- Output: [${components.output.name}](${components.output.url})`);
  }

  // Only return if we found at least one component
  if (lines.length > 1) {
    return lines.join('\n');
  }
  return '';
}

/**
 * Refresh the component list from the sitemap (for future use)
 * This can be called periodically to update the cache
 */
export async function refreshComponentList(env: Env): Promise<void> {
  if (!env.CONTENT_CACHE) return;

  try {
    const response = await fetch(`${DOCS_BASE}/sitemap.xml`);
    if (!response.ok) return;

    const xml = await response.text();

    // Extract component URLs from sitemap
    const urlPattern = /<loc>https:\/\/docs\.expanso\.io\/components\/(\w+)\/(\w+)<\/loc>/g;
    const components: Record<string, string[]> = {
      inputs: [],
      outputs: [],
      processors: [],
      caches: [],
      buffers: [],
    };

    let urlMatch;
    while ((urlMatch = urlPattern.exec(xml)) !== null) {
      const [, category, component] = urlMatch;
      if (components[category]) {
        components[category].push(component);
      }
    }

    // Cache the result
    await env.CONTENT_CACHE.put(CACHE_KEY, JSON.stringify(components), {
      expirationTtl: CACHE_TTL,
    });
  } catch (error) {
    console.error('Failed to refresh component list:', error);
  }
}
