/**
 * Tests for Test Data Generator
 * Validates schema-based generation, output formats, and edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  generateTestData,
  generateUuid,
  generateName,
  generateEmail,
  generateTimestamp,
  generateNumber,
  generateBoolean,
  generateString,
  parseTypeSpec,
  generateValueForType,
  inferTypeFromValue,
  generateRecordFromSchema,
  exampleToSchema,
  inferSchemaFromPipeline,
  formatAsJson,
  formatAsJsonl,
  formatAsCsv,
  formatAsYaml,
  type TestDataSchema,
  type GenerateTestDataResult,
} from './test-data-generator';

describe('Test Data Generator', () => {
  // ============================================================================
  // Individual Data Type Generators
  // ============================================================================

  describe('UUID Generation', () => {
    it('should generate valid UUID v4 format', () => {
      const uuid = generateUuid();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUuid());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('Name Generation', () => {
    it('should generate name with first and last parts', () => {
      const name = generateName();
      expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    });

    it('should generate different names', () => {
      const names = new Set<string>();
      for (let i = 0; i < 50; i++) {
        names.add(generateName());
      }
      // Should have some variety (not all identical)
      expect(names.size).toBeGreaterThan(10);
    });
  });

  describe('Email Generation', () => {
    it('should generate valid email format', () => {
      const email = generateEmail();
      const emailRegex = /^[a-z]+\.[a-z]+\d+@[a-z]+\.[a-z]+$/;
      expect(email).toMatch(emailRegex);
    });

    it('should contain @ symbol', () => {
      const email = generateEmail();
      expect(email).toContain('@');
    });
  });

  describe('Timestamp Generation', () => {
    it('should generate valid ISO 8601 format', () => {
      const timestamp = generateTimestamp();
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(timestamp).toMatch(isoRegex);
    });

    it('should generate timestamps in the past 30 days', () => {
      const timestamp = generateTimestamp();
      const date = new Date(timestamp);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      expect(date.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
      expect(date.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });

  describe('Number Generation', () => {
    it('should generate number within default range', () => {
      const num = generateNumber();
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(1000);
    });

    it('should generate number within specified range', () => {
      const num = generateNumber(10, 20);
      expect(num).toBeGreaterThanOrEqual(10);
      expect(num).toBeLessThanOrEqual(20);
    });

    it('should generate integers', () => {
      const num = generateNumber();
      expect(Number.isInteger(num)).toBe(true);
    });
  });

  describe('Boolean Generation', () => {
    it('should generate boolean values', () => {
      const bool = generateBoolean();
      expect(typeof bool).toBe('boolean');
    });

    it('should generate both true and false over many iterations', () => {
      const values = new Set<boolean>();
      for (let i = 0; i < 100; i++) {
        values.add(generateBoolean());
      }
      expect(values.has(true)).toBe(true);
      expect(values.has(false)).toBe(true);
    });
  });

  describe('String Generation', () => {
    it('should generate string with words', () => {
      const str = generateString();
      expect(typeof str).toBe('string');
      expect(str.length).toBeGreaterThan(0);
    });

    it('should generate specified word count', () => {
      const str = generateString(3);
      const words = str.split(' ');
      expect(words.length).toBe(3);
    });
  });

  // ============================================================================
  // Type Specification Parsing
  // ============================================================================

  describe('Type Specification Parsing', () => {
    it('should parse simple type', () => {
      expect(parseTypeSpec('string')).toEqual({ type: 'string' });
      expect(parseTypeSpec('uuid')).toEqual({ type: 'uuid' });
      expect(parseTypeSpec('email')).toEqual({ type: 'email' });
    });

    it('should parse number with range', () => {
      expect(parseTypeSpec('number:10:100')).toEqual({
        type: 'number',
        min: 10,
        max: 100,
      });
    });

    it('should be case insensitive', () => {
      expect(parseTypeSpec('UUID')).toEqual({ type: 'uuid' });
      expect(parseTypeSpec('STRING')).toEqual({ type: 'string' });
    });
  });

  describe('Value Generation from Type', () => {
    it('should generate UUID for uuid type', () => {
      const value = generateValueForType('uuid');
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should generate name for name type', () => {
      const value = generateValueForType('name');
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    });

    it('should generate email for email type', () => {
      const value = generateValueForType('email');
      expect(typeof value).toBe('string');
      expect(value).toContain('@');
    });

    it('should generate timestamp for timestamp type', () => {
      const value = generateValueForType('timestamp');
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should generate number for number type', () => {
      const value = generateValueForType('number');
      expect(typeof value).toBe('number');
    });

    it('should generate number in range for number:min:max type', () => {
      const value = generateValueForType('number:50:60') as number;
      expect(value).toBeGreaterThanOrEqual(50);
      expect(value).toBeLessThanOrEqual(60);
    });

    it('should generate boolean for boolean type', () => {
      const value = generateValueForType('boolean');
      expect(typeof value).toBe('boolean');
    });

    it('should generate string for string type', () => {
      const value = generateValueForType('string');
      expect(typeof value).toBe('string');
    });

    it('should handle aliases like int and bool', () => {
      expect(typeof generateValueForType('int')).toBe('number');
      expect(typeof generateValueForType('bool')).toBe('boolean');
      expect(typeof generateValueForType('datetime')).toBe('string');
    });
  });

  // ============================================================================
  // Type Inference
  // ============================================================================

  describe('Type Inference from Value', () => {
    it('should infer boolean type', () => {
      expect(inferTypeFromValue(true)).toBe('boolean');
      expect(inferTypeFromValue(false)).toBe('boolean');
    });

    it('should infer number type', () => {
      expect(inferTypeFromValue(42)).toBe('number');
      expect(inferTypeFromValue(3.14)).toBe('number');
    });

    it('should infer uuid from UUID string', () => {
      expect(inferTypeFromValue('550e8400-e29b-41d4-a716-446655440000')).toBe('uuid');
    });

    it('should infer timestamp from ISO date string', () => {
      expect(inferTypeFromValue('2024-01-15T10:30:00.000Z')).toBe('timestamp');
    });

    it('should infer email from email string', () => {
      expect(inferTypeFromValue('test@example.com')).toBe('email');
    });

    it('should infer name from name-like string', () => {
      expect(inferTypeFromValue('John Smith')).toBe('name');
    });

    it('should default to string for generic strings', () => {
      expect(inferTypeFromValue('hello world')).toBe('string');
    });

    it('should handle null and undefined', () => {
      expect(inferTypeFromValue(null)).toBe('string');
      expect(inferTypeFromValue(undefined)).toBe('string');
    });

    it('should identify arrays', () => {
      expect(inferTypeFromValue([1, 2, 3])).toBe('array');
    });

    it('should identify objects', () => {
      expect(inferTypeFromValue({ key: 'value' })).toBe('object');
    });
  });

  // ============================================================================
  // Schema Processing
  // ============================================================================

  describe('Record Generation from Schema', () => {
    it('should generate record with all schema fields', () => {
      const schema: TestDataSchema = {
        id: 'uuid',
        name: 'name',
        email: 'email',
      };

      const record = generateRecordFromSchema(schema);

      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('name');
      expect(record).toHaveProperty('email');
    });

    it('should handle nested objects', () => {
      const schema: TestDataSchema = {
        user: {
          id: 'uuid',
          name: 'name',
        },
      };

      const record = generateRecordFromSchema(schema);

      expect(record).toHaveProperty('user');
      expect(typeof record.user).toBe('object');
      expect((record.user as Record<string, unknown>).id).toBeDefined();
      expect((record.user as Record<string, unknown>).name).toBeDefined();
    });

    it('should handle arrays of objects', () => {
      const schema: TestDataSchema = {
        items: [{ id: 'uuid', name: 'string' }],
      };

      const record = generateRecordFromSchema(schema);

      expect(Array.isArray(record.items)).toBe(true);
      const items = record.items as Record<string, unknown>[];
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items[0]).toHaveProperty('id');
      expect(items[0]).toHaveProperty('name');
    });
  });

  describe('Example to Schema Conversion', () => {
    it('should convert example object to schema', () => {
      const example = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Smith',
        email: 'john@example.com',
        age: 30,
        active: true,
      };

      const schema = exampleToSchema(example);

      expect(schema.id).toBe('uuid');
      expect(schema.name).toBe('name');
      expect(schema.email).toBe('email');
      expect(schema.age).toBe('number');
      expect(schema.active).toBe('boolean');
    });

    it('should handle nested objects in examples', () => {
      const example = {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'John Smith',
        },
      };

      const schema = exampleToSchema(example);

      expect(typeof schema.user).toBe('object');
      expect((schema.user as TestDataSchema).id).toBe('uuid');
      expect((schema.user as TestDataSchema).name).toBe('name');
    });

    it('should handle arrays in examples', () => {
      const example = {
        items: [{ id: '550e8400-e29b-41d4-a716-446655440000' }],
      };

      const schema = exampleToSchema(example);

      expect(Array.isArray(schema.items)).toBe(true);
    });
  });

  // ============================================================================
  // Pipeline Analysis
  // ============================================================================

  describe('Pipeline Schema Inference', () => {
    it('should infer schema from HTTP input', () => {
      const yaml = `
input:
  http_server:
    address: 0.0.0.0:8080
output:
  stdout: {}
`;
      const schema = inferSchemaFromPipeline(yaml);

      expect(schema).not.toBeNull();
      expect(schema).toHaveProperty('id');
      expect(schema).toHaveProperty('timestamp');
    });

    it('should infer schema from Kafka input', () => {
      const yaml = `
input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - test
output:
  stdout: {}
`;
      const schema = inferSchemaFromPipeline(yaml);

      expect(schema).not.toBeNull();
      expect(schema).toHaveProperty('key');
      expect(schema).toHaveProperty('value');
    });

    it('should extract field references from mapping', () => {
      const yaml = `
input:
  stdin: {}
pipeline:
  processors:
    - mapping: |
        root.id = this.user_id
        root.name = this.user_name
        root.email = this.email_address
output:
  stdout: {}
`;
      const schema = inferSchemaFromPipeline(yaml);

      expect(schema).not.toBeNull();
      expect(schema).toHaveProperty('user_id');
      expect(schema).toHaveProperty('user_name');
      expect(schema).toHaveProperty('email_address');
    });

    it('should return default schema for minimal pipeline', () => {
      const yaml = `
input:
  generate:
    count: 10
output:
  stdout: {}
`;
      const schema = inferSchemaFromPipeline(yaml);

      expect(schema).not.toBeNull();
      expect(Object.keys(schema!).length).toBeGreaterThan(0);
    });

    it('should handle invalid YAML gracefully', () => {
      const schema = inferSchemaFromPipeline('not: valid: yaml: {{}}');
      expect(schema).toBeNull();
    });
  });

  // ============================================================================
  // Output Formatting
  // ============================================================================

  describe('JSON Format', () => {
    it('should format as valid JSON array', () => {
      const records = [
        { id: '1', name: 'Test' },
        { id: '2', name: 'Test2' },
      ];

      const json = formatAsJson(records);
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0].id).toBe('1');
    });

    it('should be pretty-printed', () => {
      const records = [{ id: '1' }];
      const json = formatAsJson(records);

      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('JSONL Format', () => {
    it('should format as one JSON object per line', () => {
      const records = [
        { id: '1', name: 'Test' },
        { id: '2', name: 'Test2' },
      ];

      const jsonl = formatAsJsonl(records);
      const lines = jsonl.split('\n');

      expect(lines.length).toBe(2);
      expect(JSON.parse(lines[0]).id).toBe('1');
      expect(JSON.parse(lines[1]).id).toBe('2');
    });

    it('should produce valid JSON on each line', () => {
      const records = [
        { id: '1', name: 'Test' },
        { id: '2', name: 'Test2' },
      ];

      const jsonl = formatAsJsonl(records);
      const lines = jsonl.split('\n');

      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });
  });

  describe('CSV Format', () => {
    it('should format as valid CSV with headers', () => {
      const records = [
        { id: '1', name: 'Test' },
        { id: '2', name: 'Test2' },
      ];

      const csv = formatAsCsv(records);
      const lines = csv.split('\n');

      expect(lines.length).toBe(3); // header + 2 rows
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('name');
    });

    it('should escape values with commas', () => {
      const records = [{ name: 'Test, with comma' }];

      const csv = formatAsCsv(records);

      expect(csv).toContain('"Test, with comma"');
    });

    it('should escape values with quotes', () => {
      const records = [{ name: 'Test "quoted" value' }];

      const csv = formatAsCsv(records);

      expect(csv).toContain('""quoted""');
    });

    it('should handle empty records', () => {
      const csv = formatAsCsv([]);
      expect(csv).toBe('');
    });

    it('should flatten nested objects', () => {
      const records = [{ user: { id: '1', name: 'Test' } }];

      const csv = formatAsCsv(records);

      expect(csv).toContain('user.id');
      expect(csv).toContain('user.name');
    });
  });

  describe('YAML Format', () => {
    it('should format as valid YAML', () => {
      const records = [
        { id: '1', name: 'Test' },
        { id: '2', name: 'Test2' },
      ];

      const yamlStr = formatAsYaml(records);

      expect(yamlStr).toContain('id:');
      expect(yamlStr).toContain('name:');
    });
  });

  // ============================================================================
  // Main Generator Function
  // ============================================================================

  describe('generateTestData', () => {
    it('should generate default data when no options provided', () => {
      const result = generateTestData({});

      expect(result.success).toBe(true);
      expect(result.count).toBe(5);
      expect(result.format).toBe('jsonl');
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should respect count parameter', () => {
      const result = generateTestData({ count: 10 });

      expect(result.count).toBe(10);
      const lines = result.data.split('\n');
      expect(lines.length).toBe(10);
    });

    it('should limit count to max 100', () => {
      const result = generateTestData({ count: 200 });

      expect(result.count).toBe(100);
    });

    it('should enforce minimum count of 1', () => {
      const result = generateTestData({ count: -5 });

      expect(result.count).toBe(1);
    });

    it('should generate data from type schema', () => {
      const result = generateTestData({
        schema: {
          id: 'uuid',
          email: 'email',
          score: 'number:1:10',
        },
        count: 3,
        format: 'json',
      });

      expect(result.success).toBe(true);
      const data = JSON.parse(result.data);
      expect(data.length).toBe(3);
      expect(data[0].id).toMatch(/^[0-9a-f-]{36}$/);
      expect(data[0].email).toContain('@');
      expect(data[0].score).toBeGreaterThanOrEqual(1);
      expect(data[0].score).toBeLessThanOrEqual(10);
    });

    it('should generate data from example schema', () => {
      const result = generateTestData({
        schema: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'John Smith',
          active: true,
          count: 42,
        },
        count: 2,
        format: 'json',
      });

      expect(result.success).toBe(true);
      const data = JSON.parse(result.data);
      expect(data.length).toBe(2);
      expect(typeof data[0].id).toBe('string');
      expect(typeof data[0].name).toBe('string');
      expect(typeof data[0].active).toBe('boolean');
      expect(typeof data[0].count).toBe('number');
    });

    it('should infer schema from pipeline YAML', () => {
      const result = generateTestData({
        pipeline_yaml: `
input:
  http_server:
    address: 0.0.0.0:8080
output:
  stdout: {}
`,
        count: 3,
        format: 'json',
      });

      expect(result.success).toBe(true);
      const data = JSON.parse(result.data);
      expect(data.length).toBe(3);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('timestamp');
    });

    it('should return schema used in result', () => {
      const result = generateTestData({
        schema: { id: 'uuid', name: 'name' },
      });

      expect(result.schema_used).toBeDefined();
      expect(result.schema_used?.id).toBe('uuid');
      expect(result.schema_used?.name).toBe('name');
    });

    describe('Output Format Support', () => {
      it('should generate JSON format', () => {
        const result = generateTestData({ format: 'json', count: 2 });

        expect(result.format).toBe('json');
        expect(() => JSON.parse(result.data)).not.toThrow();
        expect(Array.isArray(JSON.parse(result.data))).toBe(true);
      });

      it('should generate JSONL format', () => {
        const result = generateTestData({ format: 'jsonl', count: 2 });

        expect(result.format).toBe('jsonl');
        const lines = result.data.split('\n');
        expect(lines.length).toBe(2);
        for (const line of lines) {
          expect(() => JSON.parse(line)).not.toThrow();
        }
      });

      it('should generate CSV format', () => {
        const result = generateTestData({ format: 'csv', count: 2 });

        expect(result.format).toBe('csv');
        const lines = result.data.split('\n');
        expect(lines.length).toBe(3); // header + 2 data rows
        expect(lines[0]).toContain(',');
      });

      it('should generate YAML format', () => {
        const result = generateTestData({ format: 'yaml', count: 2 });

        expect(result.format).toBe('yaml');
        expect(result.data).toContain('-');
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty schema object', () => {
      const result = generateTestData({ schema: {} });

      expect(result.success).toBe(true);
      expect(result.count).toBe(5);
    });

    it('should handle schema with only unknown types', () => {
      const result = generateTestData({
        schema: { field: 'unknown_type' },
        format: 'json',
        count: 1,
      });

      expect(result.success).toBe(true);
      const data = JSON.parse(result.data);
      // Unknown types default to string
      expect(typeof data[0].field).toBe('string');
    });

    it('should handle deeply nested schemas', () => {
      const result = generateTestData({
        schema: {
          level1: {
            level2: {
              level3: {
                value: 'uuid',
              },
            },
          },
        },
        format: 'json',
        count: 1,
      });

      expect(result.success).toBe(true);
      const data = JSON.parse(result.data);
      expect(data[0].level1.level2.level3.value).toBeDefined();
    });

    it('should handle empty pipeline YAML with default schema', () => {
      const result = generateTestData({
        pipeline_yaml: '',
        count: 1,
        format: 'json',
      });

      // Empty string returns null from yaml.parse, so falls back to default
      expect(result.success).toBe(true);
      expect(result.schema_used).toBeDefined();
      // Should have default schema fields
      const data = JSON.parse(result.data);
      expect(data.length).toBe(1);
    });

    it('should handle pipeline YAML without extractable schema', () => {
      // A valid YAML that parses but has no useful input info
      const result = generateTestData({
        pipeline_yaml: 'foo: bar',
        count: 1,
        format: 'json',
      });

      // Should still work with default schema
      expect(result.success).toBe(true);
      const data = JSON.parse(result.data);
      expect(data.length).toBe(1);
    });
  });
});
