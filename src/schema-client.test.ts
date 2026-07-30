/**
 * Tests for Schema Client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchComponents,
  fetchSchema,
  extractRelevantComponentNames,
  extractRelevantSchema,
  formatSchemaForLLM,
  getSchemaContext,
  type ComponentsList,
  type PipelineSchema,
  type ComponentDefinition,
} from './schema-client';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Sample component list response
const mockComponentsList: ComponentsList = {
  inputs: ['generate', 'stdin', 'http_server', 'kafka', 'file', 'aws_s3', 'sql_select'],
  outputs: ['stdout', 'http_client', 'kafka', 'file', 'aws_s3', 'elasticsearch'],
  processors: ['mapping', 'log', 'switch', 'branch', 'filter'],
  caches: ['memory', 'redis'],
  rate_limits: ['local', 'redis'],
};

// Sample schema response (simplified)
const mockSchema: PipelineSchema = {
  definitions: {
    input: { type: 'object', properties: {} },
    output: { type: 'object', properties: {} },
    processor: { type: 'object', properties: {} },
    kafka: {
      properties: {
        addresses: {
          type: 'array',
          description: 'List of broker addresses',
          is_optional: false,
        },
        topics: {
          type: 'array',
          description: 'Topics to consume from',
          is_optional: false,
        },
        consumer_group: {
          type: 'string',
          description: 'Consumer group ID',
          is_optional: true,
        },
      },
    },
    elasticsearch: {
      properties: {
        urls: {
          type: 'array',
          description: 'Elasticsearch node URLs',
          is_optional: false,
        },
        index: {
          type: 'string',
          description: 'Index to write to',
          is_optional: false,
        },
      },
    },
    sql_select: {
      properties: {
        driver: {
          type: 'string',
          description: 'Database driver (postgres, mysql, etc)',
          is_optional: false,
        },
        dsn: {
          type: 'string',
          description: 'Database connection string',
          is_optional: false,
        },
        query: {
          type: 'string',
          description: 'SQL query to execute',
          is_optional: false,
        },
      },
    },
    mapping: {
      properties: {
        root: {
          type: 'string',
          description: 'Bloblang mapping',
          is_optional: false,
        },
      },
    },
  },
};

const mockValidatorSchema = {
  components: {
    inputs: {
      kafka: {
        fields: {
          addresses: { type: 'array', optional: false },
        },
      },
      generate: { fields: {} },
    },
    outputs: {
      kafka: { fields: {} },
      stdout: { fields: {} },
    },
    processors: {
      mapping: {
        fields: {
          map: { type: 'string', optional: true },
        },
      },
    },
    caches: {
      memory: { fields: {} },
    },
    rate_limits: {
      local: { fields: {} },
    },
  },
};

// Mock KV namespace
function createMockCache(): {
  cache: { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
  storage: Map<string, string>;
} {
  const storage = new Map<string, string>();
  return {
    cache: {
      get: vi.fn(async (key: string) => storage.get(key) || null),
      put: vi.fn(async (key: string, value: string) => {
        storage.set(key, value);
      }),
    },
    storage,
  };
}

describe('Schema Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('fetchComponents', () => {
    it('should fetch components from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComponentsList,
      });

      const result = await fetchComponents();

      expect(mockFetch).toHaveBeenCalledWith('https://validate.expanso.io/schema?full=true');
      expect(result).toEqual(mockComponentsList);
    });

    it('should derive component lists from the validator schema', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidatorSchema,
      });

      const result = await fetchComponents();

      expect(result.inputs).toEqual(['generate', 'kafka']);
      expect(result.outputs).toEqual(['kafka', 'stdout']);
      expect(result.processors).toEqual(['mapping']);
    });

    it('should return cached components if available', async () => {
      const { cache, storage } = createMockCache();
      storage.set('expanso:components:v2', JSON.stringify(mockComponentsList));

      const result = await fetchComponents(cache);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual(mockComponentsList);
    });

    it('should cache components after fetching', async () => {
      const { cache } = createMockCache();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComponentsList,
      });

      await fetchComponents(cache);

      expect(cache.put).toHaveBeenCalledWith(
        'expanso:components:v2',
        JSON.stringify(mockComponentsList),
        { expirationTtl: 3600 }
      );
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fetchComponents()).rejects.toThrow('Failed to fetch components: 500');
    });

    it('should fetch fresh if cache read fails', async () => {
      const cache = {
        get: vi.fn().mockRejectedValue(new Error('Cache error')),
        put: vi.fn(),
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComponentsList,
      });

      const result = await fetchComponents(cache);

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(mockComponentsList);
    });
  });

  describe('fetchSchema', () => {
    it('should fetch schema from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchema,
      });

      const result = await fetchSchema();

      expect(mockFetch).toHaveBeenCalledWith('https://validate.expanso.io/schema?full=true');
      expect(result).toEqual(mockSchema);
    });

    it('should normalize the validator schema into component definitions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidatorSchema,
      });

      const result = await fetchSchema();

      expect(result.definitions.input_kafka.properties?.addresses).toMatchObject({
        type: 'array',
        is_optional: false,
      });
      expect(result.definitions.processor_mapping.properties?.map).toMatchObject({
        type: 'string',
        is_optional: true,
      });
    });

    it('should return cached schema if available', async () => {
      const { cache, storage } = createMockCache();
      storage.set('expanso:schema:v2', JSON.stringify(mockSchema));

      const result = await fetchSchema(cache);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual(mockSchema);
    });

    it('should cache schema after fetching', async () => {
      const { cache } = createMockCache();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchema,
      });

      await fetchSchema(cache);

      expect(cache.put).toHaveBeenCalledWith(
        'expanso:schema:v2',
        JSON.stringify(mockSchema),
        { expirationTtl: 3600 }
      );
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(fetchSchema()).rejects.toThrow('Failed to fetch schema: 404');
    });
  });

  describe('extractRelevantComponentNames', () => {
    it('should find direct matches in query', () => {
      const result = extractRelevantComponentNames('kafka to elasticsearch', mockComponentsList);

      expect(result).toContain('kafka');
      expect(result).toContain('elasticsearch');
    });

    it('should find partial matches (sql matches sql_select)', () => {
      const result = extractRelevantComponentNames('read from sql database', mockComponentsList);

      expect(result).toContain('sql_select');
    });

    it('should always include common components', () => {
      const result = extractRelevantComponentNames('some random query', mockComponentsList);

      expect(result).toContain('mapping');
      expect(result).toContain('log');
      expect(result).toContain('generate');
      expect(result).toContain('stdout');
    });

    it('should deduplicate results', () => {
      const result = extractRelevantComponentNames('kafka kafka kafka', mockComponentsList);

      const kafkaCount = result.filter(n => n === 'kafka').length;
      expect(kafkaCount).toBe(1);
    });

    it('should match http_server for http query', () => {
      const result = extractRelevantComponentNames('receive http webhooks', mockComponentsList);

      expect(result).toContain('http_server');
      expect(result).toContain('http_client');
    });
  });

  describe('extractRelevantSchema', () => {
    it('should extract schemas for specified components', () => {
      const result = extractRelevantSchema(mockSchema, ['kafka', 'elasticsearch']);

      expect(result).toHaveProperty('kafka');
      expect(result).toHaveProperty('elasticsearch');
    });

    it('should include structural definitions', () => {
      const result = extractRelevantSchema(mockSchema, ['kafka']);

      expect(result).toHaveProperty('input');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('processor');
    });

    it('should handle components not in schema', () => {
      const result = extractRelevantSchema(mockSchema, ['nonexistent']);

      // Should still have structural defs
      expect(result).toHaveProperty('input');
      expect(result).not.toHaveProperty('nonexistent');
    });
  });

  describe('formatSchemaForLLM', () => {
    it('should format component lists', () => {
      const relevantSchema: Record<string, ComponentDefinition> = {
        kafka: mockSchema.definitions.kafka,
      };

      const result = formatSchemaForLLM(relevantSchema, mockComponentsList);

      expect(result).toContain('# Available Pipeline Components');
      expect(result).toContain('## Inputs');
      expect(result).toContain('kafka');
      expect(result).toContain('## Outputs');
      expect(result).toContain('elasticsearch');
    });

    it('should format component schemas with required markers', () => {
      const relevantSchema: Record<string, ComponentDefinition> = {
        kafka: mockSchema.definitions.kafka,
      };

      const result = formatSchemaForLLM(relevantSchema, mockComponentsList);

      expect(result).toContain('## kafka');
      expect(result).toContain('addresses*:'); // Required field
      expect(result).toContain('consumer_group:'); // Optional field (no asterisk)
    });

    it('should skip structural definitions in output', () => {
      const relevantSchema: Record<string, ComponentDefinition> = {
        input: mockSchema.definitions.input,
        kafka: mockSchema.definitions.kafka,
      };

      const result = formatSchemaForLLM(relevantSchema, mockComponentsList);

      // Should have kafka section but not generic input section
      expect(result).toContain('## kafka');
      expect(result).not.toContain('## input\n');
    });
  });

  describe('getSchemaContext', () => {
    it('should return formatted context for query', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockComponentsList,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSchema,
        });

      const result = await getSchemaContext('kafka to elasticsearch');

      expect(result.context).toContain('# Available Pipeline Components');
      expect(result.context).toContain('kafka');
      expect(result.components).toEqual(mockComponentsList);
    });

    it('should use cache when available', async () => {
      const { cache, storage } = createMockCache();
      storage.set('expanso:components:v2', JSON.stringify(mockComponentsList));
      storage.set('expanso:schema:v2', JSON.stringify(mockSchema));

      const result = await getSchemaContext('sql to elasticsearch', cache);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.context).toContain('# Available Pipeline Components');
    });
  });
});
