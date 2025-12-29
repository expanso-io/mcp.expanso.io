/**
 * Component Compatibility Matrix
 *
 * Checks for incompatible component combinations and configuration patterns
 * in Expanso pipelines. Returns warnings (not blocking errors) to help users
 * build more robust pipelines.
 */

// ============================================================================
// Types
// ============================================================================

export interface CompatibilityWarning {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export interface ParsedPipeline {
  input?: {
    type: string;
    config: Record<string, unknown>;
  };
  output?: {
    type: string;
    config: Record<string, unknown>;
  };
  processors?: Array<{
    type: string;
    config: unknown;
  }>;
  buffer?: {
    type: string;
    config: Record<string, unknown>;
  };
  resources?: {
    caches?: Array<{ label: string; type: string }>;
    rateLimits?: Array<{ label: string }>;
  };
  raw: Record<string, unknown>;
}

export interface CompatibilityCheck {
  id: string;
  name: string;
  description: string;
  condition: (pipeline: ParsedPipeline) => boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a component exists in the processors array
 */
function hasProcessor(pipeline: ParsedPipeline, type: string): boolean {
  return pipeline.processors?.some(p => p.type === type) ?? false;
}

/**
 * Check if a component exists anywhere in nested processors (branch, try, etc.)
 */
function hasNestedProcessor(pipeline: ParsedPipeline, type: string): boolean {
  if (hasProcessor(pipeline, type)) return true;

  // Check nested in branch, try, catch, workflow, etc.
  for (const proc of pipeline.processors ?? []) {
    if (proc.type === 'branch' || proc.type === 'try' || proc.type === 'catch' ||
        proc.type === 'workflow' || proc.type === 'parallel' || proc.type === 'retry') {
      const config = proc.config as Record<string, unknown>;
      const nestedProcessors = config?.processors;
      if (Array.isArray(nestedProcessors)) {
        if (nestedProcessors.some(np => {
          if (typeof np === 'object' && np !== null) {
            return Object.keys(np)[0] === type;
          }
          return false;
        })) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Get a processor's configuration
 */
function getProcessorConfig(pipeline: ParsedPipeline, type: string): unknown | undefined {
  const proc = pipeline.processors?.find(p => p.type === type);
  return proc?.config;
}

/**
 * Check if input has batching configured
 */
function inputHasBatching(pipeline: ParsedPipeline): boolean {
  const config = pipeline.input?.config;
  if (!config) return false;
  return 'batching' in config || 'batch_count' in config;
}

/**
 * Check if output supports batching
 */
function outputSupportsBatching(outputType: string): boolean {
  const batchingOutputs = new Set([
    'aws_s3', 'gcp_cloud_storage', 'azure_blob_storage',
    'elasticsearch_v8', 'opensearch', 'http_client',
    'kafka', 'kafka_franz', 'nats', 'nats_jetstream',
    'gcp_bigquery', 'snowflake_streaming', 'mongodb',
    'qdrant', 'pinecone', 'sql_insert',
  ]);
  return batchingOutputs.has(outputType);
}

/**
 * Count database connection usage across pipeline
 */
function countDatabaseConnections(pipeline: ParsedPipeline): number {
  let count = 0;

  // Check input
  const dbInputs = ['sql_select', 'sql_raw', 'mongodb', 'postgres_cdc', 'mysql_cdc'];
  if (pipeline.input?.type && dbInputs.includes(pipeline.input.type)) {
    count++;
  }

  // Check processors
  const dbProcessors = ['sql_select', 'sql_insert', 'sql_raw', 'mongodb', 'couchbase'];
  for (const proc of pipeline.processors ?? []) {
    if (dbProcessors.includes(proc.type)) {
      count++;
    }
  }

  // Check output
  const dbOutputs = ['sql_insert', 'sql_raw', 'mongodb', 'couchbase', 'elasticsearch_v8'];
  if (pipeline.output?.type && dbOutputs.includes(pipeline.output.type)) {
    count++;
  }

  return count;
}

/**
 * Check if pipeline uses cache resources
 */
function usesCacheProcessor(pipeline: ParsedPipeline): boolean {
  return hasProcessor(pipeline, 'cache') || hasProcessor(pipeline, 'cached');
}

/**
 * Check if cache resources are defined
 */
function hasCacheResources(pipeline: ParsedPipeline): boolean {
  return (pipeline.resources?.caches?.length ?? 0) > 0 ||
    'cache_resources' in pipeline.raw;
}

/**
 * Check if rate limit resources are defined
 */
function hasRateLimitResources(pipeline: ParsedPipeline): boolean {
  return (pipeline.resources?.rateLimits?.length ?? 0) > 0 ||
    'rate_limit_resources' in pipeline.raw;
}

// ============================================================================
// Compatibility Rules
// ============================================================================

export const COMPATIBILITY_RULES: CompatibilityCheck[] = [
  // ============================================================================
  // SYNC RESPONSE PATTERNS (1-3)
  // ============================================================================
  {
    id: 'sync-response-without-http-server',
    name: 'Sync Response Without HTTP Server',
    description: 'sync_response output requires http_server input',
    condition: (pipeline) =>
      pipeline.output?.type === 'sync_response' &&
      pipeline.input?.type !== 'http_server',
    severity: 'error',
    message: 'sync_response output requires http_server input to work correctly',
    suggestion: 'Change input to http_server or use a different output type',
  },

  {
    id: 'http-server-without-sync-response',
    name: 'HTTP Server Without Sync Response',
    description: 'http_server input typically needs sync_response for request-reply',
    condition: (pipeline) =>
      pipeline.input?.type === 'http_server' &&
      pipeline.output?.type !== 'sync_response' &&
      !hasProcessor(pipeline, 'sync_response'),
    severity: 'info',
    message: 'http_server input without sync_response will not return responses to clients',
    suggestion: 'Add sync_response output or processor if you need request-reply pattern',
  },

  {
    id: 'sync-response-with-batching',
    name: 'Sync Response with Batching',
    description: 'Batching is incompatible with synchronous responses',
    condition: (pipeline) =>
      (pipeline.output?.type === 'sync_response' || hasProcessor(pipeline, 'sync_response')) &&
      inputHasBatching(pipeline),
    severity: 'error',
    message: 'Batching on input is incompatible with sync_response pattern',
    suggestion: 'Remove batching from input when using sync_response',
  },

  // ============================================================================
  // BATCHING COMPATIBILITY (4-7)
  // ============================================================================
  {
    id: 'input-batching-output-no-batching',
    name: 'Input Batching Without Output Support',
    description: 'Input batching should match output batching capabilities',
    condition: (pipeline: ParsedPipeline) =>
      inputHasBatching(pipeline) &&
      pipeline.output?.type !== undefined &&
      !outputSupportsBatching(pipeline.output.type),
    severity: 'warning',
    message: `Output type may not efficiently handle batched messages`,
    suggestion: 'Consider adding batching to output or removing from input',
  },

  {
    id: 'kafka-batch-mismatch',
    name: 'Kafka Batch Size Mismatch',
    description: 'Kafka consumer and producer batch sizes should be considered together',
    condition: (pipeline) => {
      if (pipeline.input?.type !== 'kafka' && pipeline.input?.type !== 'kafka_franz') {
        return false;
      }
      if (pipeline.output?.type !== 'kafka' && pipeline.output?.type !== 'kafka_franz') {
        return false;
      }
      const inputConfig = pipeline.input.config;
      const outputConfig = pipeline.output.config;
      const inputBatch = (inputConfig as Record<string, unknown>)?.batching;
      const outputBatch = (outputConfig as Record<string, unknown>)?.batching;
      // Warn if input has batching but output doesn't
      return inputBatch !== undefined && outputBatch === undefined;
    },
    severity: 'info',
    message: 'Kafka input has batching but output does not - consider output batching for efficiency',
    suggestion: 'Add batching to kafka output: batching: { count: 100, period: 1s }',
  },

  {
    id: 'large-batch-small-output',
    name: 'Large Batch to Small Output',
    description: 'Large input batches to outputs with size limits',
    condition: (pipeline) => {
      const inputConfig = pipeline.input?.config as Record<string, unknown>;
      const batchConfig = inputConfig?.batching as Record<string, unknown>;
      const batchCount = batchConfig?.count;
      const smallOutputs = ['http_client', 'http_server', 'websocket'];
      return typeof batchCount === 'number' &&
        batchCount > 1000 &&
        smallOutputs.includes(pipeline.output?.type ?? '');
    },
    severity: 'warning',
    message: 'Large batch size (>1000) may cause issues with HTTP-based outputs',
    suggestion: 'Consider reducing batch size or using batching on output with byte_size limit',
  },

  {
    id: 'batch-without-window',
    name: 'Batch Without Time Window',
    description: 'Count-based batching without time window may cause delays',
    condition: (pipeline) => {
      const inputConfig = pipeline.input?.config as Record<string, unknown>;
      const batchConfig = inputConfig?.batching as Record<string, unknown>;
      return batchConfig?.count !== undefined &&
        batchConfig?.period === undefined;
    },
    severity: 'info',
    message: 'Count-based batching without time period may cause messages to wait indefinitely',
    suggestion: 'Add period to batching: batching: { count: 100, period: 10s }',
  },

  // ============================================================================
  // FORMAT COMPATIBILITY (8-11)
  // ============================================================================
  {
    id: 'csv-input-json-processor',
    name: 'CSV Input with JSON Processor',
    description: 'CSV input produces structured data, not JSON strings',
    condition: (pipeline) => {
      if (pipeline.input?.type !== 'csv' && pipeline.input?.type !== 'file') {
        return false;
      }
      const inputConfig = pipeline.input.config as Record<string, unknown>;
      const isCSV = pipeline.input.type === 'csv' ||
        inputConfig?.codec === 'csv';
      if (!isCSV) return false;

      // Check if any processor tries to parse_json
      for (const proc of pipeline.processors ?? []) {
        if (proc.type === 'mapping' || proc.type === 'bloblang') {
          const mapping = String(proc.config ?? '');
          if (mapping.includes('parse_json')) {
            return true;
          }
        }
      }
      return false;
    },
    severity: 'warning',
    message: 'CSV input already produces structured data - parse_json() is unnecessary',
    suggestion: 'Access CSV fields directly: root.field = this.column_name',
  },

  {
    id: 'binary-to-json-output',
    name: 'Binary Data to JSON Output',
    description: 'Binary/compressed data may not work well with JSON outputs',
    condition: (pipeline) => {
      const jsonOutputs = ['elasticsearch_v8', 'opensearch', 'mongodb', 'gcp_bigquery'];
      if (!jsonOutputs.includes(pipeline.output?.type ?? '')) {
        return false;
      }
      // Check for compression without decompression
      const hasCompress = hasProcessor(pipeline, 'compress');
      const hasDecompress = hasProcessor(pipeline, 'decompress');
      return hasCompress && !hasDecompress;
    },
    severity: 'error',
    message: 'Compressed data sent to JSON-based output will cause errors',
    suggestion: 'Add decompress processor before JSON output or use a binary-compatible output',
  },

  {
    id: 'avro-without-schema-registry',
    name: 'Avro Without Schema Registry',
    description: 'Avro encoding/decoding typically requires schema registry',
    condition: (pipeline) => {
      const hasAvro = hasProcessor(pipeline, 'avro');
      const hasSchemaRegistry = hasProcessor(pipeline, 'schema_registry_encode') ||
        hasProcessor(pipeline, 'schema_registry_decode');
      return hasAvro && !hasSchemaRegistry;
    },
    severity: 'info',
    message: 'Using Avro processor without schema registry may cause schema evolution issues',
    suggestion: 'Consider using schema_registry_encode/decode for schema management',
  },

  {
    id: 'protobuf-without-schema',
    name: 'Protobuf Without Schema Definition',
    description: 'Protobuf processor needs schema configuration',
    condition: (pipeline) => {
      const protoProc = pipeline.processors?.find(p => p.type === 'protobuf');
      if (!protoProc) return false;
      const config = protoProc.config as Record<string, unknown>;
      return !config?.message && !config?.import_paths;
    },
    severity: 'error',
    message: 'Protobuf processor requires message type and schema configuration',
    suggestion: 'Add message type and import_paths to protobuf processor config',
  },

  // ============================================================================
  // RESOURCE SHARING (12-15)
  // ============================================================================
  {
    id: 'multiple-db-connections',
    name: 'Multiple Database Connections',
    description: 'Multiple database connections should use connection pooling',
    condition: (pipeline) => countDatabaseConnections(pipeline) > 2,
    severity: 'warning',
    message: 'Multiple database connections detected - consider using resource pooling',
    suggestion: 'Consider defining database connections in resources section and reference by label',
  },

  {
    id: 'cache-without-resource',
    name: 'Cache Processor Without Resource',
    description: 'Cache processor needs a defined cache resource',
    condition: (pipeline) => usesCacheProcessor(pipeline) && !hasCacheResources(pipeline),
    severity: 'error',
    message: 'Cache processor used without cache_resources definition',
    suggestion: 'Add cache_resources section with cache configuration',
  },

  {
    id: 'rate-limit-without-resource',
    name: 'Rate Limit Without Resource',
    description: 'Rate limit processor needs a defined rate limit resource',
    condition: (pipeline) => {
      const hasRateLimit = hasProcessor(pipeline, 'rate_limit');
      return hasRateLimit && !hasRateLimitResources(pipeline);
    },
    severity: 'error',
    message: 'Rate limit processor used without rate_limit_resources definition',
    suggestion: 'Add rate_limit_resources section with rate limit configuration',
  },

  {
    id: 'duplicate-cache-keys',
    name: 'Potential Cache Key Conflicts',
    description: 'Multiple cache operations on same resource may conflict',
    condition: (pipeline) => {
      const cacheProcs = pipeline.processors?.filter(p => p.type === 'cache') ?? [];
      if (cacheProcs.length < 2) return false;

      // Check if same resource used with different operators
      const resourceOps = new Map<string, Set<string>>();
      for (const proc of cacheProcs) {
        const config = proc.config as Record<string, unknown>;
        const resource = String(config?.resource ?? '');
        const operator = String(config?.operator ?? '');
        if (!resourceOps.has(resource)) {
          resourceOps.set(resource, new Set());
        }
        resourceOps.get(resource)?.add(operator);
      }

      // Warn if same resource has set and get with potentially overlapping keys
      for (const ops of resourceOps.values()) {
        if (ops.has('set') && ops.has('get')) {
          return true;
        }
      }
      return false;
    },
    severity: 'info',
    message: 'Multiple cache operations on same resource - ensure key patterns do not conflict',
    suggestion: 'Consider using different key prefixes or separate cache resources',
  },

  // ============================================================================
  // ERROR HANDLING (16-18)
  // ============================================================================
  {
    id: 'http-without-retry',
    name: 'HTTP Processor Without Retry',
    description: 'HTTP processors should have retry configuration',
    condition: (pipeline) => {
      const httpProc = pipeline.processors?.find(p => p.type === 'http');
      if (!httpProc) return false;
      const config = httpProc.config as Record<string, unknown>;
      return config?.retries === undefined && config?.retry === undefined;
    },
    severity: 'info',
    message: 'HTTP processor without explicit retry configuration may fail on transient errors',
    suggestion: 'Add retries: 3 and retry_period: 1s to http processor config',
  },

  {
    id: 'try-without-catch',
    name: 'Try Without Catch',
    description: 'Try processors should have corresponding catch handling',
    condition: (pipeline) => {
      const hasTry = hasProcessor(pipeline, 'try');
      const hasCatch = hasProcessor(pipeline, 'catch');
      return hasTry && !hasCatch;
    },
    severity: 'warning',
    message: 'try processor without catch - errors will propagate unhandled',
    suggestion: 'Add catch processor after try to handle errors gracefully',
  },

  {
    id: 'catch-before-try',
    name: 'Catch Before Try',
    description: 'Catch processor should come after try',
    condition: (pipeline) => {
      const processors = pipeline.processors ?? [];
      let tryIndex = -1;
      let catchIndex = -1;
      processors.forEach((p, i) => {
        if (p.type === 'try' && tryIndex === -1) tryIndex = i;
        if (p.type === 'catch' && catchIndex === -1) catchIndex = i;
      });
      return catchIndex !== -1 && tryIndex !== -1 && catchIndex < tryIndex;
    },
    severity: 'error',
    message: 'catch processor appears before try - catch must come after try',
    suggestion: 'Reorder processors: try should come before catch',
  },

  // ============================================================================
  // PERFORMANCE (19-22)
  // ============================================================================
  {
    id: 'blocking-in-parallel',
    name: 'Blocking Operations in Parallel',
    description: 'Long-running operations in parallel may exhaust thread pool',
    condition: (pipeline) => {
      const parallelProc = pipeline.processors?.find(p => p.type === 'parallel');
      if (!parallelProc) return false;
      const config = parallelProc.config as Record<string, unknown>;
      const nestedProcessors = config?.processors;
      if (!Array.isArray(nestedProcessors)) return false;

      // Check for http or sleep in parallel
      return nestedProcessors.some(np => {
        if (typeof np === 'object' && np !== null) {
          const type = Object.keys(np)[0];
          return type === 'http' || type === 'sleep' || type === 'subprocess';
        }
        return false;
      });
    },
    severity: 'warning',
    message: 'Blocking operations (http, sleep, subprocess) in parallel may exhaust resources',
    suggestion: 'Consider limiting parallel cap or using async patterns',
  },

  {
    id: 'unbounded-parallel',
    name: 'Unbounded Parallel Processing',
    description: 'Parallel processor without cap may cause resource exhaustion',
    condition: (pipeline) => {
      const parallelProc = pipeline.processors?.find(p => p.type === 'parallel');
      if (!parallelProc) return false;
      const config = parallelProc.config as Record<string, unknown>;
      return config?.cap === undefined;
    },
    severity: 'warning',
    message: 'Parallel processor without cap may spawn unlimited goroutines',
    suggestion: 'Add cap to parallel processor: parallel: { cap: 10, processors: [...] }',
  },

  {
    id: 'large-workflow-dag',
    name: 'Large Workflow DAG',
    description: 'Very large workflow DAGs may impact performance',
    condition: (pipeline) => {
      const workflowProc = pipeline.processors?.find(p => p.type === 'workflow');
      if (!workflowProc) return false;
      const config = workflowProc.config as Record<string, unknown>;
      const branches = config?.branches as Record<string, unknown>;
      return branches && Object.keys(branches).length > 10;
    },
    severity: 'info',
    message: 'Large workflow DAG (>10 branches) may be hard to debug and maintain',
    suggestion: 'Consider splitting into multiple pipelines or simplifying the workflow',
  },

  {
    id: 'json-parse-every-message',
    name: 'Repeated JSON Parsing',
    description: 'Multiple parse_json calls on same data is inefficient',
    condition: (pipeline) => {
      let parseCount = 0;
      for (const proc of pipeline.processors ?? []) {
        if (proc.type === 'mapping' || proc.type === 'bloblang') {
          const mapping = String(proc.config ?? '');
          const matches = mapping.match(/parse_json\(\)/g);
          parseCount += matches?.length ?? 0;
        }
      }
      return parseCount > 2;
    },
    severity: 'info',
    message: 'Multiple parse_json() calls detected - consider parsing once and storing in variable',
    suggestion: 'Use let: let data = this.parse_json(); then access $data.field',
  },

  // ============================================================================
  // CDC PATTERNS (23-24)
  // ============================================================================
  {
    id: 'cdc-without-ordering',
    name: 'CDC Without Ordering Guarantee',
    description: 'CDC sources need careful ordering for consistency',
    condition: (pipeline) => {
      const cdcInputs = ['postgres_cdc', 'mysql_cdc', 'mongodb_cdc', 'cockroachdb_changefeed'];
      if (!cdcInputs.includes(pipeline.input?.type ?? '')) {
        return false;
      }
      // Check for parallel or workflow that might reorder
      return hasProcessor(pipeline, 'parallel');
    },
    severity: 'warning',
    message: 'CDC source with parallel processing may cause out-of-order updates',
    suggestion: 'Ensure ordering is preserved by using sequential processing or key-based partitioning',
  },

  {
    id: 'cdc-to-non-idempotent-output',
    name: 'CDC to Non-Idempotent Output',
    description: 'CDC replays require idempotent outputs',
    condition: (pipeline) => {
      const cdcInputs = ['postgres_cdc', 'mysql_cdc', 'mongodb_cdc', 'cockroachdb_changefeed'];
      if (!cdcInputs.includes(pipeline.input?.type ?? '')) {
        return false;
      }
      // Non-idempotent outputs
      const nonIdempotent = ['file', 'stdout', 'http_client'];
      return nonIdempotent.includes(pipeline.output?.type ?? '');
    },
    severity: 'warning',
    message: 'CDC source to non-idempotent output may cause duplicates on replay',
    suggestion: 'Use outputs that support upsert/idempotent writes (Kafka key, ES id, MongoDB upsert)',
  },

  // ============================================================================
  // SECURITY (25-26)
  // ============================================================================
  {
    id: 'http-without-tls',
    name: 'HTTP Without TLS',
    description: 'HTTP connections should use TLS for security',
    condition: (pipeline) => {
      const httpProc = pipeline.processors?.find(p => p.type === 'http');
      if (!httpProc) return false;
      const config = httpProc.config as Record<string, unknown>;
      const url = String(config?.url ?? '');
      // Check if URL is HTTP without localhost
      return url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1');
    },
    severity: 'warning',
    message: 'HTTP processor using non-TLS connection to external host',
    suggestion: 'Use HTTPS for external connections to protect data in transit',
  },

  {
    id: 'sensitive-data-logging',
    name: 'Sensitive Data in Logs',
    description: 'Log processor may expose sensitive data',
    condition: (pipeline) => {
      const logProc = pipeline.processors?.find(p => p.type === 'log');
      if (!logProc) return false;
      const config = logProc.config as Record<string, unknown>;
      const message = String(config?.message ?? '');
      // Check for sensitive patterns
      const sensitivePatterns = ['password', 'secret', 'token', 'key', 'credential', 'ssn'];
      return sensitivePatterns.some(p => message.toLowerCase().includes(p));
    },
    severity: 'warning',
    message: 'Log processor may expose sensitive data - review logged fields',
    suggestion: 'Redact sensitive fields before logging or use field-level masking',
  },

  // ============================================================================
  // MESSAGING PATTERNS (27-28)
  // ============================================================================
  {
    id: 'kafka-consumer-group-missing',
    name: 'Kafka Without Consumer Group',
    description: 'Kafka input should specify consumer group for offset management',
    condition: (pipeline) => {
      if (pipeline.input?.type !== 'kafka' && pipeline.input?.type !== 'kafka_franz') {
        return false;
      }
      const config = pipeline.input.config as Record<string, unknown>;
      return !config?.consumer_group;
    },
    severity: 'info',
    message: 'Kafka input without consumer_group will not commit offsets',
    suggestion: 'Add consumer_group for reliable offset tracking and scaling',
  },

  {
    id: 'nats-request-timeout',
    name: 'NATS Request Without Timeout',
    description: 'NATS request-reply should have timeout configured',
    condition: (pipeline) => {
      const natsProc = pipeline.processors?.find(p => p.type === 'nats_request_reply');
      if (!natsProc) return false;
      const config = natsProc.config as Record<string, unknown>;
      return !config?.timeout;
    },
    severity: 'warning',
    message: 'NATS request-reply without timeout may hang indefinitely',
    suggestion: 'Add timeout: 5s to nats_request_reply processor',
  },

  // ============================================================================
  // OUTPUT PATTERNS (29-30)
  // ============================================================================
  {
    id: 'switch-without-default',
    name: 'Switch Output Without Default',
    description: 'Switch output should have a default case',
    condition: (pipeline) => {
      if (pipeline.output?.type !== 'switch') return false;
      const config = pipeline.output.config as Record<string, unknown>;
      const cases = config?.cases as Array<{ check?: string; output?: unknown }>;
      if (!Array.isArray(cases)) return false;
      // Check if last case has no check (default)
      const lastCase = cases[cases.length - 1];
      return lastCase?.check !== undefined;
    },
    severity: 'warning',
    message: 'Switch output without default case - unmatched messages will error',
    suggestion: 'Add a default case without check: - output: drop: {}',
  },

  {
    id: 'broker-fanout-unbalanced',
    name: 'Broker Fan-Out Unbalanced',
    description: 'Fan-out with slow output may block faster outputs',
    condition: (pipeline) => {
      if (pipeline.output?.type !== 'broker') return false;
      const config = pipeline.output.config as Record<string, unknown>;
      if (config?.pattern !== 'fan_out') return false;
      const outputs = config?.outputs as unknown[];
      if (!Array.isArray(outputs) || outputs.length < 2) return false;

      // Check for mix of fast and slow outputs
      const fastOutputs = ['kafka', 'nats', 'redis_pubsub'];
      const slowOutputs = ['http_client', 'aws_s3', 'elasticsearch_v8'];

      let hasFast = false;
      let hasSlow = false;
      for (const out of outputs) {
        if (typeof out === 'object' && out !== null) {
          const outType = Object.keys(out)[0];
          if (fastOutputs.includes(outType)) hasFast = true;
          if (slowOutputs.includes(outType)) hasSlow = true;
        }
      }
      return hasFast && hasSlow;
    },
    severity: 'info',
    message: 'Fan-out broker with mixed output speeds - slow outputs may bottleneck fast ones',
    suggestion: 'Consider using broker with pattern: fan_out_sequential or separate pipelines',
  },
];

// ============================================================================
// Main Compatibility Check Function
// ============================================================================

/**
 * Check a parsed pipeline for compatibility issues
 */
export function checkCompatibility(pipeline: ParsedPipeline): CompatibilityWarning[] {
  const warnings: CompatibilityWarning[] = [];

  for (const rule of COMPATIBILITY_RULES) {
    try {
      if (rule.condition(pipeline)) {
        warnings.push({
          rule: rule.id,
          severity: rule.severity,
          message: rule.message,
          suggestion: rule.suggestion,
        });
      }
    } catch {
      // Skip rules that fail to evaluate (may happen with incomplete pipelines)
    }
  }

  return warnings;
}

/**
 * Parse a pipeline configuration object into structured format
 */
export function parsePipelineForCompatibility(config: Record<string, unknown>): ParsedPipeline {
  const pipeline: ParsedPipeline = {
    raw: config,
  };

  // Parse input
  if (config.input && typeof config.input === 'object') {
    const inputObj = config.input as Record<string, unknown>;
    const inputType = Object.keys(inputObj).find(k => !k.startsWith('_') && k !== 'label');
    if (inputType) {
      pipeline.input = {
        type: inputType,
        config: inputObj[inputType] as Record<string, unknown>,
      };
    }
  }

  // Parse output
  if (config.output && typeof config.output === 'object') {
    const outputObj = config.output as Record<string, unknown>;
    const outputType = Object.keys(outputObj).find(k => !k.startsWith('_') && k !== 'label');
    if (outputType) {
      pipeline.output = {
        type: outputType,
        config: outputObj[outputType] as Record<string, unknown>,
      };
    }
  }

  // Parse processors
  if (config.pipeline && typeof config.pipeline === 'object') {
    const pipelineObj = config.pipeline as Record<string, unknown>;
    if (Array.isArray(pipelineObj.processors)) {
      pipeline.processors = pipelineObj.processors.map(proc => {
        if (typeof proc === 'object' && proc !== null) {
          const procType = Object.keys(proc).find(k => !k.startsWith('_') && k !== 'label');
          if (procType) {
            return {
              type: procType,
              config: (proc as Record<string, unknown>)[procType],
            };
          }
        }
        return { type: 'unknown', config: proc };
      });
    }
  }

  // Parse buffer
  if (config.buffer && typeof config.buffer === 'object') {
    const bufferObj = config.buffer as Record<string, unknown>;
    const bufferType = Object.keys(bufferObj)[0];
    if (bufferType) {
      pipeline.buffer = {
        type: bufferType,
        config: bufferObj[bufferType] as Record<string, unknown>,
      };
    }
  }

  // Parse resources
  pipeline.resources = {};

  if (Array.isArray(config.cache_resources)) {
    pipeline.resources.caches = config.cache_resources.map(c => {
      if (typeof c === 'object' && c !== null) {
        const cacheObj = c as Record<string, unknown>;
        const cacheType = Object.keys(cacheObj).find(k => k !== 'label');
        return {
          label: String(cacheObj.label ?? ''),
          type: cacheType ?? 'unknown',
        };
      }
      return { label: '', type: 'unknown' };
    });
  }

  if (Array.isArray(config.rate_limit_resources)) {
    pipeline.resources.rateLimits = config.rate_limit_resources.map(r => {
      if (typeof r === 'object' && r !== null) {
        return { label: String((r as Record<string, unknown>).label ?? '') };
      }
      return { label: '' };
    });
  }

  return pipeline;
}

/**
 * Check a raw pipeline config object for compatibility issues
 */
export function checkPipelineCompatibility(config: Record<string, unknown>): CompatibilityWarning[] {
  const parsed = parsePipelineForCompatibility(config);
  return checkCompatibility(parsed);
}

/**
 * Format compatibility warnings for display
 */
export function formatCompatibilityWarnings(warnings: CompatibilityWarning[]): string {
  if (warnings.length === 0) {
    return '';
  }

  const lines: string[] = ['Compatibility Warnings:', ''];

  const byPriority = {
    error: warnings.filter(w => w.severity === 'error'),
    warning: warnings.filter(w => w.severity === 'warning'),
    info: warnings.filter(w => w.severity === 'info'),
  };

  for (const [severity, severityWarnings] of Object.entries(byPriority)) {
    if (severityWarnings.length === 0) continue;

    const icon = severity === 'error' ? 'X' : severity === 'warning' ? '!' : 'i';

    for (const w of severityWarnings) {
      lines.push(`  [${icon}] ${w.message}`);
      if (w.suggestion) {
        lines.push(`      -> ${w.suggestion}`);
      }
    }
  }

  return lines.join('\n');
}
