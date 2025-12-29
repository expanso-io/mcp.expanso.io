/**
 * Test Data Generator
 *
 * Generates sample input data for testing pipelines.
 * Supports schema-based, example-based, and pipeline-analysis generation.
 */

import * as yaml from 'yaml';

// ============================================================================
// Types
// ============================================================================

export interface TestDataSchema {
  [key: string]: string | TestDataSchema | TestDataSchema[];
}

export interface GenerateTestDataInput {
  schema?: TestDataSchema | Record<string, unknown>;
  pipeline_yaml?: string;
  count?: number;
  format?: 'json' | 'jsonl' | 'csv' | 'yaml';
}

export interface GenerateTestDataResult {
  success: boolean;
  data: string;
  format: string;
  count: number;
  schema_used?: TestDataSchema;
  errors?: string[];
}

// ============================================================================
// Random Data Generators
// ============================================================================

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael',
  'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan',
  'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Emma',
  'Oliver', 'Ava', 'Noah', 'Isabella', 'Liam', 'Sophia', 'Mason',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
];

const DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'example.com',
  'company.org', 'business.net', 'work.io', 'mail.com', 'test.dev',
];

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
  'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore',
  'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam',
  'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi',
];

/**
 * Generate a random UUID v4
 */
export function generateUuid(): string {
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4';
    } else if (i === 19) {
      uuid += hex[Math.floor(Math.random() * 4) + 8];
    } else {
      uuid += hex[Math.floor(Math.random() * 16)];
    }
  }
  return uuid;
}

/**
 * Generate a random realistic name
 */
