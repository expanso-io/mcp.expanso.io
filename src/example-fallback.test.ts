/**
 * Tests for Example Fallback
 */

import { describe, it, expect } from 'vitest';
import {
  suggestPipelinePatterns,
  suggestWithFallback,
} from './example-fallback';

describe('Example Fallback', () => {
  describe('suggestPipelinePatterns', () => {
    it('should find kafka examples for kafka query', () => {
      const results = suggestPipelinePatterns({
        use_case: 'consume from kafka and write to s3',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].yaml.toLowerCase()).toContain('kafka');
    });

    it('should find elasticsearch examples for elasticsearch query', () => {
      const results = suggestPipelinePatterns({
        use_case: 'index data in elasticsearch',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].yaml.toLowerCase()).toContain('elasticsearch');
    });

    it('should filter by input_type', () => {
      const results = suggestPipelinePatterns({
        use_case: 'process data',
        input_type: 'kafka',
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.yaml.toLowerCase()).toContain('kafka');
      });
    });

    it('should filter by output_type', () => {
      const results = suggestPipelinePatterns({
        use_case: 'store data',
        output_type: 's3',
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.yaml.toLowerCase()).toContain('s3');
      });
    });

    it('should limit results', () => {
      const results = suggestPipelinePatterns({
        use_case: 'process kafka events',
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should include customization hints', () => {
      const results = suggestPipelinePatterns({
        use_case: 'kafka to elasticsearch',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].customization_hints.length).toBeGreaterThan(0);
    });

    it('should include relevance score', () => {
      const results = suggestPipelinePatterns({
        use_case: 'kafka pipeline',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].relevance_score).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = suggestPipelinePatterns({
        use_case: 'xyzzy frobnicator',
      });

      expect(results).toEqual([]);
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

    it('should return message when no matches found', () => {
      const result = suggestWithFallback({
        use_case: 'xyzzy frobnicator',
      });

      expect(result.suggestions).toEqual([]);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('No matching examples found');
    });

    it('should include searched keywords in message', () => {
      const result = suggestWithFallback({
        use_case: 'xyzzy frobnicator',
      });

      expect(result.message).toContain('xyzzy');
    });
  });
});
