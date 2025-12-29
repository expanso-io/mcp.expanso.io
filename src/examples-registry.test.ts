/**
 * Tests for Examples Registry
 * Validates pipeline examples are well-formed and searchable
 */

import { describe, it, expect, vi } from 'vitest';
import {
  PIPELINE_EXAMPLES,
  searchExamples,
  getExampleById,
  getExamplesByComponent,
  semanticSearchExamples,
  getExampleSearchText,
  type SemanticSearchEnv,
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

  describe('getExampleSearchText', () => {
    it('should generate searchable text from example', () => {
      const example = getExampleById('kafka-to-s3-json');
      expect(example).toBeDefined();

      const searchText = getExampleSearchText(example!);

      // Should include name and description
      expect(searchText).toContain(example!.name);
      expect(searchText).toContain(example!.description);

      // Should include keywords
      for (const keyword of example!.keywords) {
        expect(searchText).toContain(keyword);
      }

      // Should include component names
      for (const input of example!.components.inputs) {
        expect(searchText).toContain(input);
      }
    });

    it('should include bloblang patterns when present', () => {
      const example = PIPELINE_EXAMPLES.find(e => e.bloblangPatterns && e.bloblangPatterns.length > 0);
      expect(example).toBeDefined();

      const searchText = getExampleSearchText(example!);

      for (const pattern of example!.bloblangPatterns || []) {
        expect(searchText).toContain(pattern);
      }
    });
  });

  describe('semanticSearchExamples', () => {
    it('should fall back to keyword search when VECTORIZE not available', async () => {
      const mockEnv: SemanticSearchEnv = {
        AI: {
          run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }),
        },
        VECTORIZE: undefined, // No Vectorize binding
      };

      const results = await semanticSearchExamples('kafka to s3', mockEnv);

      // Should return results using keyword fallback
      expect(results.length).toBeGreaterThan(0);
      // AI should not be called when VECTORIZE is missing
      expect(mockEnv.AI.run).not.toHaveBeenCalled();
    });

    it('should use Vectorize when available and return matches', async () => {
      const exampleId = 'kafka-to-s3-json';
      const mockEnv: SemanticSearchEnv = {
        AI: {
          run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }),
        },
        VECTORIZE: {
          query: vi.fn().mockResolvedValue({
            matches: [
              { id: exampleId, score: 0.95, metadata: { type: 'example' } },
            ],
          }),
        },
      };

      const results = await semanticSearchExamples('consume from kafka store in s3', mockEnv);

      // Should call AI to generate embedding
      expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/baai/bge-base-en-v1.5', { text: ['consume from kafka store in s3'] });

      // Should call Vectorize with the embedding
      expect(mockEnv.VECTORIZE?.query).toHaveBeenCalledWith(
        [0.1, 0.2, 0.3],
        expect.objectContaining({ filter: { type: 'example' } })
      );

      // Should return matching examples
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(exampleId);
    });

    it('should fall back to keyword search when Vectorize returns no matches', async () => {
      const mockEnv: SemanticSearchEnv = {
        AI: {
          run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }),
        },
        VECTORIZE: {
          query: vi.fn().mockResolvedValue({ matches: [] }),
        },
      };

      const results = await semanticSearchExamples('kafka', mockEnv);

      // Should still return results via keyword fallback
      expect(results.length).toBeGreaterThan(0);
    });

    it('should fall back to keyword search when embedding fails', async () => {
      const mockEnv: SemanticSearchEnv = {
        AI: {
          run: vi.fn().mockResolvedValue({ data: [] }), // No embedding returned
        },
        VECTORIZE: {
          query: vi.fn(),
        },
      };

      const results = await semanticSearchExamples('kafka', mockEnv);

      // Should fall back to keyword search
      expect(results.length).toBeGreaterThan(0);
      // Vectorize should not be called when embedding fails
      expect(mockEnv.VECTORIZE?.query).not.toHaveBeenCalled();
    });

    it('should fall back to keyword search on Vectorize error', async () => {
      const mockEnv: SemanticSearchEnv = {
        AI: {
          run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }),
        },
        VECTORIZE: {
          query: vi.fn().mockRejectedValue(new Error('Vectorize unavailable')),
        },
      };

      const results = await semanticSearchExamples('kafka', mockEnv);

      // Should still return results via keyword fallback
      expect(results.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const mockEnv: SemanticSearchEnv = {
        AI: {
          run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }),
        },
        VECTORIZE: {
          query: vi.fn().mockResolvedValue({
            matches: [
              { id: 'kafka-to-s3-json', score: 0.95 },
              { id: 'kafka-to-elasticsearch', score: 0.90 },
              { id: 'kafka-multi-topic', score: 0.85 },
            ],
          }),
        },
      };

      const results = await semanticSearchExamples('kafka', mockEnv, 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should handle non-existent IDs from Vectorize gracefully', async () => {
      const mockEnv: SemanticSearchEnv = {
        AI: {
          run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }),
        },
        VECTORIZE: {
          query: vi.fn().mockResolvedValue({
            matches: [
              { id: 'non-existent-id', score: 0.95 },
            ],
          }),
        },
      };

      const results = await semanticSearchExamples('something', mockEnv);

      // Should fall back to keyword search when no valid examples found
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