export function generateName(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

/**
 * Generate a random email address
 */
export function generateEmail(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)].toLowerCase();
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)].toLowerCase();
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${first}.${last}${num}@${domain}`;
}

/**
 * Generate a random ISO 8601 timestamp
 */
export function generateTimestamp(): string {
  // Generate timestamp within last 30 days
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const randomTime = thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo);
  return new Date(randomTime).toISOString();
}

/**
 * Generate a random number, optionally within a range
 */
export function generateNumber(min: number = 0, max: number = 1000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random boolean
 */
export function generateBoolean(): boolean {
  return Math.random() > 0.5;
}

/**
 * Generate lorem ipsum string
 */
export function generateString(wordCount: number = 5): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
  }
  return words.join(' ');
}

// ============================================================================
// Type Detection and Parsing
// ============================================================================

/**
 * Parse type specification like "number:10:100" or "string"
 */
export function parseTypeSpec(typeSpec: string): { type: string; min?: number; max?: number } {
  const parts = typeSpec.split(':');
  const type = parts[0].toLowerCase();

  if (type === 'number' && parts.length === 3) {
    return {
      type: 'number',
      min: parseInt(parts[1], 10),
      max: parseInt(parts[2], 10),
    };
  }

  return { type };
}

/**
 * Generate value based on type specification
 */
export function generateValueForType(typeSpec: string): unknown {
  const parsed = parseTypeSpec(typeSpec);

  switch (parsed.type) {
    case 'uuid':
      return generateUuid();
    case 'name':
      return generateName();
    case 'email':
      return generateEmail();
    case 'timestamp':
    case 'datetime':
    case 'date':
      return generateTimestamp();
    case 'number':
    case 'integer':
    case 'int':
      return generateNumber(parsed.min, parsed.max);
    case 'boolean':
    case 'bool':
      return generateBoolean();
    case 'string':
    default:
      return generateString();
  }
}

/**
 * Infer type from example value
 */
export function inferTypeFromValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'string';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (typeof value === 'string') {
    // Check for common patterns
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      return 'uuid';
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return 'timestamp';
    }
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
      return 'email';
    }
    if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(value)) {
      return 'name';
    }
    return 'string';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (typeof value === 'object') {
    return 'object';
  }

  return 'string';
}

// ============================================================================
// Schema Processing
// ============================================================================

/**
 * Generate a single record from a schema
 */
export function generateRecordFromSchema(schema: TestDataSchema | Record<string, unknown>): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (typeof value === 'string') {
      // Type specification
      record[key] = generateValueForType(value);
    } else if (Array.isArray(value) && value.length > 0) {
      // Array of objects - generate 1-3 items
      const count = Math.floor(Math.random() * 3) + 1;
      const items: Record<string, unknown>[] = [];
      for (let i = 0; i < count; i++) {
        items.push(generateRecordFromSchema(value[0] as TestDataSchema));
      }
      record[key] = items;
    } else if (typeof value === 'object' && value !== null) {
      // Nested object
      record[key] = generateRecordFromSchema(value as TestDataSchema);
    } else {
      // Use inferred type from example value
      const inferredType = inferTypeFromValue(value);
      record[key] = generateValueForType(inferredType);
    }
  }

  return record;
}

/**
 * Convert example object to schema
 */
export function exampleToSchema(example: Record<string, unknown>): TestDataSchema {
  const schema: TestDataSchema = {};

  for (const [key, value] of Object.entries(example)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      schema[key] = [exampleToSchema(value[0] as Record<string, unknown>)];
    } else if (typeof value === 'object' && value !== null) {
      schema[key] = exampleToSchema(value as Record<string, unknown>);
    } else {
      schema[key] = inferTypeFromValue(value);
    }
  }

  return schema;
}

// ============================================================================
// Pipeline Analysis
// ============================================================================

/**
 * Infer input schema from pipeline YAML
 */
export function inferSchemaFromPipeline(pipelineYaml: string): TestDataSchema | null {
  try {
    const pipeline = yaml.parse(pipelineYaml);

    if (!pipeline) {
      return null;
    }

    // Look for clues in the pipeline about expected data structure
    const schema: TestDataSchema = {};

    // Check input type for hints
    const input = pipeline.input;
    if (input) {
      // HTTP input often expects JSON
      if (input.http_server || input.http_client || input.http) {
        schema.id = 'uuid';
        schema.timestamp = 'timestamp';
        schema.data = 'string';
      }
      // Kafka often has message patterns
      else if (input.kafka || input.kafka_franz) {
        schema.key = 'string';
        schema.value = 'string';
        schema.timestamp = 'timestamp';
      }
      // File/stdin input
      else if (input.file || input.stdin) {
        schema.line = 'string';
        schema.timestamp = 'timestamp';
      }
    }

    // Look at processors for field references
    const processors = pipeline.pipeline?.processors || [];
    for (const proc of processors) {
      if (proc.mapping) {
        // Extract field references from mapping
        const mappingStr = typeof proc.mapping === 'string' ? proc.mapping : '';
        const fieldRefs = extractFieldReferences(mappingStr);
        for (const field of fieldRefs) {
          if (!schema[field]) {
            schema[field] = 'string';
          }
        }
      }
    }

    // Default schema if nothing found
    if (Object.keys(schema).length === 0) {
      return {
        id: 'uuid',
        name: 'name',
        email: 'email',
        timestamp: 'timestamp',
        value: 'number',
      };
    }

    return schema;
  } catch {
    return null;
  }
}

/**
 * Extract field references from Bloblang mapping
 */
function extractFieldReferences(mapping: string): string[] {
  const fields: Set<string> = new Set();

  // Match this.field patterns
  const thisPattern = /this\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = thisPattern.exec(mapping)) !== null) {
    fields.add(match[1]);
  }

  // Match root.field = patterns
  const rootPattern = /root\.([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
  while ((match = rootPattern.exec(mapping)) !== null) {
    fields.add(match[1]);
  }

  return Array.from(fields);
}

// ============================================================================
// Output Formatting
// ============================================================================

/**
 * Format records as JSON (array)
 */
export function formatAsJson(records: Record<string, unknown>[]): string {
  return JSON.stringify(records, null, 2);
}

/**
 * Format records as JSONL (one JSON object per line)
 */
export function formatAsJsonl(records: Record<string, unknown>[]): string {
  return records.map(r => JSON.stringify(r)).join('\n');
}

/**
 * Format records as CSV
 */
export function formatAsCsv(records: Record<string, unknown>[]): string {
  if (records.length === 0) {
    return '';
  }

  // Get all unique keys
  const keys = new Set<string>();
  for (const record of records) {
    flattenKeys(record, '', keys);
  }
  const headers = Array.from(keys).sort();

  // CSV header
  const lines: string[] = [headers.map(escapeCsvField).join(',')];

  // CSV rows
  for (const record of records) {
    const flatRecord = flattenRecord(record, '');
    const row = headers.map(h => escapeCsvField(String(flatRecord[h] ?? '')));
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Get flattened keys from nested object
 */
function flattenKeys(obj: Record<string, unknown>, prefix: string, keys: Set<string>): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenKeys(value as Record<string, unknown>, fullKey, keys);
    } else {
      keys.add(fullKey);
    }
  }
}

/**
 * Flatten nested object
 */
function flattenRecord(obj: Record<string, unknown>, prefix: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenRecord(value as Record<string, unknown>, fullKey));
    } else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value);
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Escape CSV field value
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format records as YAML
 */
export function formatAsYaml(records: Record<string, unknown>[]): string {
  return yaml.stringify(records);
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate test data based on input parameters
 */
export function generateTestData(input: GenerateTestDataInput): GenerateTestDataResult {
  const format = input.format || 'jsonl';
  const count = Math.min(Math.max(input.count || 5, 1), 100);
  const errors: string[] = [];

  // Determine schema to use
  let schema: TestDataSchema;

  if (input.schema) {
    // Check if schema uses type specifications or example values
    const firstValue = Object.values(input.schema)[0];
    if (typeof firstValue === 'string' && isTypeSpecification(firstValue)) {
      schema = input.schema as TestDataSchema;
    } else {
      // Treat as example object
      schema = exampleToSchema(input.schema as Record<string, unknown>);
    }
  } else if (input.pipeline_yaml) {
    const inferredSchema = inferSchemaFromPipeline(input.pipeline_yaml);
    if (inferredSchema) {
      schema = inferredSchema;
    } else {
      errors.push('Could not infer schema from pipeline YAML, using default');
      schema = getDefaultSchema();
    }
  } else {
    schema = getDefaultSchema();
  }

  // Generate records
  const records: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    records.push(generateRecordFromSchema(schema));
  }

  // Format output
  let data: string;
  switch (format) {
    case 'json':
      data = formatAsJson(records);
      break;
    case 'jsonl':
      data = formatAsJsonl(records);
      break;
    case 'csv':
      data = formatAsCsv(records);
      break;
    case 'yaml':
      data = formatAsYaml(records);
      break;
    default:
      data = formatAsJsonl(records);
  }

  return {
    success: true,
    data,
    format,
    count: records.length,
    schema_used: schema,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Check if a string looks like a type specification
 */
function isTypeSpecification(value: string): boolean {
  const typeSpecs = ['uuid', 'name', 'email', 'timestamp', 'datetime', 'date',
                     'number', 'integer', 'int', 'boolean', 'bool', 'string'];
  const basePart = value.split(':')[0].toLowerCase();
  return typeSpecs.includes(basePart);
}

/**
 * Get default schema for generic test data
 */
function getDefaultSchema(): TestDataSchema {
  return {
    id: 'uuid',
    name: 'name',
    email: 'email',
    timestamp: 'timestamp',
    value: 'number',
    active: 'boolean',
  };
}
