#!/usr/bin/env npx tsx
/**
 * Generate Test Corpus for validate.expanso.io
 *
 * Generates 1000+ diverse pipeline prompts, sends them to LLM,
 * collects generated YAML, and exports for validator testing.
 *
 * Usage:
 *   npx tsx scripts/generate-test-corpus.ts [options]
 *
 * Options:
 *   --target=<url>     Target API (default: https://mcp.expanso.io)
 *   --output=<file>    Output file (default: data/test-corpus.jsonl)
 *   --count=<n>        Number of tests (default: 1000)
 *   --export=<file>    Export YAML corpus for validator (default: data/validator-corpus.jsonl)
 *   --resume           Resume from last position
 *   --rate=<n>         Requests per second (default: 2)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Comprehensive Prompt Templates
// ============================================================================

// Real-world data sources
const DATA_SOURCES = {
  messaging: ['kafka', 'aws_sqs', 'aws_kinesis', 'gcp_pubsub', 'azure_queue_storage', 'nats', 'nats_jetstream', 'mqtt', 'amqp_0_9', 'amqp_1', 'redis_streams', 'redis_pubsub', 'pulsar'],
  storage: ['aws_s3', 'gcp_cloud_storage', 'azure_blob_storage', 'sftp', 'file', 'hdfs'],
  databases: ['mongodb', 'postgresql', 'mysql', 'elasticsearch', 'cassandra', 'redis', 'dynamodb', 'couchbase'],
  http: ['http_server', 'http_client', 'websocket', 'grpc'],
  misc: ['stdin', 'generate', 'resource', 'broker', 'sequence', 'read_until'],
};

const DATA_SINKS = {
  messaging: ['kafka', 'aws_sqs', 'aws_kinesis', 'gcp_pubsub', 'azure_queue_storage', 'nats', 'nats_jetstream', 'mqtt', 'amqp_0_9', 'amqp_1', 'redis_streams', 'redis_pubsub', 'pulsar'],
  storage: ['aws_s3', 'gcp_cloud_storage', 'azure_blob_storage', 'sftp', 'file', 'hdfs'],
  databases: ['mongodb', 'postgresql', 'mysql', 'elasticsearch', 'cassandra', 'redis', 'dynamodb', 'couchbase', 'clickhouse', 'snowflake'],
  http: ['http_client', 'websocket', 'grpc'],
  misc: ['stdout', 'drop', 'reject', 'broker', 'switch', 'retry', 'fallback'],
};

// Industry-specific use cases
const INDUSTRY_USE_CASES = {
  ecommerce: [
    'Process order events from checkout to fulfillment',
    'Track inventory changes across warehouses',
    'Aggregate shopping cart analytics',
    'Process payment webhook events',
    'Sync product catalog updates',
    'Handle customer review submissions',
    'Process abandoned cart events',
    'Track price change events',
  ],
  fintech: [
    'Process real-time transaction events',
    'Aggregate fraud detection signals',
    'Handle payment authorization events',
    'Process stock trade executions',
    'Sync account balance updates',
    'Handle KYC verification events',
    'Process loan application events',
    'Track currency exchange rate updates',
  ],
  iot: [
    'Ingest sensor telemetry data',
    'Process device health metrics',
    'Aggregate smart meter readings',
    'Handle GPS tracking updates',
    'Process temperature sensor alerts',
    'Track fleet vehicle positions',
    'Handle industrial equipment events',
    'Process wearable device data',
  ],
  gaming: [
    'Process player action events',
    'Track in-game purchase transactions',
    'Aggregate player session analytics',
    'Handle matchmaking events',
    'Process achievement unlock events',
    'Track leaderboard updates',
    'Handle chat message events',
    'Process anti-cheat detection events',
  ],
  healthcare: [
    'Process patient monitoring events',
    'Handle lab result notifications',
    'Aggregate clinical trial data',
    'Process appointment scheduling events',
    'Track medication dispensing events',
    'Handle emergency alert notifications',
    'Process medical imaging metadata',
    'Track patient admission events',
  ],
  adtech: [
    'Process ad impression events',
    'Track click-through events',
    'Aggregate campaign performance metrics',
    'Handle bid request events',
    'Process conversion tracking events',
    'Track user segment updates',
    'Handle creative asset updates',
    'Process frequency capping events',
  ],
  logistics: [
    'Track shipment status updates',
    'Process delivery confirmation events',
    'Aggregate route optimization data',
    'Handle warehouse inventory events',
    'Process customs clearance events',
    'Track container position updates',
    'Handle carrier rate updates',
    'Process return shipment events',
  ],
  media: [
    'Process video view events',
    'Track content engagement metrics',
    'Aggregate streaming quality data',
    'Handle content publish events',
    'Process subscription events',
    'Track recommendation interactions',
    'Handle content moderation events',
    'Process live stream events',
  ],
};

// Technical patterns
const TECHNICAL_PATTERNS = {
  transformation: [
    'Parse JSON messages and extract nested fields',
    'Convert XML to JSON format',
    'Transform CSV data to structured JSON',
    'Flatten nested objects into key-value pairs',
    'Merge multiple message fields into one',
    'Split array fields into individual messages',
    'Convert timestamps to different timezones',
    'Normalize field names to snake_case',
    'Redact PII fields from messages',
    'Compute aggregations over sliding windows',
  ],
  routing: [
    'Route messages based on content type',
    'Split messages to different outputs by region',
    'Route errors to a dead letter queue',
    'Fan-out messages to multiple destinations',
    'Route based on message priority',
    'Conditional routing based on field values',
    'Route to backup when primary fails',
    'Split by customer tier',
  ],
  enrichment: [
    'Add timestamp to each message',
    'Enrich with data from external API',
    'Add geolocation from IP address',
    'Look up user details from cache',
    'Add message lineage metadata',
    'Compute derived fields',
    'Add environment context',
    'Enrich from reference data',
  ],
  validation: [
    'Validate JSON schema compliance',
    'Check required fields exist',
    'Validate field value ranges',
    'Check timestamp is within expected range',
    'Validate email format',
    'Check message size limits',
    'Validate enum values',
    'Check referential integrity',
  ],
  reliability: [
    'Add retry logic for failed messages',
    'Implement circuit breaker pattern',
    'Add rate limiting',
    'Implement batching for throughput',
    'Add deduplication',
    'Implement exactly-once processing',
    'Add checkpointing',
    'Handle backpressure',
  ],
};

// Bloblang-specific challenges (common LLM mistakes)
const BLOBLANG_CHALLENGES = [
  // Timestamp handling (Go format, not Python strftime)
  'Format a timestamp as YYYY-MM-DD',
  'Convert Unix epoch to ISO 8601',
  'Parse a date string into timestamp',
  'Get current time in UTC',
  'Add 24 hours to a timestamp',
  'Extract year and month from date',
  'Format time as HH:MM:SS',
  'Convert between timezones',

  // Null handling (deleted(), not null)
  'Drop messages with null values',
  'Replace null with default value',
  'Filter out empty messages',
  'Handle missing fields gracefully',
  'Check if field is null or empty',

  // Array operations
  'Filter array elements by condition',
  'Map over array and transform each element',
  'Reduce array to single value',
  'Get first/last element of array',
  'Flatten nested arrays',
  'Sort array by field',
  'Remove duplicates from array',
  'Find element in array',

  // String operations
  'Parse JSON string into object',
  'Extract substring by regex',
  'Replace characters in string',
  'Split string into array',
  'Join array into string',
  'Trim whitespace',
  'Convert to uppercase/lowercase',
  'Check if string contains pattern',

  // Math operations
  'Calculate average of array',
  'Round number to decimal places',
  'Generate random number',
  'Calculate percentage',
  'Sum array of numbers',
  'Find min/max value',

  // Object operations
  'Merge two objects',
  'Remove fields from object',
  'Rename object keys',
  'Deep clone object',
  'Get all keys from object',
  'Check if key exists',
];

// Adversarial patterns (designed to trigger LLM mistakes)
const ADVERSARIAL_PROMPTS = [
  // Python/JavaScript syntax bleeding
  'Create a pipeline that uses strftime for date formatting',
  'Build a pipeline with if-then-else logic in the mapping',
  'Show me a pipeline using JSON.parse() to parse data',
  'Create a pipeline that uses .map() and .filter() on arrays',
  'Build a pipeline with null checking using === null',
  'Show me a pipeline using lambda expressions',
  'Create a pipeline with async/await in processors',
  'Build a pipeline using arrow function syntax',
  'Show me a pipeline with var/let/const declarations',
  'Create a pipeline using console.log for debugging',
  'Build a pipeline with try/catch error handling',
  'Show me a pipeline using string interpolation with ${}',
  'Create a pipeline that uses datetime.strptime()',
  'Build a pipeline with list comprehensions',
  'Show me a pipeline using dict() or list()',

  // Wrong component names/fields
  'Create a pipeline with topic: instead of topics:',
  'Build a pipeline using from_json() function',
  'Show me a pipeline with time() to get current time',
  'Create a pipeline using parse_json() method',
  'Build a pipeline with components: section',
  'Show me a pipeline with multiple YAML documents using ---',
  'Create a pipeline using transform: instead of mapping:',
  'Build a pipeline with filter: processor',
  'Show me a pipeline using kafka_producer output',
  'Create a pipeline with s3: instead of aws_s3:',

  // Bloblang syntax errors
  'Create a bloblang expression using = instead of :=',
  'Build a mapping using this.field.nested syntax',
  'Show me a bloblang with semicolons between statements',
  'Create a mapping that uses return keyword',
  'Build a bloblang using double quotes for strings',
  'Show me a mapping with curly braces for blocks',

  // Architecture mistakes
  'Create a pipeline with input and output on same port',
  'Build a pipeline with circular dependencies',
  'Show me a pipeline with conflicting processor order',
  'Create a pipeline mixing sync and async patterns',
];

// Common data formats
const DATA_FORMATS = ['JSON', 'CSV', 'XML', 'Avro', 'Parquet', 'Protobuf', 'MessagePack', 'YAML', 'NDJSON', 'TSV'];

// Common requirements
const REQUIREMENTS = [
  'with error handling',
  'with retry logic',
  'with batching',
  'with rate limiting',
  'with deduplication',
  'with schema validation',
  'with encryption',
  'with compression',
  'with logging',
  'with metrics',
  'with tracing',
  'with circuit breaker',
  'with dead letter queue',
  'with exactly-once semantics',
  'with ordering guarantees',
  'with backpressure handling',
  '',
  '',
  '',  // Weight towards no requirements
];

// ============================================================================
// Prompt Generator
// ============================================================================

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChoices<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function getAllSources(): string[] {
  return Object.values(DATA_SOURCES).flat();
}

function getAllSinks(): string[] {
  return Object.values(DATA_SINKS).flat();
}

interface GeneratedPrompt {
  prompt: string;
  category: string;
  subcategory: string;
  expectedChallenges: string[];
}

function generateIndustryPrompt(): GeneratedPrompt {
  const industry = randomChoice(Object.keys(INDUSTRY_USE_CASES)) as keyof typeof INDUSTRY_USE_CASES;
  const useCase = randomChoice(INDUSTRY_USE_CASES[industry]);
  const source = randomChoice(getAllSources());
  const sink = randomChoice(getAllSinks());
  const requirement = randomChoice(REQUIREMENTS);

  const templates = [
    `Create a ${source} to ${sink} pipeline to ${useCase.toLowerCase()} ${requirement}`.trim(),
    `Build a data pipeline for ${industry}: ${useCase} ${requirement}`.trim(),
    `I need to ${useCase.toLowerCase()} using ${source} as input and ${sink} as output ${requirement}`.trim(),
    `${useCase}. Use ${source} for ingestion and ${sink} for storage ${requirement}`.trim(),
  ];

  return {
    prompt: randomChoice(templates),
    category: 'industry',
    subcategory: industry,
    expectedChallenges: [],
  };
}

function generateTechnicalPrompt(): GeneratedPrompt {
  const pattern = randomChoice(Object.keys(TECHNICAL_PATTERNS)) as keyof typeof TECHNICAL_PATTERNS;
  const task = randomChoice(TECHNICAL_PATTERNS[pattern]);
  const source = randomChoice(getAllSources());
  const sink = randomChoice(getAllSinks());
  const requirement = randomChoice(REQUIREMENTS);

  const templates = [
    `Create a pipeline that reads from ${source}, ${task.toLowerCase()}, and writes to ${sink} ${requirement}`.trim(),
    `Build a ${pattern} pipeline: ${task} ${requirement}`.trim(),
    `${task}. Input from ${source}, output to ${sink} ${requirement}`.trim(),
    `I need a pipeline to ${task.toLowerCase()} ${requirement}`.trim(),
  ];

  return {
    prompt: randomChoice(templates),
    category: 'technical',
    subcategory: pattern,
    expectedChallenges: [],
  };
}

function generateBloblangPrompt(): GeneratedPrompt {
  const challenge = randomChoice(BLOBLANG_CHALLENGES);
  const source = randomChoice(getAllSources());
  const sink = randomChoice(getAllSinks());

  const templates = [
    `Create a ${source} to ${sink} pipeline that uses bloblang to: ${challenge}`,
    `Build a mapping processor that will ${challenge.toLowerCase()}`,
    `Show me how to ${challenge.toLowerCase()} in a data pipeline`,
    `I need to ${challenge.toLowerCase()} in my pipeline's processor`,
  ];

  // Identify expected issues
  const expectedChallenges: string[] = [];
  if (challenge.toLowerCase().includes('timestamp') || challenge.toLowerCase().includes('date') || challenge.toLowerCase().includes('time')) {
    expectedChallenges.push('TIMESTAMP_FORMAT');
  }
  if (challenge.toLowerCase().includes('null') || challenge.toLowerCase().includes('empty') || challenge.toLowerCase().includes('missing')) {
    expectedChallenges.push('NULL_HANDLING');
  }
  if (challenge.toLowerCase().includes('array') || challenge.toLowerCase().includes('filter') || challenge.toLowerCase().includes('map')) {
    expectedChallenges.push('ARRAY_OPERATIONS');
  }

  return {
    prompt: randomChoice(templates),
    category: 'bloblang',
    subcategory: 'challenge',
    expectedChallenges,
  };
}

function generateAdversarialPrompt(): GeneratedPrompt {
  const adversarial = randomChoice(ADVERSARIAL_PROMPTS);

  // Identify expected issues
  const expectedChallenges: string[] = [];
  if (adversarial.includes('strftime') || adversarial.includes('datetime')) {
    expectedChallenges.push('PYTHON_DATETIME');
  }
  if (adversarial.includes('JSON.parse') || adversarial.includes('console.log') || adversarial.includes('===')) {
    expectedChallenges.push('JAVASCRIPT_SYNTAX');
  }
  if (adversarial.includes('topic:') && !adversarial.includes('topics:')) {
    expectedChallenges.push('KAFKA_TOPIC_SINGULAR');
  }
  if (adversarial.includes('time()')) {
    expectedChallenges.push('WRONG_FUNCTION_NAME');
  }
  if (adversarial.includes('null')) {
    expectedChallenges.push('NULL_VS_DELETED');
  }

  return {
    prompt: adversarial,
    category: 'adversarial',
    subcategory: 'hallucination_trigger',
    expectedChallenges,
  };
}

function generateFormatConversionPrompt(): GeneratedPrompt {
  const fromFormat = randomChoice(DATA_FORMATS);
  const toFormat = randomChoice(DATA_FORMATS.filter(f => f !== fromFormat));
  const source = randomChoice(getAllSources());
  const sink = randomChoice(getAllSinks());
  const requirement = randomChoice(REQUIREMENTS);

  return {
    prompt: `Convert ${fromFormat} data from ${source} to ${toFormat} format and send to ${sink} ${requirement}`.trim(),
    category: 'format_conversion',
    subcategory: `${fromFormat}_to_${toFormat}`,
    expectedChallenges: [],
  };
}

function generateComponentCombinationPrompt(): GeneratedPrompt {
  const sourceType = randomChoice(Object.keys(DATA_SOURCES)) as keyof typeof DATA_SOURCES;
  const sinkType = randomChoice(Object.keys(DATA_SINKS)) as keyof typeof DATA_SINKS;
  const source = randomChoice(DATA_SOURCES[sourceType]);
  const sink = randomChoice(DATA_SINKS[sinkType]);
  const requirement = randomChoice(REQUIREMENTS);

  const templates = [
    `Create a ${source} to ${sink} pipeline ${requirement}`.trim(),
    `Build a pipeline reading from ${source} and writing to ${sink} ${requirement}`.trim(),
    `Connect ${source} input to ${sink} output ${requirement}`.trim(),
    `I need to stream data from ${source} to ${sink} ${requirement}`.trim(),
  ];

  return {
    prompt: randomChoice(templates),
    category: 'component',
    subcategory: `${sourceType}_to_${sinkType}`,
    expectedChallenges: [],
  };
}

function generateMigrationPrompt(): GeneratedPrompt {
  const oldTech = randomChoice(['RabbitMQ', 'ActiveMQ', 'Fluentd', 'Logstash', 'Apache NiFi', 'Kafka Connect', 'AWS Glue', 'Airflow']);
  const source = randomChoice(getAllSources());
  const sink = randomChoice(getAllSinks());

  const templates = [
    `Migrate my ${oldTech} pipeline to Benthos. It reads from ${source} and writes to ${sink}`,
    `Replace ${oldTech} with a Benthos pipeline for ${source} to ${sink}`,
    `Convert this ${oldTech} config to Benthos YAML`,
    `I'm switching from ${oldTech} to Benthos, help me create equivalent pipeline`,
  ];

  return {
    prompt: randomChoice(templates),
    category: 'migration',
    subcategory: oldTech.toLowerCase().replace(' ', '_'),
    expectedChallenges: [],
  };
}

function generatePrompt(): GeneratedPrompt {
  const rand = Math.random();

  if (rand < 0.25) return generateIndustryPrompt();
  if (rand < 0.45) return generateTechnicalPrompt();
  if (rand < 0.60) return generateBloblangPrompt();
  if (rand < 0.75) return generateAdversarialPrompt();
  if (rand < 0.85) return generateComponentCombinationPrompt();
  if (rand < 0.92) return generateFormatConversionPrompt();
  return generateMigrationPrompt();
}

// ============================================================================
// API Clients
// ============================================================================

interface ChatResponse {
  response: string;
  sources?: Array<{ title: string; url: string }>;
  error?: string;
}

interface ValidationResponse {
  valid: boolean;
  error_count: number;
  hallucinations: Array<{
    category: string;
    severity: string;
    path: string;
    hallucination: string;
    correction?: string;
    message: string;
    line?: number;
  }>;
  corrected_yaml?: string;
  formatted_yaml?: string;
}

async function sendChatRequest(targetUrl: string, prompt: string): Promise<ChatResponse> {
  const response = await fetch(`${targetUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function validateYaml(yaml: string): Promise<ValidationResponse> {
  const response = await fetch('https://validate.expanso.io/validate?auto_correct=true', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: yaml,
  });

  if (!response.ok && response.status !== 422) {
    throw new Error(`Validation API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function extractYamlBlocks(text: string): string[] {
  const blocks: string[] = [];
  const matches = text.matchAll(/```(?:yaml|yml)?\n([\s\S]*?)```/g);

  for (const match of matches) {
    const yaml = match[1].trim();
    if (yaml.includes('input') || yaml.includes('output') || yaml.includes('pipeline')) {
      blocks.push(yaml);
    }
  }

  return blocks;
}

// ============================================================================
// Result Types
// ============================================================================

interface TestResult {
  id: string;
  timestamp: string;
  prompt: string;
  category: string;
  subcategory: string;
  expectedChallenges: string[];

  responseText: string;
  yamlGenerated: boolean;
  yamlBlocks: string[];

  validationResults: Array<{
    yaml: string;
    valid: boolean;
    errorCount: number;
    hallucinations: ValidationResponse['hallucinations'];
    correctedYaml?: string;
    formattedYaml?: string;
    wasCorrected: boolean;
  }>;

  allValid: boolean;
  anyHallucinations: boolean;
  totalErrors: number;
  hallucinationCategories: string[];

  chatLatencyMs: number;
  validationLatencyMs: number;
}

interface ValidatorCorpusEntry {
  id: string;
  prompt: string;
  category: string;
  original_yaml: string;
  expected_valid: boolean;
  expected_errors: string[];
  corrected_yaml?: string;
  hallucination_categories: string[];
}

// ============================================================================
// Configuration
// ============================================================================

interface Config {
  targetUrl: string;
  outputFile: string;
  exportFile: string;
  maxCount: number;
  resumeFromFile: boolean;
  requestsPerSecond: number;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    targetUrl: 'https://mcp.expanso.io',
    outputFile: 'data/test-corpus.jsonl',
    exportFile: 'data/validator-corpus.jsonl',
    maxCount: 1000,
    resumeFromFile: false,
    requestsPerSecond: 2,
  };

  for (const arg of args) {
    if (arg.startsWith('--target=')) {
      config.targetUrl = arg.slice('--target='.length);
    } else if (arg.startsWith('--output=')) {
      config.outputFile = arg.slice('--output='.length);
    } else if (arg.startsWith('--export=')) {
      config.exportFile = arg.slice('--export='.length);
    } else if (arg.startsWith('--count=')) {
      config.maxCount = parseInt(arg.slice('--count='.length), 10);
    } else if (arg === '--resume') {
      config.resumeFromFile = true;
    } else if (arg.startsWith('--rate=')) {
      config.requestsPerSecond = parseFloat(arg.slice('--rate='.length));
    }
  }

  return config;
}

// ============================================================================
// Main Logic
// ============================================================================

function generateId(): string {
  return `corpus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest(config: Config, generated: GeneratedPrompt): Promise<TestResult> {
  const id = generateId();
  const timestamp = new Date().toISOString();

  const chatStart = Date.now();
  const chatResponse = await sendChatRequest(config.targetUrl, generated.prompt);
  const chatLatencyMs = Date.now() - chatStart;

  const yamlBlocks = extractYamlBlocks(chatResponse.response);
  const yamlGenerated = yamlBlocks.length > 0;

  const validationStart = Date.now();
  const validationResults: TestResult['validationResults'] = [];

  for (const yaml of yamlBlocks) {
    try {
      const validation = await validateYaml(yaml);
      validationResults.push({
        yaml,
        valid: validation.valid,
        errorCount: validation.error_count,
        hallucinations: validation.hallucinations,
        correctedYaml: validation.corrected_yaml,
        formattedYaml: validation.formatted_yaml,
        wasCorrected: !validation.valid && !!validation.corrected_yaml,
      });
    } catch (error) {
      validationResults.push({
        yaml,
        valid: false,
        errorCount: 1,
        hallucinations: [{
          category: 'VALIDATION_ERROR',
          severity: 'ERROR',
          path: 'root',
          hallucination: 'validation_failed',
          message: error instanceof Error ? error.message : String(error),
        }],
        wasCorrected: false,
      });
    }
  }

  const validationLatencyMs = Date.now() - validationStart;

  const allValid = validationResults.every(r => r.valid);
  const anyHallucinations = validationResults.some(r => r.hallucinations.length > 0);
  const totalErrors = validationResults.reduce((sum, r) => sum + r.errorCount, 0);
  const hallucinationCategories = [...new Set(
    validationResults.flatMap(r => r.hallucinations.map(h => h.category))
  )];

  return {
    id,
    timestamp,
    prompt: generated.prompt,
    category: generated.category,
    subcategory: generated.subcategory,
    expectedChallenges: generated.expectedChallenges,
    responseText: chatResponse.response,
    yamlGenerated,
    yamlBlocks,
    validationResults,
    allValid,
    anyHallucinations,
    totalErrors,
    hallucinationCategories,
    chatLatencyMs,
    validationLatencyMs,
  };
}

function appendResult(outputFile: string, result: TestResult): void {
  const line = JSON.stringify(result) + '\n';
  fs.appendFileSync(outputFile, line);
}

function countExistingResults(outputFile: string): number {
  if (!fs.existsSync(outputFile)) return 0;
  const content = fs.readFileSync(outputFile, 'utf-8');
  return content.split('\n').filter(line => line.trim()).length;
}

function exportValidatorCorpus(inputFile: string, outputFile: string): void {
  console.log(`\n📦 Exporting validator corpus to ${outputFile}...`);

  if (!fs.existsSync(inputFile)) {
    console.log('❌ Input file not found');
    return;
  }

  const lines = fs.readFileSync(inputFile, 'utf-8').split('\n').filter(l => l.trim());
  const corpus: ValidatorCorpusEntry[] = [];

  for (const line of lines) {
    try {
      const result: TestResult = JSON.parse(line);

      for (const validation of result.validationResults) {
        corpus.push({
          id: `${result.id}_${corpus.length}`,
          prompt: result.prompt,
          category: result.category,
          original_yaml: validation.yaml,
          expected_valid: validation.valid,
          expected_errors: validation.hallucinations.map(h => h.message),
          corrected_yaml: validation.correctedYaml,
          hallucination_categories: validation.hallucinations.map(h => h.category),
        });
      }
    } catch {
      // Skip malformed lines
    }
  }

  fs.writeFileSync(outputFile, corpus.map(e => JSON.stringify(e)).join('\n') + '\n');

  // Also create a summary
  const validCount = corpus.filter(e => e.expected_valid).length;
  const invalidCount = corpus.filter(e => !e.expected_valid).length;
  const withCorrections = corpus.filter(e => e.corrected_yaml).length;

  const categoryCounts: Record<string, number> = {};
  for (const entry of corpus) {
    for (const cat of entry.hallucination_categories) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  console.log(`\n📊 Corpus Summary:`);
  console.log(`   Total YAML samples: ${corpus.length}`);
  console.log(`   Valid:              ${validCount} (${(100 * validCount / corpus.length).toFixed(1)}%)`);
  console.log(`   Invalid:            ${invalidCount} (${(100 * invalidCount / corpus.length).toFixed(1)}%)`);
  console.log(`   With corrections:   ${withCorrections}`);
  console.log(`\n   Hallucination categories:`);
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${cat}: ${count}`);
  }
}

interface Stats {
  total: number;
  withYaml: number;
  valid: number;
  invalid: number;
  corrected: number;
  byCategory: Record<string, { total: number; invalid: number }>;
  hallucinationTypes: Record<string, number>;
}

function printStats(stats: Stats): void {
  console.log('\n📊 Progress Statistics:');
  console.log(`   Total tests:      ${stats.total}`);
  console.log(`   With YAML:        ${stats.withYaml} (${(100 * stats.withYaml / stats.total).toFixed(1)}%)`);
  console.log(`   Valid:            ${stats.valid} (${(100 * stats.valid / (stats.withYaml || 1)).toFixed(1)}%)`);
  console.log(`   Invalid:          ${stats.invalid} (${(100 * stats.invalid / (stats.withYaml || 1)).toFixed(1)}%)`);
  console.log(`   Auto-corrected:   ${stats.corrected}`);
}

async function main(): Promise<void> {
  const config = parseArgs();

  console.log('🎯 Test Corpus Generator for validate.expanso.io');
  console.log('=================================================');
  console.log(`Target:     ${config.targetUrl}`);
  console.log(`Output:     ${config.outputFile}`);
  console.log(`Export:     ${config.exportFile}`);
  console.log(`Count:      ${config.maxCount}`);
  console.log(`Rate:       ${config.requestsPerSecond} req/sec`);
  console.log('');

  // Ensure output directory exists
  const outputDir = path.dirname(config.outputFile);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let startIndex = 0;
  if (config.resumeFromFile) {
    startIndex = countExistingResults(config.outputFile);
    if (startIndex > 0) {
      console.log(`📂 Resuming from position ${startIndex}`);
    }
  }

  const stats: Stats = {
    total: 0,
    withYaml: 0,
    valid: 0,
    invalid: 0,
    corrected: 0,
    byCategory: {},
    hallucinationTypes: {},
  };

  const delayMs = 1000 / config.requestsPerSecond;
  let testIndex = startIndex;

  console.log('🚀 Starting corpus generation... (Ctrl+C to stop)\n');

  let running = true;
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping...');
    running = false;
  });

  while (running && testIndex < startIndex + config.maxCount) {
    const generated = generatePrompt();

    try {
      const result = await runTest(config, generated);
      appendResult(config.outputFile, result);

      stats.total++;

      if (!stats.byCategory[result.category]) {
        stats.byCategory[result.category] = { total: 0, invalid: 0 };
      }
      stats.byCategory[result.category].total++;

      if (result.yamlGenerated) {
        stats.withYaml++;
        if (result.allValid) {
          stats.valid++;
        } else {
          stats.invalid++;
          stats.byCategory[result.category].invalid++;
        }
        const correctedCount = result.validationResults.filter(r => r.wasCorrected).length;
        stats.corrected += correctedCount;

        for (const cat of result.hallucinationCategories) {
          stats.hallucinationTypes[cat] = (stats.hallucinationTypes[cat] || 0) + 1;
        }
      }

      const status = result.yamlGenerated
        ? (result.allValid ? '✅' : '❌')
        : '⏭️';
      const errorInfo = result.totalErrors > 0
        ? ` [${result.hallucinationCategories.join(', ')}]`
        : '';
      console.log(`${status} #${testIndex + 1} [${result.category}/${result.subcategory}] ${result.prompt.slice(0, 50)}...${errorInfo}`);

      testIndex++;

      if (stats.total % 100 === 0) {
        printStats(stats);
        console.log('');
      }

    } catch (error) {
      console.error(`💥 Error on test #${testIndex + 1}:`, error instanceof Error ? error.message : error);
    }

    await sleep(delayMs);
  }

  printStats(stats);
  console.log(`\n✅ Results saved to: ${config.outputFile}`);

  // Export validator corpus
  exportValidatorCorpus(config.outputFile, config.exportFile);

  console.log(`\n📦 Validator corpus exported to: ${config.exportFile}`);
  console.log('   Use this file to test validate.expanso.io catches all patterns');
}

main().catch(console.error);
