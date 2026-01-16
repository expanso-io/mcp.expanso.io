/**
 * Integration Tests for Schema-Driven Pipeline Generation
 *
 * These tests verify the full flow from natural language query to valid YAML.
 * They use the real validate.expanso.io API (when available) to ensure
 * generated pipelines are actually valid.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  fetchComponents,
  fetchSchema,
  getSchemaContext,
} from './schema-client';
import {
  generatePipelineFromSchema,
  generateValidPipeline,
  validateYaml,
  type GeneratorEnv,
} from './schema-generator';
import { searchExamples } from './examples-registry';

// Skip these tests if running in CI without network access
const SKIP_INTEGRATION = process.env.CI === 'true' && !process.env.INTEGRATION_TESTS;

describe.skipIf(SKIP_INTEGRATION)('Integration: Schema Client', () => {
  it('should fetch real components from validate.expanso.io', async () => {
    const components = await fetchComponents();

    // Verify we get component lists with expected common components
    expect(components.inputs).toContain('kafka');
    expect(components.inputs).toContain('generate');
    expect(components.outputs).toContain('stdout');
    expect(components.outputs).toContain('kafka'); // kafka is both input and output
    expect(components.processors).toContain('mapping');
    // Verify we have a reasonable number of components
    expect(components.inputs.length).toBeGreaterThan(5);
    expect(components.outputs.length).toBeGreaterThan(5);
    expect(components.processors.length).toBeGreaterThan(10);
  });

  it('should fetch real schema from validate.expanso.io', async () => {
    const schema = await fetchSchema();

    // Verify schema has definitions object
    expect(schema.definitions).toBeDefined();
    // The schema should have at least some definitions
    expect(Object.keys(schema.definitions).length).toBeGreaterThan(0);
  });

  it('should extract relevant schema context for query', async () => {
    // Use components that actually exist in the API
    const { context, components } = await getSchemaContext('kafka to stdout');

    expect(context).toContain('kafka');
    expect(context).toContain('stdout');
    expect(components.inputs).toBeDefined();
  });
});

describe.skipIf(SKIP_INTEGRATION)('Integration: Validation API', () => {
  it('should validate valid YAML', async () => {
    const validYaml = `input:
  generate:
    count: 1
    mapping: 'root = {"test": true}'
output:
  stdout: {}`;

    const result = await validateYaml(validYaml);

    expect(result.valid).toBe(true);
    expect(result.error_count).toBe(0);
  });

  it('should detect invalid components', async () => {
    const invalidYaml = `input:
  nonexistent_component:
    field: value
output:
  stdout: {}`;

    const result = await validateYaml(invalidYaml);

    expect(result.valid).toBe(false);
    expect(result.hallucinations.length).toBeGreaterThan(0);
  });

  it('should provide corrections for typos', async () => {
    const typoYaml = `input:
  kafka:
    address: localhost:9092
    topic: test
output:
  stdout: {}`;

    const result = await validateYaml(typoYaml, { autoCorrect: true });

    // Should detect wrong field names
    expect(result.valid).toBe(false);
    expect(result.hallucinations.some(h => h.message.includes('address') || h.correction)).toBe(true);
  });
});

describe('Integration: Example Search', () => {
  it('should find kafka examples', () => {
    const examples = searchExamples('kafka to s3', 3);

    expect(examples.length).toBeGreaterThan(0);
    expect(examples[0].yaml).toContain('kafka');
  });

  it('should find elasticsearch examples', () => {
    const examples = searchExamples('index in elasticsearch', 3);

    expect(examples.length).toBeGreaterThan(0);
    expect(examples[0].yaml.toLowerCase()).toContain('elasticsearch');
  });

  it('should find webhook examples', () => {
    const examples = searchExamples('receive http webhooks', 3);

    expect(examples.length).toBeGreaterThan(0);
    expect(examples[0].yaml).toContain('http_server');
  });
});

// Mock environment for unit testing the generator
function createMockEnv(): GeneratorEnv {
  return {
    AI: {
      run: vi.fn().mockImplementation(async (model, options) => {
        // Return a simple valid pipeline
        return {
          response: `Here's a pipeline that does what you asked:

\`\`\`yaml
input:
  generate:
    count: 10
    mapping: 'root = {"id": uuid_v4()}'

pipeline:
  processors:
    - mapping: |
        root = this
        root.processed_at = now()

output:
  stdout: {}
\`\`\``,
        };
      }),
    },
    CONTENT_CACHE: undefined,
  };
}

describe('Integration: Schema Generator (Mocked)', () => {
  // Mock fetch for schema/components
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/components')) {
        return {
          ok: true,
          json: async () => ({
            inputs: ['generate', 'kafka', 'http_server', 'sql_select'],
            outputs: ['stdout', 'kafka', 'elasticsearch', 'aws_s3'],
            processors: ['mapping', 'log', 'switch'],
            caches: ['memory'],
            rate_limits: ['local'],
          }),
        };
      }
      if (url.includes('/schema')) {
        return {
          ok: true,
          json: async () => ({
            definitions: {
              input: { type: 'object' },
              output: { type: 'object' },
              kafka: { properties: { addresses: {}, topics: {} } },
              elasticsearch: { properties: { urls: {}, index: {} } },
            },
          }),
        };
      }
      if (url.includes('/validate')) {
        return {
          ok: true,
          json: async () => ({
            valid: true,
            error_count: 0,
            hallucinations: [],
          }),
        };
      }
      return { ok: false, status: 404 };
    }) as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should generate pipeline from schema context', async () => {
    const env = createMockEnv();

    const result = await generatePipelineFromSchema('simple test pipeline', env);

    expect(result).not.toBeNull();
    expect(result!.yaml).toContain('input:');
    expect(result!.yaml).toContain('output:');
    expect(result!.generation_method).toBe('schema');
  });

  it('should generate valid pipeline with validation loop', async () => {
    const env = createMockEnv();

    const result = await generateValidPipeline('test pipeline', env, { maxRetries: 2 });

    expect(result).not.toBeNull();
    expect(result!.valid).toBe(true);
    expect(result!.yaml).toContain('input:');
  });

  it('should use fallback when generation fails', async () => {
    const env: GeneratorEnv = {
      AI: {
        run: vi.fn().mockResolvedValue({ response: 'I cannot generate that.' }),
      },
    };

    const fallbackYaml = `input:
  generate:
    count: 1
output:
  stdout: {}`;

    const result = await generateValidPipeline('test', env, {
      fallback: () => ({
        yaml: fallbackYaml,
        explanation: 'Fallback example',
        components_used: ['generate', 'stdout'],
        generation_method: 'fallback',
      }),
    });

    expect(result).not.toBeNull();
    expect(result!.generation_method).toBe('fallback');
  });
});
