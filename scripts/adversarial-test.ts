#!/usr/bin/env npx tsx
/**
 * Adversarial Testing Script for MCP Chat
 *
 * Continuously generates prompts, sends them to the chat API,
 * validates the generated YAML, and records results for training.
 *
 * Usage:
 *   npx tsx scripts/adversarial-test.ts [options]
 *
 * Options:
 *   --target=<url>     Target API (default: https://mcp.expanso.io)
 *   --output=<file>    Output JSONL file (default: data/adversarial-results.jsonl)
 *   --count=<n>        Number of tests to run (default: unlimited)
 *   --resume           Resume from last position in output file
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

interface Config {
  targetUrl: string;
  outputFile: string;
  maxCount: number;
  resumeFromFile: boolean;
  requestsPerSecond: number;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    targetUrl: 'https://mcp.expanso.io',
    outputFile: 'data/adversarial-results.jsonl',
    maxCount: Infinity,
    resumeFromFile: false,
    requestsPerSecond: 1,
  };

  for (const arg of args) {
    if (arg.startsWith('--target=')) {
      config.targetUrl = arg.slice('--target='.length);
    } else if (arg.startsWith('--output=')) {
      config.outputFile = arg.slice('--output='.length);
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
// Prompt Generator
// ============================================================================

const INPUTS = [
  'kafka', 'aws_s3', 'http_server', 'file', 'stdin', 'mqtt', 'amqp',
  'redis_streams', 'gcp_pubsub', 'azure_blob_storage', 'nats', 'websocket',
  'generate', 'aws_sqs', 'aws_kinesis', 'elasticsearch', 'mongodb',
];

const OUTPUTS = [
  'kafka', 'aws_s3', 'http_client', 'file', 'stdout', 'mqtt', 'amqp',
  'redis_streams', 'gcp_pubsub', 'azure_blob_storage', 'nats', 'websocket',
  'aws_sqs', 'aws_kinesis', 'elasticsearch', 'mongodb', 'postgresql',
];

const PROCESSORS = [
  'mapping', 'jq', 'grok', 'split', 'archive', 'unarchive', 'compress',
  'decompress', 'branch', 'switch', 'cache', 'dedupe', 'rate_limit',
  'retry', 'sleep', 'log', 'metric', 'http', 'aws_lambda',
];

const USE_CASES = [
  'log parsing and enrichment',
  'real-time data transformation',
  'event aggregation',
  'message filtering',
  'format conversion (JSON to CSV)',
  'data validation',
  'schema transformation',
  'message routing',
  'dead letter queue handling',
  'batch processing',
  'stream processing',
  'ETL pipeline',
  'CDC replication',
  'IoT data ingestion',
  'clickstream processing',
  'log shipping',
  'metric collection',
  'alert routing',
];

const MODIFIERS = [
  'with error handling',
  'with retry logic',
  'with rate limiting',
  'with batching',
  'with compression',
  'with encryption',
  'with schema validation',
  'with filtering',
  'with deduplication',
  'with timestamp enrichment',
  'with field mapping',
  'with conditional routing',
  '',  // No modifier
  '',  // No modifier (weighted)
  '',  // No modifier (weighted)
];

const BLOBLANG_CHALLENGES = [
  'Parse a timestamp in format YYYY-MM-DD HH:MM:SS',
  'Extract email addresses from a string',
  'Calculate the sum of an array field',
  'Convert a nested object to a flat structure',
  'Filter array elements based on a condition',
  'Generate a UUID for each message',
  'Hash a field value using SHA256',
  'Format a number as currency',
  'Parse and validate a JSON string field',
  'Merge two object fields',
  'Convert unix timestamp to ISO format',
  'Extract hostname from a URL',
  'Truncate a string to 100 characters',
  'Convert camelCase to snake_case',
  'Check if a field matches a regex pattern',
];

const ADVERSARIAL_PATTERNS = [
  // These prompt patterns are designed to trigger common LLM mistakes
  'Create a pipeline that uses Python to process messages',
  'Show me a pipeline with if-then-else logic',
  'Create a pipeline that uses from_json() to parse data',
  'Build a pipeline with multiple YAML documents separated by ---',
  'Create a pipeline using the components: section',
  'Show me a pipeline that uses strftime for date formatting',
  'Build a pipeline with arrow function syntax in mapping',
  'Create a pipeline that uses .map() on an array',
  'Show me a pipeline with var declarations in bloblang',
  'Create a pipeline using null instead of deleted()',
  'Build a pipeline that uses time() function',
  'Show me a pipeline with JSON.parse() in bloblang',
  'Create a pipeline using lambda expressions',
  'Build a pipeline with async/await in processors',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePrompt(): { prompt: string; category: string } {
  const rand = Math.random();

  // 20% adversarial patterns (designed to trigger mistakes)
  if (rand < 0.2) {
    return {
      prompt: randomChoice(ADVERSARIAL_PATTERNS),
      category: 'adversarial',
    };
  }

  // 20% bloblang challenges
  if (rand < 0.4) {
    const challenge = randomChoice(BLOBLANG_CHALLENGES);
    const input = randomChoice(INPUTS);
    const output = randomChoice(OUTPUTS);
    return {
      prompt: `Create a ${input} to ${output} pipeline that: ${challenge}`,
      category: 'bloblang',
    };
  }

  // 30% use case based
  if (rand < 0.7) {
    const useCase = randomChoice(USE_CASES);
    const modifier = randomChoice(MODIFIERS);
    const prompt = modifier
      ? `Create a pipeline for ${useCase} ${modifier}`
      : `Create a pipeline for ${useCase}`;
    return { prompt, category: 'use_case' };
  }

  // 30% component combination
  const input = randomChoice(INPUTS);
  const output = randomChoice(OUTPUTS);
  const processor = randomChoice(PROCESSORS);
  const modifier = randomChoice(MODIFIERS);

  const prompts = [
    `Create a ${input} to ${output} pipeline ${modifier}`.trim(),
    `Show me a pipeline from ${input} to ${output} using ${processor}`,
    `Build a ${input} pipeline that writes to ${output} ${modifier}`.trim(),
    `I need to read from ${input} and write to ${output}`,
  ];

  return {
    prompt: randomChoice(prompts),
    category: 'component',
  };
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

  // 422 is a valid response (validation failed), read the body
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
// Result Recording
// ============================================================================

interface TestResult {
  id: string;
  timestamp: string;
  prompt: string;
  category: string;

  // Chat response
  responseText: string;
  yamlGenerated: boolean;
  yamlBlocks: string[];

  // Validation results
  validationResults: Array<{
    yaml: string;
    valid: boolean;
    errorCount: number;
    hallucinations: ValidationResponse['hallucinations'];
    correctedYaml?: string;
    wasCorrected: boolean;
  }>;

  // Summary
  allValid: boolean;
  anyHallucinations: boolean;
  totalErrors: number;
  categories: string[];  // Hallucination categories found

  // Timing
  chatLatencyMs: number;
  validationLatencyMs: number;
}

function generateId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// Main Loop
// ============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest(config: Config, prompt: string, category: string): Promise<TestResult> {
  const id = generateId();
  const timestamp = new Date().toISOString();

  // Send chat request
  const chatStart = Date.now();
  const chatResponse = await sendChatRequest(config.targetUrl, prompt);
  const chatLatencyMs = Date.now() - chatStart;

  // Extract YAML blocks
  const yamlBlocks = extractYamlBlocks(chatResponse.response);
  const yamlGenerated = yamlBlocks.length > 0;

  // Validate each YAML block
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

  // Compute summary
  const allValid = validationResults.every(r => r.valid);
  const anyHallucinations = validationResults.some(r => r.hallucinations.length > 0);
  const totalErrors = validationResults.reduce((sum, r) => sum + r.errorCount, 0);
  const categories = [...new Set(
    validationResults.flatMap(r => r.hallucinations.map(h => h.category))
  )];

  return {
    id,
    timestamp,
    prompt,
    category,
    responseText: chatResponse.response,
    yamlGenerated,
    yamlBlocks,
    validationResults,
    allValid,
    anyHallucinations,
    totalErrors,
    categories,
    chatLatencyMs,
    validationLatencyMs,
  };
}

function appendResult(outputFile: string, result: TestResult): void {
  const line = JSON.stringify(result) + '\n';
  fs.appendFileSync(outputFile, line);
}

function countExistingResults(outputFile: string): number {
  if (!fs.existsSync(outputFile)) {
    return 0;
  }
  const content = fs.readFileSync(outputFile, 'utf-8');
  return content.split('\n').filter(line => line.trim()).length;
}

interface Stats {
  total: number;
  withYaml: number;
  valid: number;
  invalid: number;
  corrected: number;
  byCategory: Record<string, number>;
  hallucinationTypes: Record<string, number>;
}

function printStats(stats: Stats): void {
  console.log('\n📊 Statistics:');
  console.log(`   Total tests:      ${stats.total}`);
  console.log(`   With YAML:        ${stats.withYaml} (${(100 * stats.withYaml / stats.total).toFixed(1)}%)`);
  console.log(`   Valid:            ${stats.valid} (${(100 * stats.valid / stats.withYaml || 0).toFixed(1)}%)`);
  console.log(`   Invalid:          ${stats.invalid} (${(100 * stats.invalid / stats.withYaml || 0).toFixed(1)}%)`);
  console.log(`   Auto-corrected:   ${stats.corrected}`);
  console.log('\n   By prompt category:');
  for (const [cat, count] of Object.entries(stats.byCategory)) {
    console.log(`     ${cat}: ${count}`);
  }
  if (Object.keys(stats.hallucinationTypes).length > 0) {
    console.log('\n   Hallucination types:');
    for (const [type, count] of Object.entries(stats.hallucinationTypes)) {
      console.log(`     ${type}: ${count}`);
    }
  }
}

async function main(): Promise<void> {
  const config = parseArgs();

  console.log('🎯 Adversarial Testing Script');
  console.log('==============================');
  console.log(`Target:     ${config.targetUrl}`);
  console.log(`Output:     ${config.outputFile}`);
  console.log(`Max count:  ${config.maxCount === Infinity ? 'unlimited' : config.maxCount}`);
  console.log(`Rate:       ${config.requestsPerSecond} req/sec`);
  console.log('');

  // Ensure output directory exists
  const outputDir = path.dirname(config.outputFile);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Check for resume
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

  console.log('🚀 Starting tests... (Ctrl+C to stop)\n');

  // Handle graceful shutdown
  let running = true;
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping...');
    running = false;
  });

  while (running && testIndex < startIndex + config.maxCount) {
    const { prompt, category } = generatePrompt();

    try {
      const result = await runTest(config, prompt, category);
      appendResult(config.outputFile, result);

      // Update stats
      stats.total++;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      if (result.yamlGenerated) {
        stats.withYaml++;
        if (result.allValid) {
          stats.valid++;
        } else {
          stats.invalid++;
        }
        const correctedCount = result.validationResults.filter(r => r.wasCorrected).length;
        stats.corrected += correctedCount;

        for (const cat of result.categories) {
          stats.hallucinationTypes[cat] = (stats.hallucinationTypes[cat] || 0) + 1;
        }
      }

      // Progress output
      const status = result.yamlGenerated
        ? (result.allValid ? '✅' : '❌')
        : '⏭️';
      const errorInfo = result.totalErrors > 0
        ? ` [${result.totalErrors} errors: ${result.categories.join(', ')}]`
        : '';
      console.log(`${status} #${testIndex + 1} [${category}] ${prompt.slice(0, 60)}...${errorInfo}`);

      testIndex++;

      // Print stats every 100 tests
      if (stats.total % 100 === 0) {
        printStats(stats);
        console.log('');
      }

    } catch (error) {
      console.error(`💥 Error on test #${testIndex + 1}:`, error);
      // Continue despite errors
    }

    // Rate limiting
    await sleep(delayMs);
  }

  // Final stats
  printStats(stats);
  console.log(`\n✅ Results saved to: ${config.outputFile}`);
}

main().catch(console.error);
