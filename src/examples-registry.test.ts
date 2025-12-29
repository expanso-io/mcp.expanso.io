/**
 * Tests for Examples Registry
 * Validates pipeline examples are well-formed and searchable
 */

import { describe, it, expect } from 'vitest';
import {
  PIPELINE_EXAMPLES,
  searchExamples,
  getExampleById,
  getExamplesByComponent,
} from './examples-registry';

describe('Examples Registry', () => {
  describe('Example count and coverage', () => {
    it('should have at least 40 examples', () => {
      expect(PIPELINE_EXAMPLES.length).toBeGreaterThanOrEqual(40);
    });

    it('should have unique IDs for all examples', () => {
      const ids = PIPELINE_EXAMPLES.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Example structure validation', () => {
    it('all examples should have required fields', () => {
      for (const example of PIPELINE_EXAMPLES) {
        expect(example.id).toBeTruthy();
        expect(example.name).toBeTruthy();
        expect(example.description).toBeTruthy();
        expect(example.keywords).toBeInstanceOf(Array);
        expect(example.keywords.length).toBeGreaterThan(0);
        expect(example.components).toBeTruthy();
        expect(example.yaml).toBeTruthy();
      }
    });

    it('all examples should have input and output components', () => {
      for (const example of PIPELINE_EXAMPLES) {
        expect(example.components.inputs.length).toBeGreaterThan(0);
        expect(example.components.outputs.length).toBeGreaterThan(0);
      }
    });

    it('all examples should have valid YAML structure', () => {
      for (const example of PIPELINE_EXAMPLES) {
        // Should contain input: and output: sections
        expect(example.yaml).toContain('input:');
        expect(example.yaml).toContain('output:');
      }
    });
  });

  describe('Keyword coverage', () => {
    it('should find examples for "kafka"', () => {
      const results = searchExamples('kafka');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find examples for "error handling"', () => {
      const results = searchExamples('error handling retry');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find examples for "ai ml"', () => {
      const results = searchExamples('ai ml embedding');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find examples for "cdc"', () => {
      const results = searchExamples('cdc change data capture');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find examples for "parallel"', () => {
      const results = searchExamples('parallel workflow');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Component coverage', () => {
    it('should have examples using kafka input', () => {
      const results = getExamplesByComponent('kafka');
      expect(results.length).toBeGreaterThan(5);
    });

    it('should have examples using http_server input', () => {
      const results = getExamplesByComponent('http_server');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should have examples using aws_s3', () => {
      const results = getExamplesByComponent('aws_s3');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should have examples using elasticsearch_v8', () => {
      const results = getExamplesByComponent('elasticsearch_v8');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getExampleById', () => {
    it('should find example by ID', () => {
      const example = getExampleById('kafka-to-s3-json');
      expect(example).toBeDefined();
      expect(example?.name).toBe('Kafka to S3 with JSON Parsing');
    });

    it('should return undefined for non-existent ID', () => {
      const example = getExampleById('non-existent-id');
      expect(example).toBeUndefined();
    });
  });

  describe('Pattern coverage', () => {
    it('should have retry/backoff pattern', () => {
      const example = getExampleById('retry-with-backoff');
      expect(example).toBeDefined();
      expect(example?.components.processors).toContain('retry');
    });

    it('should have workflow DAG pattern', () => {
      const example = getExampleById('workflow-dag');
      expect(example).toBeDefined();
      expect(example?.components.processors).toContain('workflow');
    });

    it('should have fan-out pattern', () => {
      const example = getExampleById('fan-out-fan-in');
      expect(example).toBeDefined();
      expect(example?.components.processors).toContain('branch');
    });

    it('should have RAG embedding pattern', () => {
      const example = getExampleById('rag-embedding-pipeline');
      expect(example).toBeDefined();
    });

    it('should have CDC patterns', () => {
      const postgresExample = getExampleById('postgres-cdc-to-kafka');
      const mysqlExample = getExampleById('mysql-cdc-to-elasticsearch');
      expect(postgresExample).toBeDefined();
      expect(mysqlExample).toBeDefined();
    });
  });

  describe('Bloblang pattern coverage', () => {
    it('should demonstrate parse_json in multiple examples', () => {
      const withParseJson = PIPELINE_EXAMPLES.filter(
        e => e.bloblangPatterns?.includes('parse_json()')
      );
      expect(withParseJson.length).toBeGreaterThan(10);
    });

    it('should demonstrate map_each', () => {
      const withMapEach = PIPELINE_EXAMPLES.filter(
        e => e.bloblangPatterns?.includes('map_each()')
      );
      expect(withMapEach.length).toBeGreaterThan(0);
    });

    it('should demonstrate error handling patterns', () => {
      const withError = PIPELINE_EXAMPLES.filter(
        e => e.bloblangPatterns?.includes('error()') || e.bloblangPatterns?.includes('errored()')
      );
      expect(withError.length).toBeGreaterThan(0);
    });

    it('should demonstrate let variables', () => {
      const withLet = PIPELINE_EXAMPLES.filter(
        e => e.bloblangPatterns?.includes('let')
      );
      expect(withLet.length).toBeGreaterThan(0);
    });
  });
});
