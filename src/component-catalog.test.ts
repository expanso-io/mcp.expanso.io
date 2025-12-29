/**
 * Tests for Component Catalog
 * Tests the list_components MCP tool functionality
 */

import { describe, it, expect } from 'vitest';
import {
  COMPONENT_CATALOG,
  listComponents,
  getAvailableTags,
  getCategoryCounts,
  formatComponentList,
  type CatalogEntry,
  type ComponentCategory,
  type ComponentTag,
} from './component-catalog';
import { VALID_INPUTS, VALID_PROCESSORS, VALID_OUTPUTS } from './pipeline-validator';

describe('list_components MCP tool', () => {
  describe('catalog structure', () => {
    it('should have components in the catalog', () => {
      expect(COMPONENT_CATALOG.length).toBeGreaterThan(100);
    });

    it('should have all required fields for every entry', () => {
      for (const entry of COMPONENT_CATALOG) {
        expect(entry.name, `Missing name in entry`).toBeTruthy();
        expect(entry.category, `${entry.name} missing category`).toBeTruthy();
        expect(entry.description, `${entry.name} missing description`).toBeTruthy();
        expect(entry.tags.length, `${entry.name} has no tags`).toBeGreaterThan(0);
        expect(entry.status, `${entry.name} missing status`).toBeTruthy();
      }
    });

    it('should have valid categories for all entries', () => {
      const validCategories: ComponentCategory[] = ['input', 'processor', 'output', 'cache', 'buffer'];
      for (const entry of COMPONENT_CATALOG) {
        expect(
          validCategories,
          `${entry.name} has invalid category: ${entry.category}`
        ).toContain(entry.category);
      }
    });

    it('should have valid status for all entries', () => {
      const validStatuses = ['stable', 'beta', 'experimental'];
      for (const entry of COMPONENT_CATALOG) {
        expect(
          validStatuses,
          `${entry.name} has invalid status: ${entry.status}`
        ).toContain(entry.status);
      }
    });

    it('should have meaningful descriptions (>10 chars)', () => {
      for (const entry of COMPONENT_CATALOG) {
        expect(
          entry.description.length,
          `${entry.name} has too short description: "${entry.description}"`
        ).toBeGreaterThan(10);
      }
    });
  });

  describe('category filtering', () => {
    it('should return only inputs when category=input', () => {
      const result = listComponents({ category: 'input' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.category === 'input')).toBe(true);
    });

    it('should return only processors when category=processor', () => {
      const result = listComponents({ category: 'processor' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.category === 'processor')).toBe(true);
    });

    it('should return only outputs when category=output', () => {
      const result = listComponents({ category: 'output' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.category === 'output')).toBe(true);
    });

    it('should return all components when category=all', () => {
      const result = listComponents({ category: 'all' });
      expect(result.count).toBe(COMPONENT_CATALOG.length);
    });

    it('should default to all when no category specified', () => {
      const result = listComponents({});
      expect(result.count).toBe(COMPONENT_CATALOG.length);
    });
  });

  describe('tag filtering', () => {
    it('should filter by messaging tag', () => {
      const result = listComponents({ tag: 'messaging' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.tags.includes('messaging'))).toBe(true);
      // Should include kafka, nats, etc.
      expect(result.components.some(c => c.name === 'kafka')).toBe(true);
      expect(result.components.some(c => c.name === 'nats')).toBe(true);
    });

    it('should filter by cloud tag', () => {
      const result = listComponents({ tag: 'cloud' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.tags.includes('cloud'))).toBe(true);
    });

    it('should filter by ai tag', () => {
      const result = listComponents({ tag: 'ai' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.tags.includes('ai'))).toBe(true);
      // Should include openai, ollama, etc.
      expect(result.components.some(c => c.name.includes('openai'))).toBe(true);
      expect(result.components.some(c => c.name.includes('ollama'))).toBe(true);
    });

    it('should filter by database tag', () => {
      const result = listComponents({ tag: 'database' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.tags.includes('database'))).toBe(true);
      // Should include mongodb, sql, etc.
      expect(result.components.some(c => c.name === 'mongodb')).toBe(true);
    });

    it('should filter by http tag', () => {
      const result = listComponents({ tag: 'http' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.tags.includes('http'))).toBe(true);
      // Should include http_server, http_client
      expect(result.components.some(c => c.name === 'http_server')).toBe(true);
    });

    it('should filter by aws tag', () => {
      const result = listComponents({ tag: 'aws' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.tags.includes('aws'))).toBe(true);
      // Should include aws_s3, aws_sqs, etc.
      expect(result.components.some(c => c.name === 'aws_s3')).toBe(true);
    });

    it('should filter by gcp tag', () => {
      const result = listComponents({ tag: 'gcp' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.tags.includes('gcp'))).toBe(true);
      // Should include gcp_pubsub, gcp_cloud_storage, etc.
      expect(result.components.some(c => c.name === 'gcp_pubsub')).toBe(true);
    });

    it('should filter by azure tag', () => {
      const result = listComponents({ tag: 'azure' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.tags.includes('azure'))).toBe(true);
    });
  });

  describe('search filtering', () => {
    it('should find kafka in all categories', () => {
      const result = listComponents({ search: 'kafka' });
      expect(result.count).toBeGreaterThan(0);
      // Kafka exists as input and output
      expect(result.components.some(c => c.category === 'input')).toBe(true);
      expect(result.components.some(c => c.category === 'output')).toBe(true);
    });

    it('should find http components', () => {
      const result = listComponents({ search: 'http' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.some(c => c.name === 'http_server')).toBe(true);
      expect(result.components.some(c => c.name === 'http_client')).toBe(true);
    });

    it('should find s3 components', () => {
      const result = listComponents({ search: 's3' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.some(c => c.name === 'aws_s3')).toBe(true);
    });

    it('should be case insensitive', () => {
      const lower = listComponents({ search: 'kafka' });
      const upper = listComponents({ search: 'KAFKA' });
      const mixed = listComponents({ search: 'KaFkA' });
      expect(lower.count).toBe(upper.count);
      expect(lower.count).toBe(mixed.count);
    });

    it('should search in descriptions', () => {
      const result = listComponents({ search: 'webhook' });
      expect(result.count).toBeGreaterThan(0);
      // http_server description mentions webhooks
      expect(result.components.some(c => c.name === 'http_server')).toBe(true);
    });

    it('should return empty for non-existent search', () => {
      const result = listComponents({ search: 'xyznonexistent123' });
      expect(result.count).toBe(0);
      expect(result.components).toHaveLength(0);
    });
  });

  describe('combined filters', () => {
    it('should combine category and tag filters', () => {
      const result = listComponents({ category: 'input', tag: 'messaging' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.category === 'input')).toBe(true);
      expect(result.components.every(c => c.tags.includes('messaging'))).toBe(true);
    });

    it('should combine category and search filters', () => {
      const result = listComponents({ category: 'processor', search: 'ai' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.category === 'processor')).toBe(true);
    });

    it('should combine tag and search filters', () => {
      const result = listComponents({ tag: 'aws', search: 's3' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.tags.includes('aws'))).toBe(true);
      expect(result.components.some(c => c.name === 'aws_s3')).toBe(true);
    });

    it('should combine all three filters', () => {
      const result = listComponents({ category: 'input', tag: 'cloud', search: 'aws' });
      expect(result.count).toBeGreaterThan(0);
      expect(result.components.every(c => c.category === 'input')).toBe(true);
      expect(result.components.every(c => c.tags.includes('cloud'))).toBe(true);
    });
  });

  describe('result format', () => {
    it('should include count matching array length', () => {
      const result = listComponents({ category: 'input' });
      expect(result.count).toBe(result.components.length);
    });

    it('should include category in result', () => {
      const result = listComponents({ category: 'processor' });
      expect(result.category).toBe('processor');
    });

    it('should return "all" for no category filter', () => {
      const result = listComponents({});
      expect(result.category).toBe('all');
    });

    it('should sort components alphabetically', () => {
      const result = listComponents({ category: 'input' });
      const names = result.components.map(c => c.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });
  });

  describe('getAvailableTags', () => {
    it('should return all tags with counts', () => {
      const tags = getAvailableTags();
      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0].tag).toBeTruthy();
      expect(tags[0].count).toBeGreaterThan(0);
    });

    it('should be sorted by count descending', () => {
      const tags = getAvailableTags();
      for (let i = 1; i < tags.length; i++) {
        expect(tags[i - 1].count).toBeGreaterThanOrEqual(tags[i].count);
      }
    });

    it('should include common tags', () => {
      const tags = getAvailableTags();
      const tagNames = tags.map(t => t.tag);
      expect(tagNames).toContain('messaging');
      expect(tagNames).toContain('cloud');
      expect(tagNames).toContain('database');
    });
  });

  describe('getCategoryCounts', () => {
    it('should return counts for all categories', () => {
      const counts = getCategoryCounts();
      expect(counts.input).toBeGreaterThan(0);
      expect(counts.processor).toBeGreaterThan(0);
      expect(counts.output).toBeGreaterThan(0);
    });

    it('should have counts matching listComponents', () => {
      const counts = getCategoryCounts();
      const inputs = listComponents({ category: 'input' });
      const processors = listComponents({ category: 'processor' });
      const outputs = listComponents({ category: 'output' });

      expect(counts.input).toBe(inputs.count);
      expect(counts.processor).toBe(processors.count);
      expect(counts.output).toBe(outputs.count);
    });
  });

  describe('formatComponentList', () => {
    it('should format as markdown', () => {
      const result = listComponents({ category: 'input', search: 'kafka' });
      const formatted = formatComponentList(result);

      expect(formatted).toContain('# Input Components');
      expect(formatted).toContain('kafka');
    });

    it('should group by status', () => {
      const result = listComponents({ tag: 'messaging' });
      const formatted = formatComponentList(result);

      expect(formatted).toContain('## Stable');
    });

    it('should include descriptions and tags', () => {
      const result = listComponents({ search: 'kafka' });
      const formatted = formatComponentList(result);

      expect(formatted).toContain('Tags:');
      expect(formatted).toContain('messaging');
    });
  });

  describe('coverage: all VALID_INPUTS are in catalog', () => {
    const catalogInputs = new Set(
      COMPONENT_CATALOG
        .filter(c => c.category === 'input')
        .map(c => c.name)
    );

    for (const input of VALID_INPUTS) {
      it(`should include input: ${input}`, () => {
        expect(catalogInputs.has(input), `Missing input: ${input}`).toBe(true);
      });
    }
  });

  describe('coverage: all VALID_PROCESSORS are in catalog', () => {
    const catalogProcessors = new Set(
      COMPONENT_CATALOG
        .filter(c => c.category === 'processor')
        .map(c => c.name)
    );

    for (const processor of VALID_PROCESSORS) {
      it(`should include processor: ${processor}`, () => {
        expect(catalogProcessors.has(processor), `Missing processor: ${processor}`).toBe(true);
      });
    }
  });

  describe('coverage: all VALID_OUTPUTS are in catalog', () => {
    const catalogOutputs = new Set(
      COMPONENT_CATALOG
        .filter(c => c.category === 'output')
        .map(c => c.name)
    );

    for (const output of VALID_OUTPUTS) {
      it(`should include output: ${output}`, () => {
        expect(catalogOutputs.has(output), `Missing output: ${output}`).toBe(true);
      });
    }
  });

  describe('specific component presence', () => {
    // Core inputs
    it('should include kafka input', () => {
      const result = listComponents({ category: 'input', search: 'kafka' });
      expect(result.components.some(c => c.name === 'kafka')).toBe(true);
    });

    it('should include http_server input', () => {
      const result = listComponents({ category: 'input' });
      expect(result.components.some(c => c.name === 'http_server')).toBe(true);
    });

    it('should include generate input', () => {
      const result = listComponents({ category: 'input' });
      expect(result.components.some(c => c.name === 'generate')).toBe(true);
    });

    // Core processors
    it('should include mapping processor', () => {
      const result = listComponents({ category: 'processor' });
      expect(result.components.some(c => c.name === 'mapping')).toBe(true);
    });

    it('should include branch processor', () => {
      const result = listComponents({ category: 'processor' });
      expect(result.components.some(c => c.name === 'branch')).toBe(true);
    });

    it('should include http processor', () => {
      const result = listComponents({ category: 'processor' });
      expect(result.components.some(c => c.name === 'http')).toBe(true);
    });

    // Core outputs
    it('should include stdout output', () => {
      const result = listComponents({ category: 'output' });
      expect(result.components.some(c => c.name === 'stdout')).toBe(true);
    });

    it('should include kafka output', () => {
      const result = listComponents({ category: 'output' });
      expect(result.components.some(c => c.name === 'kafka')).toBe(true);
    });

    it('should include aws_s3 output', () => {
      const result = listComponents({ category: 'output' });
      expect(result.components.some(c => c.name === 'aws_s3')).toBe(true);
    });

    // AI processors
    it('should include openai_chat_completion processor', () => {
      const result = listComponents({ category: 'processor', tag: 'ai' });
      expect(result.components.some(c => c.name === 'openai_chat_completion')).toBe(true);
    });

    it('should include ollama_chat processor', () => {
      const result = listComponents({ category: 'processor', tag: 'ai' });
      expect(result.components.some(c => c.name === 'ollama_chat')).toBe(true);
    });
  });
});
