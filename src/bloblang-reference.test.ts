/**
 * Tests for Bloblang Reference Registry
 * Tests the get_bloblang_reference MCP tool functionality
 */

import { describe, it, expect } from 'vitest';
import {
  getByCategory,
  searchBloblang,
  getBloblangItem,
  listCategories,
  formatBloblangReference,
  BLOBLANG_REFERENCE,
} from './bloblang-reference';

describe('get_bloblang_reference MCP tool', () => {
  describe('getByCategory', () => {
    it('should return all items when category is "all"', () => {
      const items = getByCategory('all');
      expect(items.length).toBe(BLOBLANG_REFERENCE.length);
      expect(items.length).toBeGreaterThan(100); // Should have 100+ items
    });

    it('should return only functions when category is "functions"', () => {
      const items = getByCategory('functions');
      expect(items.every((item) => item.type === 'function')).toBe(true);
      expect(items.length).toBeGreaterThan(20); // Should have 20+ functions
    });

    it('should return string methods for "string" category', () => {
      const items = getByCategory('string');
      expect(items.every((item) => item.category === 'string')).toBe(true);
      expect(items.some((item) => item.name === 'lowercase')).toBe(true);
      expect(items.some((item) => item.name === 'uppercase')).toBe(true);
      expect(items.some((item) => item.name === 'split')).toBe(true);
    });

    it('should return array methods for "array" category', () => {
      const items = getByCategory('array');
      expect(items.every((item) => item.category === 'array')).toBe(true);
      expect(items.some((item) => item.name === 'map_each')).toBe(true);
      expect(items.some((item) => item.name === 'filter')).toBe(true);
      expect(items.some((item) => item.name === 'fold')).toBe(true);
    });

    it('should return object methods for "object" category', () => {
      const items = getByCategory('object');
      expect(items.every((item) => item.category === 'object')).toBe(true);
      expect(items.some((item) => item.name === 'keys')).toBe(true);
      expect(items.some((item) => item.name === 'values')).toBe(true);
      expect(items.some((item) => item.name === 'merge')).toBe(true);
    });

    it('should return timestamp methods for "timestamp" category', () => {
      const items = getByCategory('timestamp');
      expect(items.every((item) => item.category === 'timestamp')).toBe(true);
      expect(items.some((item) => item.name === 'ts_format')).toBe(true);
      expect(items.some((item) => item.name === 'ts_parse')).toBe(true);
    });

    it('should return parsing methods for "parsing" category', () => {
      const items = getByCategory('parsing');
      expect(items.every((item) => item.category === 'parsing')).toBe(true);
      expect(items.some((item) => item.name === 'parse_json')).toBe(true);
      expect(items.some((item) => item.name === 'format_json')).toBe(true);
    });

    it('should return encoding methods for "encoding" category', () => {
      const items = getByCategory('encoding');
      expect(items.every((item) => item.category === 'encoding')).toBe(true);
      expect(items.some((item) => item.name === 'encode')).toBe(true);
      expect(items.some((item) => item.name === 'decode')).toBe(true);
      expect(items.some((item) => item.name === 'hash')).toBe(true);
    });
  });

  describe('searchBloblang', () => {
    it('should find items by name', () => {
      const results = searchBloblang('parse_json');
      expect(results.some((item) => item.name === 'parse_json')).toBe(true);
    });

    it('should find items by partial name', () => {
      const results = searchBloblang('json');
      expect(results.some((item) => item.name === 'parse_json')).toBe(true);
      expect(results.some((item) => item.name === 'format_json')).toBe(true);
    });

    it('should find items by description', () => {
      const results = searchBloblang('timestamp');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const lowerResults = searchBloblang('json');
      const upperResults = searchBloblang('JSON');
      expect(lowerResults).toEqual(upperResults);
    });

    it('should find map_each when searching for "map"', () => {
      const results = searchBloblang('map');
      expect(results.some((item) => item.name === 'map_each')).toBe(true);
    });

    it('should find time-related items when searching for "time"', () => {
      const results = searchBloblang('time');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = searchBloblang('xyznonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('getBloblangItem', () => {
    it('should return now() function', () => {
      const item = getBloblangItem('now');
      expect(item).toBeDefined();
      expect(item?.type).toBe('function');
      expect(item?.category).toBe('environment');
    });

    it('should return uuid_v4() function with correct signature', () => {
      const item = getBloblangItem('uuid_v4');
      expect(item).toBeDefined();
      expect(item?.signature).toBe('uuid_v4() -> string');
    });

    it('should return deleted() function with usage', () => {
      const item = getBloblangItem('deleted');
      expect(item).toBeDefined();
      expect(item?.example).toContain('deleted()');
    });

    it('should return env() function with parameter description', () => {
      const item = getBloblangItem('env');
      expect(item).toBeDefined();
      expect(item?.parameters?.length).toBeGreaterThan(0);
      expect(item?.parameters?.[0].name).toBe('name');
    });

    it('should return parse_json method with signature', () => {
      const item = getBloblangItem('parse_json');
      expect(item).toBeDefined();
      expect(item?.type).toBe('method');
      expect(item?.signature).toContain('.parse_json()');
    });

    it('should return undefined for unknown item', () => {
      const item = getBloblangItem('nonexistent');
      expect(item).toBeUndefined();
    });
  });

  describe('listCategories', () => {
    it('should return all available categories', () => {
      const categories = listCategories();
      expect(categories).toContain('string');
      expect(categories).toContain('array');
      expect(categories).toContain('object');
      expect(categories).toContain('timestamp');
      expect(categories).toContain('parsing');
      expect(categories).toContain('encoding');
      expect(categories).toContain('general');
      expect(categories).toContain('environment');
      expect(categories).toContain('message');
    });
  });

  describe('formatBloblangReference', () => {
    it('should format items as readable markdown', () => {
      const items = [getBloblangItem('parse_json')!];
      const formatted = formatBloblangReference(items);

      expect(formatted).toContain('## parse_json');
      expect(formatted).toContain('Type: method');
      expect(formatted).toContain('Category: parsing');
      expect(formatted).toContain('Signature:');
      expect(formatted).toContain('Example:');
    });

    it('should include parameters for functions with params', () => {
      const items = [getBloblangItem('env')!];
      const formatted = formatBloblangReference(items);

      expect(formatted).toContain('Parameters:');
      expect(formatted).toContain('name');
    });

    it('should include return type', () => {
      const items = [getBloblangItem('now')!];
      const formatted = formatBloblangReference(items);

      expect(formatted).toContain('Returns: timestamp');
    });
  });

  describe('reference completeness', () => {
    it('should have description for every item', () => {
      for (const item of BLOBLANG_REFERENCE) {
        expect(item.description, `${item.name} missing description`).toBeTruthy();
      }
    });

    it('should have signature for every item', () => {
      for (const item of BLOBLANG_REFERENCE) {
        expect(item.signature, `${item.name} missing signature`).toBeTruthy();
      }
    });

    it('should have example for every item', () => {
      for (const item of BLOBLANG_REFERENCE) {
        expect(item.example, `${item.name} missing example`).toBeTruthy();
      }
    });

    it('should have returns type for every item', () => {
      for (const item of BLOBLANG_REFERENCE) {
        expect(item.returns, `${item.name} missing returns`).toBeTruthy();
      }
    });

    it('should have valid type (function or method) for every item', () => {
      for (const item of BLOBLANG_REFERENCE) {
        expect(['function', 'method'], `${item.name} has invalid type`).toContain(item.type);
      }
    });
  });

  describe('method signatures', () => {
    it('should have correct signature format for methods', () => {
      const methods = BLOBLANG_REFERENCE.filter((item) => item.type === 'method');
      for (const method of methods) {
        expect(method.signature, `${method.name} method should start with .`).toMatch(/^\./);
      }
    });

    it('should have correct signature format for functions', () => {
      const functions = BLOBLANG_REFERENCE.filter((item) => item.type === 'function');
      for (const fn of functions) {
        expect(fn.signature, `${fn.name} function should not start with .`).not.toMatch(/^\./);
      }
    });
  });

  describe('lambda parameter methods', () => {
    it('should document map_each with lambda parameter', () => {
      const item = getBloblangItem('map_each');
      expect(item?.parameters?.some((p) => p.type === 'lambda')).toBe(true);
    });

    it('should document filter with lambda parameter', () => {
      const item = getBloblangItem('filter');
      expect(item?.parameters?.some((p) => p.type === 'lambda')).toBe(true);
    });

    it('should document fold with accumulator and lambda', () => {
      const item = getBloblangItem('fold');
      expect(item?.parameters?.length).toBe(2);
      expect(item?.parameters?.some((p) => p.name === 'initial')).toBe(true);
      expect(item?.parameters?.some((p) => p.type === 'lambda')).toBe(true);
    });
  });

  describe('common LLM mistakes coverage', () => {
    it('should have parse_json method (not from_json function)', () => {
      const item = getBloblangItem('parse_json');
      expect(item).toBeDefined();
      expect(item?.type).toBe('method');
    });

    it('should have format_json method (not to_json function)', () => {
      const item = getBloblangItem('format_json');
      expect(item).toBeDefined();
      expect(item?.type).toBe('method');
    });

    it('should have deleted function for dropping messages', () => {
      const item = getBloblangItem('deleted');
      expect(item).toBeDefined();
      expect(item?.description).toContain('deleted');
    });

    it('should have map_each method (not map with arrow function)', () => {
      const item = getBloblangItem('map_each');
      expect(item).toBeDefined();
      expect(item?.example).toContain('->');
    });
  });
});
