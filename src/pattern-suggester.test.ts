/**
 * Tests for Pattern Suggester
 * Validates natural language use case matching and suggestion quality
 */

import { describe, it, expect } from 'vitest';
import {
  suggestPipelinePatterns,
  suggestWithFallback,
  type PatternSuggestion,
} from './pattern-suggester';

describe('Pattern Suggester', () => {
  describe('Basic Suggestions', () => {
    it('should find kafka-to-s3 pattern for "consume from kafka and write to s3"', () => {
      const results = suggestPipelinePatterns({
        use_case: 'consume from kafka and write to s3',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].pattern_name.toLowerCase()).toContain('kafka');
      expect(results[0].yaml).toContain('kafka');
      expect(results[0].yaml).toContain('aws_s3');
    });

    it('should find webhook-to-kafka pattern for "receive webhooks and forward to kafka"', () => {
      const results = suggestPipelinePatterns({
        use_case: 'receive webhooks and forward to kafka',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].yaml).toContain('http_server');
    });

    it('should find filtering pattern for "filter events by type"', () => {
      const results = suggestPipelinePatterns({
        use_case: 'filter events by type',
      });
      expect(results.length).toBeGreaterThan(0);
      // Should contain filtering logic
      expect(results.some(r =>
        r.yaml.includes('filter') ||
        r.yaml.includes('deleted()') ||
        r.description.toLowerCase().includes('filter')
      )).toBe(true);
    });

    it('should find enrichment pattern for "enrich data with API calls"', () => {
      const results = suggestPipelinePatterns({
        use_case: 'enrich data with API calls',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r =>
        r.description.toLowerCase().includes('enrich') ||
        r.yaml.includes('http')
      )).toBe(true);
    });
  });

  describe('Input/Output Filtering', () => {
    it('should filter by input_type: kafka', () => {
      const results = suggestPipelinePatterns({
        use_case: 'process data',
        input_type: 'kafka',
      });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.yaml).toContain('kafka');
      });
    });

    it('should filter by output_type: elasticsearch', () => {
      const results = suggestPipelinePatterns({
        use_case: 'store data',
        output_type: 'elasticsearch',
      });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.yaml.toLowerCase()).toContain('elasticsearch');
      });
    });

    it('should apply both input and output filters', () => {
      const results = suggestPipelinePatterns({
        use_case: 'move data',
        input_type: 'kafka',
        output_type: 's3',
      });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.yaml).toContain('kafka');
        expect(r.yaml.toLowerCase()).toContain('s3');
      });
    });
  });

  describe('Natural Language Understanding', () => {
    it('should understand "parse JSON logs" query', () => {
      const results = suggestPipelinePatterns({
        use_case: 'I need to clean and parse JSON logs',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r =>
        r.yaml.includes('parse_json') ||
        r.description.toLowerCase().includes('json')
      )).toBe(true);
    });

    it('should understand retry pattern requests', () => {
      const results = suggestPipelinePatterns({
        use_case: 'retry failed API calls with backoff',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r =>
        r.yaml.includes('retry') ||
        r.description.toLowerCase().includes('retry')
      )).toBe(true);
    });

    it('should understand parallel processing requests', () => {
      const results = suggestPipelinePatterns({
        use_case: 'process in parallel for performance',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r =>
        r.yaml.includes('workflow') ||
        r.yaml.includes('branch') ||
        r.description.toLowerCase().includes('parallel')
      )).toBe(true);
    });

    it('should understand CDC pattern requests', () => {
      const results = suggestPipelinePatterns({
        use_case: 'capture database changes and stream to kafka',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r =>
        r.yaml.includes('cdc') ||
        r.description.toLowerCase().includes('cdc') ||
        r.description.toLowerCase().includes('change')
      )).toBe(true);
    });
  });

  describe('Relevance Scoring', () => {
    it('should return results sorted by relevance_score descending', () => {
      const results = suggestPipelinePatterns({
        use_case: 'kafka to elasticsearch with filtering',
        limit: 5,
      });
      expect(results.length).toBeGreaterThan(1);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevance_score).toBeGreaterThanOrEqual(
          results[i].relevance_score
        );
      }
    });

    it('should give higher scores to exact component matches', () => {
      const kafkaResults = suggestPipelinePatterns({
        use_case: 'consume from kafka',
        limit: 5,
      });
      expect(kafkaResults.length).toBeGreaterThan(0);
      // First result should have kafka in YAML
      expect(kafkaResults[0].yaml).toContain('kafka');
      // Should have reasonable score
      expect(kafkaResults[0].relevance_score).toBeGreaterThan(0.1);
    });
  });

  describe('Customization Hints', () => {
    it('should provide at least 2 hints per suggestion', () => {
      const results = suggestPipelinePatterns({
        use_case: 'kafka to s3',
        limit: 3,
      });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.customization_hints.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should include relevant hints for kafka patterns', () => {
      const results = suggestPipelinePatterns({
        use_case: 'consume from kafka',
        input_type: 'kafka',
        limit: 1,
      });
      expect(results.length).toBeGreaterThan(0);
      const hints = results[0].customization_hints.join(' ').toLowerCase();
      expect(hints).toContain('kafka');
    });
  });

  describe('Why Suggested Explanations', () => {
    it('should provide meaningful why_suggested text', () => {
      const results = suggestPipelinePatterns({
        use_case: 'consume from kafka and write to s3',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].why_suggested.length).toBeGreaterThan(10);
    });

    it('should mention matched concepts in why_suggested', () => {
      const results = suggestPipelinePatterns({
        use_case: 'consume from kafka',
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].why_suggested.toLowerCase()).toContain('kafka');
    });
  });

  describe('Limit Parameter', () => {
    it('should respect limit parameter', () => {
      const results = suggestPipelinePatterns({
        use_case: 'kafka data processing',
        limit: 2,
      });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should default to 3 results', () => {
      const results = suggestPipelinePatterns({
        use_case: 'kafka data processing',
      });
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle vague queries gracefully', () => {
      const results = suggestPipelinePatterns({
        use_case: 'do something with data',
      });
      // May or may not find results, but should not throw
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle unknown terms gracefully', () => {
      const results = suggestPipelinePatterns({
        use_case: 'zorblax the flibbertigibbet',
      });
      // Should return empty array, not throw
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array when filters exclude all results', () => {
      const results = suggestPipelinePatterns({
        use_case: 'process data',
        input_type: 'nonexistent_component',
      });
      expect(results).toHaveLength(0);
    });
  });

  describe('suggestWithFallback', () => {
    it('should return suggestions when matches found', () => {
      const result = suggestWithFallback({
        use_case: 'kafka to s3',
      });
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.message).toBeUndefined();
    });

    it('should return helpful message when no matches found', () => {
      const result = suggestWithFallback({
        use_case: 'zorblax nonsense query',
      });
      expect(result.suggestions).toHaveLength(0);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('No matching patterns');
    });

    it('should include understood concepts in fallback message', () => {
      const result = suggestWithFallback({
        use_case: 'kafka to nonexistent_output_xyz',
        input_type: 'kafka',
        output_type: 'nonexistent',
      });
      // Kafka should be understood but no match due to output filter
      expect(result.suggestions).toHaveLength(0);
      expect(result.message).toBeDefined();
    });
  });

  describe('Suggestion Structure', () => {
    it('should return properly structured suggestions', () => {
      const results = suggestPipelinePatterns({
        use_case: 'kafka to elasticsearch',
        limit: 1,
      });
      expect(results.length).toBeGreaterThan(0);

      const suggestion = results[0];
      expect(suggestion).toHaveProperty('pattern_name');
      expect(suggestion).toHaveProperty('description');
      expect(suggestion).toHaveProperty('relevance_score');
      expect(suggestion).toHaveProperty('why_suggested');
      expect(suggestion).toHaveProperty('yaml');
      expect(suggestion).toHaveProperty('customization_hints');

      expect(typeof suggestion.pattern_name).toBe('string');
      expect(typeof suggestion.description).toBe('string');
      expect(typeof suggestion.relevance_score).toBe('number');
      expect(typeof suggestion.why_suggested).toBe('string');
      expect(typeof suggestion.yaml).toBe('string');
      expect(Array.isArray(suggestion.customization_hints)).toBe(true);
    });

    it('should have valid YAML in suggestions', () => {
      const results = suggestPipelinePatterns({
        use_case: 'kafka processing',
        limit: 3,
      });
      results.forEach(r => {
        expect(r.yaml).toContain('input:');
        expect(r.yaml).toContain('output:');
      });
    });
  });
});
