/**
 * Tests for Component Schema Registry
 * Tests the get_component_schema MCP tool functionality
 */

import { describe, it, expect } from 'vitest';
import {
  getComponentSchema,
  getSchemasByCategory,
  listComponentNames,
  searchComponents,
  formatComponentSchema,
  COMPONENT_SCHEMAS,
} from './component-schemas';

describe('get_component_schema MCP tool', () => {
  describe('getComponentSchema', () => {
    it('should return schema for kafka input when category specified', () => {
      const schema = getComponentSchema('kafka', 'input');
      expect(schema).toBeDefined();
      expect(schema?.name).toBe('kafka');
      expect(schema?.category).toBe('input');
      expect(schema?.fields.addresses).toBeDefined();
      expect(schema?.fields.addresses.required).toBe(true);
      expect(schema?.fields.topics).toBeDefined();
    });

    it('should return schema for kafka output when category specified', () => {
      const schema = getComponentSchema('kafka', 'output');
      expect(schema).toBeDefined();
      expect(schema?.name).toBe('kafka');
      expect(schema?.category).toBe('output');
      expect(schema?.fields.topic).toBeDefined();
      expect(schema?.fields.topic.required).toBe(true);
    });

    it('should return schema for mapping processor', () => {
      const schema = getComponentSchema('mapping');
      expect(schema).toBeDefined();
      expect(schema?.name).toBe('mapping');
      expect(schema?.category).toBe('processor');
      expect(schema?.fields['']).toBeDefined();
      expect(schema?.fields[''].type).toBe('bloblang');
    });

    it('should return schema for aws_s3 input when category specified', () => {
      const schema = getComponentSchema('aws_s3', 'input');
      expect(schema).toBeDefined();
      expect(schema?.name).toBe('aws_s3');
      expect(schema?.category).toBe('input');
      expect(schema?.fields.bucket).toBeDefined();
      expect(schema?.fields.bucket.required).toBe(true);
    });

    it('should return undefined for unknown component', () => {
      const schema = getComponentSchema('nonexistent_component');
      expect(schema).toBeUndefined();
    });

    it('should return schema for http_server input', () => {
      const schema = getComponentSchema('http_server');
      expect(schema).toBeDefined();
      expect(schema?.category).toBe('input');
      expect(schema?.fields.address).toBeDefined();
      expect(schema?.fields.path).toBeDefined();
    });

    it('should return schema for http processor', () => {
      const schema = getComponentSchema('http');
      expect(schema).toBeDefined();
      expect(schema?.category).toBe('processor');
      expect(schema?.fields.url.required).toBe(true);
      expect(schema?.fields.verb).toBeDefined();
    });
  });

  describe('getSchemasByCategory', () => {
    it('should return only input schemas for input category', () => {
      const schemas = getSchemasByCategory('input');
      expect(schemas.length).toBeGreaterThan(0);
      expect(schemas.every((s) => s.category === 'input')).toBe(true);
    });

    it('should return only processor schemas for processor category', () => {
      const schemas = getSchemasByCategory('processor');
      expect(schemas.length).toBeGreaterThan(0);
      expect(schemas.every((s) => s.category === 'processor')).toBe(true);
    });

    it('should return only output schemas for output category', () => {
      const schemas = getSchemasByCategory('output');
      expect(schemas.length).toBeGreaterThan(0);
      expect(schemas.every((s) => s.category === 'output')).toBe(true);
    });

    it('should include common components in each category', () => {
      const inputs = getSchemasByCategory('input');
      const processors = getSchemasByCategory('processor');
      const outputs = getSchemasByCategory('output');

      // Kafka exists in both inputs and outputs
      expect(inputs.some((s) => s.name === 'kafka')).toBe(true);
      expect(outputs.some((s) => s.name === 'kafka')).toBe(true);
      expect(inputs.some((s) => s.name === 'http_server')).toBe(true);
      expect(processors.some((s) => s.name === 'mapping')).toBe(true);
      expect(processors.some((s) => s.name === 'branch')).toBe(true);
      expect(outputs.some((s) => s.name === 'stdout')).toBe(true);
      expect(outputs.some((s) => s.name === 'http_client')).toBe(true);
    });
  });

  describe('listComponentNames', () => {
    it('should return all component names when no category', () => {
      const names = listComponentNames();
      expect(names.length).toBeGreaterThan(0);
      expect(names).toContain('kafka');
      expect(names).toContain('mapping');
      expect(names).toContain('stdout');
    });

    it('should return only input names for input category', () => {
      const names = listComponentNames('input');
      expect(names).toContain('kafka'); // kafka exists as input
      expect(names).toContain('http_server');
      expect(names).not.toContain('mapping');
      expect(names).not.toContain('stdout');
    });

    it('should return only processor names for processor category', () => {
      const names = listComponentNames('processor');
      expect(names).toContain('mapping');
      expect(names).toContain('branch');
      expect(names).not.toContain('http_server'); // http_server is input-only
      expect(names).not.toContain('stdout');
    });

    it('should return only output names for output category', () => {
      const names = listComponentNames('output');
      expect(names).toContain('stdout');
      expect(names).toContain('http_client');
      expect(names).toContain('kafka'); // kafka also exists as output
      expect(names).not.toContain('mapping');
    });
  });

  describe('searchComponents', () => {
    it('should find components by name', () => {
      const results = searchComponents('kafka');
      expect(results.some((s) => s.name === 'kafka')).toBe(true);
    });

    it('should find components by description', () => {
      const results = searchComponents('HTTP');
      expect(results.some((s) => s.name === 'http_server' || s.name === 'http_client')).toBe(
        true
      );
    });

    it('should return empty array for no matches', () => {
      const results = searchComponents('xyznonexistent');
      expect(results).toHaveLength(0);
    });

    it('should be case insensitive', () => {
      const lowerResults = searchComponents('kafka');
      const upperResults = searchComponents('KAFKA');
      expect(lowerResults).toEqual(upperResults);
    });
  });

  describe('formatComponentSchema', () => {
    it('should format schema as readable markdown', () => {
      const schema = getComponentSchema('kafka', 'input');
      expect(schema).toBeDefined();
      const formatted = formatComponentSchema(schema!);

      expect(formatted).toContain('# kafka');
      expect(formatted).toContain('Category: input');
      expect(formatted).toContain('## Fields');
      expect(formatted).toContain('### addresses');
      expect(formatted).toContain('(required)');
    });

    it('should include examples in formatted output', () => {
      const schema = getComponentSchema('generate');
      expect(schema).toBeDefined();
      const formatted = formatComponentSchema(schema!);

      expect(formatted).toContain('## Example Usage');
      expect(formatted).toContain('```yaml');
    });

    it('should include field types and defaults', () => {
      const schema = getComponentSchema('http_server');
      expect(schema).toBeDefined();
      const formatted = formatComponentSchema(schema!);

      expect(formatted).toContain('Type: string');
      expect(formatted).toContain('Default:');
    });
  });

  describe('schema completeness', () => {
    it('should have description for every component', () => {
      for (const [name, schema] of Object.entries(COMPONENT_SCHEMAS)) {
        expect(schema.description, `${name} missing description`).toBeTruthy();
      }
    });

    it('should have fields for every component', () => {
      for (const [name, schema] of Object.entries(COMPONENT_SCHEMAS)) {
        expect(Object.keys(schema.fields).length, `${name} has no fields`).toBeGreaterThanOrEqual(
          0
        );
      }
    });

    it('should have valid category for every component', () => {
      const validCategories = ['input', 'processor', 'output', 'cache', 'rate_limit', 'buffer'];
      for (const [name, schema] of Object.entries(COMPONENT_SCHEMAS)) {
        expect(
          validCategories,
          `${name} has invalid category: ${schema.category}`
        ).toContain(schema.category);
      }
    });

    it('should have valid field types', () => {
      const validTypes = [
        'string',
        'number',
        'boolean',
        'array',
        'object',
        'duration',
        'bloblang',
        'interpolated_string',
      ];
      for (const [name, schema] of Object.entries(COMPONENT_SCHEMAS)) {
        for (const [fieldName, field] of Object.entries(schema.fields)) {
          expect(
            validTypes,
            `${name}.${fieldName} has invalid type: ${field.type}`
          ).toContain(field.type);
        }
      }
    });
  });

  describe('required fields validation', () => {
    it('kafka input should require addresses and topics', () => {
      const schema = getComponentSchema('kafka', 'input');
      expect(schema?.fields.addresses.required).toBe(true);
      expect(schema?.fields.topics.required).toBe(true);
    });

    it('kafka output should require addresses and topic', () => {
      const schema = getComponentSchema('kafka', 'output');
      expect(schema?.fields.addresses.required).toBe(true);
      expect(schema?.fields.topic.required).toBe(true);
    });

    it('aws_s3 input should require bucket', () => {
      const schema = getComponentSchema('aws_s3', 'input');
      expect(schema?.fields.bucket.required).toBe(true);
    });

    it('http processor should require url', () => {
      const schema = getComponentSchema('http');
      expect(schema?.fields.url.required).toBe(true);
    });

    it('generate input should require mapping', () => {
      const schema = getComponentSchema('generate');
      expect(schema?.fields.mapping.required).toBe(true);
    });
  });

  describe('field enum values', () => {
    it('http processor verb should have HTTP methods', () => {
      const schema = getComponentSchema('http');
      expect(schema?.fields.verb.enum).toContain('GET');
      expect(schema?.fields.verb.enum).toContain('POST');
      expect(schema?.fields.verb.enum).toContain('PUT');
    });

    it('compress processor should have compression algorithms', () => {
      const schema = getComponentSchema('compress');
      expect(schema?.fields.algorithm.enum).toContain('gzip');
      expect(schema?.fields.algorithm.enum).toContain('snappy');
      expect(schema?.fields.algorithm.enum).toContain('lz4');
    });

    it('log processor should have log levels', () => {
      const schema = getComponentSchema('log');
      expect(schema?.fields.level.enum).toContain('INFO');
      expect(schema?.fields.level.enum).toContain('ERROR');
      expect(schema?.fields.level.enum).toContain('DEBUG');
    });
  });
});
