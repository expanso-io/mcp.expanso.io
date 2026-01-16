/**
 * Tests for Schema-Driven Pipeline Generator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generatePipelineFromSchema,
  correctYamlWithSchema,
  validateYaml,
  generateValidPipeline,
  type GeneratorEnv,
  type Hallucination,
  type FallbackGenerator,
} from './schema-generator';

// Mock fetch for schema-client
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Sample component list
const mockComponentsList = {
  inputs: ['generate', 'stdin', 'http_server', 'kafka', 'file', 'aws_s3', 'sql_select'],
  outputs: ['stdout', 'http_client', 'kafka', 'file', 'aws_s3', 'elasticsearch'],
  processors: ['mapping', 'log', 'switch', 'branch', 'filter'],
  caches: ['memory', 'redis'],
  rate_limits: ['local', 'redis'],
};

// Sample schema
const mockSchema = {
  definitions: {
    input: { type: 'object', properties: {} },
    output: { type: 'object', properties: {} },
    processor: { type: 'object', properties: {} },
    kafka: {
      properties: {
        addresses: { type: 'array', is_optional: false },
        topics: { type: 'array', is_optional: false },
      },
    },
    elasticsearch: {
      properties: {
        urls: { type: 'array', is_optional: false },
        index: { type: 'string', is_optional: false },
      },
    },
  },
};

// Mock LLM response
function createMockLLMResponse(yaml: string, explanation: string = ''): { response: string } {
  return {
    response: `${explanation}

\`\`\`yaml
${yaml}
\`\`\``,
  };
}

// Create mock environment
function createMockEnv(llmResponse: { response: string }): GeneratorEnv {
  return {
    AI: {
      run: vi.fn().mockResolvedValue(llmResponse),
    },
    CONTENT_CACHE: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
    },
  };
}

describe('Schema-Driven Generator', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Default mock for schema and components fetching
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockComponentsList,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchema,
      });
  });

  describe('generatePipelineFromSchema', () => {
    it('should generate pipeline YAML from schema', async () => {
      const mockYaml = `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - test-topic
pipeline:
  processors:
    - mapping: |
        root = this
output:
  elasticsearch:
    urls:
      - http://localhost:9200
    index: test-index`;

      const env = createMockEnv(createMockLLMResponse(mockYaml, 'This pipeline reads from Kafka and writes to Elasticsearch.'));

      const result = await generatePipelineFromSchema('kafka to elasticsearch', env);

      expect(result).not.toBeNull();
      expect(result!.yaml).toBe(mockYaml);
      expect(result!.explanation).toContain('Kafka');
      expect(result!.generation_method).toBe('schema');
    });

    it('should include schema context in LLM prompt', async () => {
      const mockYaml = `input:
  generate:
    count: 1
output:
  stdout: {}`;

      const env = createMockEnv(createMockLLMResponse(mockYaml));

      await generatePipelineFromSchema('simple test pipeline', env);

      // Check that AI.run was called with appropriate prompt
      expect(env.AI.run).toHaveBeenCalledWith(
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('# Available Pipeline Components'),
            }),
          ]),
        })
      );
    });

    it('should extract components used from YAML', async () => {
      const mockYaml = `input:
  kafka:
    addresses: ["localhost:9092"]
    topics: ["test"]
pipeline:
  processors:
    - mapping: "root = this"
output:
  elasticsearch:
    urls: ["http://localhost:9200"]
    index: test`;

      const env = createMockEnv(createMockLLMResponse(mockYaml));

      const result = await generatePipelineFromSchema('kafka to elasticsearch', env);

      expect(result!.components_used).toContain('kafka');
      expect(result!.components_used).toContain('elasticsearch');
      expect(result!.components_used).toContain('mapping');
    });

    it('should return null if YAML cannot be extracted', async () => {
      const env = createMockEnv({ response: 'I cannot generate that pipeline.' });

      const result = await generatePipelineFromSchema('invalid request', env);

      expect(result).toBeNull();
    });

    it('should handle LLM errors gracefully', async () => {
      const env: GeneratorEnv = {
        AI: {
          run: vi.fn().mockRejectedValue(new Error('LLM error')),
        },
        CONTENT_CACHE: {
          get: vi.fn().mockResolvedValue(null),
          put: vi.fn(),
        },
      };

      const result = await generatePipelineFromSchema('test query', env);

      expect(result).toBeNull();
    });

    it('should extract YAML without code fence if needed', async () => {
      // Reset fetch mocks for this specific test
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockComponentsList,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSchema,
        });

      const rawYaml = `input:
  generate:
    count: 1
output:
  stdout: {}`;

      // Response without code fences
      const env = createMockEnv({ response: rawYaml });

      const result = await generatePipelineFromSchema('simple pipeline', env);

      expect(result).not.toBeNull();
      expect(result!.yaml).toContain('input:');
      expect(result!.yaml).toContain('generate:');
    });
  });

  describe('correctYamlWithSchema', () => {
    it('should correct invalid YAML based on errors', async () => {
      // Reset fetch for this test
      mockFetch.mockReset();

      const invalidYaml = `input:
  kafka:
    address: localhost:9092
    topic: test`;

      const correctedYaml = `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - test`;

      const errors = `- input.kafka.address: Unknown field, did you mean "addresses"?
- input.kafka.topic: Unknown field, did you mean "topics"?`;

      const env = createMockEnv(createMockLLMResponse(correctedYaml));

      const result = await correctYamlWithSchema(
        invalidYaml,
        errors,
        'kafka pipeline',
        env
      );

      expect(result).toBe(correctedYaml);
    });

    it('should include original query in correction prompt', async () => {
      mockFetch.mockReset();

      const env = createMockEnv(createMockLLMResponse('input:\n  generate:\n    count: 1'));

      await correctYamlWithSchema(
        'invalid yaml',
        'some error',
        'my original query',
        env
      );

      expect(env.AI.run).toHaveBeenCalledWith(
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('my original query'),
            }),
          ]),
        })
      );
    });

    it('should return null on LLM error', async () => {
      mockFetch.mockReset();

      const env: GeneratorEnv = {
        AI: {
          run: vi.fn().mockRejectedValue(new Error('LLM error')),
        },
      };

      const result = await correctYamlWithSchema(
        'yaml',
        'error',
        'query',
        env
      );

      expect(result).toBeNull();
    });
  });

  describe('prompt construction', () => {
    it('should include component lists in system prompt', async () => {
      const mockYaml = 'input:\n  generate:\n    count: 1';
      const env = createMockEnv(createMockLLMResponse(mockYaml));

      await generatePipelineFromSchema('test pipeline', env);

      const systemPrompt = (env.AI.run as ReturnType<typeof vi.fn>).mock.calls[0][1].messages[0].content;
      expect(systemPrompt).toContain('## Inputs');
      expect(systemPrompt).toContain('kafka');
      expect(systemPrompt).toContain('## Outputs');
      expect(systemPrompt).toContain('elasticsearch');
      expect(systemPrompt).toContain('## Processors');
      expect(systemPrompt).toContain('mapping');
    });

    it('should include user query in prompt', async () => {
      const mockYaml = 'input:\n  generate:\n    count: 1';
      const env = createMockEnv(createMockLLMResponse(mockYaml));

      await generatePipelineFromSchema('process kafka events with filtering', env);

      const userPrompt = (env.AI.run as ReturnType<typeof vi.fn>).mock.calls[0][1].messages[1].content;
      expect(userPrompt).toContain('process kafka events with filtering');
    });
  });

  describe('validateYaml', () => {
    it('should call validation API with YAML', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, error_count: 0, hallucinations: [] }),
      });

      const result = await validateYaml('input:\n  generate:\n    count: 1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://validate.expanso.io/validate',
        expect.objectContaining({
          method: 'POST',
          body: 'input:\n  generate:\n    count: 1',
        })
      );
      expect(result.valid).toBe(true);
    });

    it('should include auto_correct param when requested', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, error_count: 0, hallucinations: [] }),
      });

      await validateYaml('input:\n  generate:', { autoCorrect: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://validate.expanso.io/validate?auto_correct=true',
        expect.anything()
      );
    });

    it('should return hallucinations on invalid YAML', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: false,
          error_count: 1,
          hallucinations: [{
            category: 'IMAGINED_COMPONENT',
            severity: 'ERROR',
            path: 'input.invalid',
            hallucination: 'invalid',
            message: 'Unknown component: invalid',
          }],
        }),
      });

      const result = await validateYaml('input:\n  invalid: {}');

      expect(result.valid).toBe(false);
      expect(result.hallucinations).toHaveLength(1);
      expect(result.hallucinations[0].message).toContain('Unknown component');
    });

    it('should fail open on network error', async () => {
      mockFetch.mockReset();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateYaml('input:\n  generate:');

      expect(result.valid).toBe(true); // Fail open
      expect(result.error_count).toBe(0);
    });
  });

  describe('generateValidPipeline', () => {
    it('should return valid result when generation succeeds on first try', async () => {
      const validYaml = `input:
  generate:
    count: 1
output:
  stdout: {}`;

      // Mock schema/components fetch
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockComponentsList })
        .mockResolvedValueOnce({ ok: true, json: async () => mockSchema })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, error_count: 0, hallucinations: [], formatted_yaml: validYaml }),
        });

      const env = createMockEnv(createMockLLMResponse(validYaml));

      const result = await generateValidPipeline('simple pipeline', env);

      expect(result).not.toBeNull();
      expect(result!.valid).toBe(true);
      expect(result!.validation_attempts).toBe(1);
      expect(result!.generation_method).toBe('schema');
    });

    it('should retry with LLM correction when validation fails', async () => {
      const invalidYaml = `input:
  kafka:
    address: localhost:9092`;

      const correctedYaml = `input:
  kafka:
    addresses:
      - localhost:9092
    topics:
      - test`;

      // Mock schema/components fetch + validation calls
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockComponentsList })
        .mockResolvedValueOnce({ ok: true, json: async () => mockSchema })
        // First validation fails
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: false,
            error_count: 1,
            hallucinations: [{
              category: 'IMAGINED_FIELD',
              severity: 'ERROR',
              path: 'input.kafka.address',
              hallucination: 'address',
              message: 'Unknown field, did you mean "addresses"?',
              correction: 'addresses',
            }],
          }),
        })
        // Second validation succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, error_count: 0, hallucinations: [], formatted_yaml: correctedYaml }),
        });

      const env: GeneratorEnv = {
        AI: {
          run: vi.fn()
            .mockResolvedValueOnce(createMockLLMResponse(invalidYaml)) // Initial generation
            .mockResolvedValueOnce(createMockLLMResponse(correctedYaml)), // Correction
        },
        CONTENT_CACHE: {
          get: vi.fn().mockResolvedValue(null),
          put: vi.fn(),
        },
      };

      const result = await generateValidPipeline('kafka pipeline', env);

      expect(result).not.toBeNull();
      expect(result!.valid).toBe(true);
      expect(result!.validation_attempts).toBe(2);
      expect(env.AI.run).toHaveBeenCalledTimes(2);
    });

    it('should use fallback when schema generation fails', async () => {
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockComponentsList })
        .mockResolvedValueOnce({ ok: true, json: async () => mockSchema })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, error_count: 0, hallucinations: [] }),
        });

      // LLM returns invalid response
      const env = createMockEnv({ response: 'I cannot generate that.' });

      const fallbackYaml = `input:
  generate:
    count: 1
output:
  stdout: {}`;

      const fallback: FallbackGenerator = () => ({
        yaml: fallbackYaml,
        explanation: 'Fallback pipeline',
        components_used: ['generate', 'stdout'],
        generation_method: 'fallback',
      });

      const result = await generateValidPipeline('test query', env, { fallback });

      expect(result).not.toBeNull();
      expect(result!.generation_method).toBe('fallback');
    });

    it('should use fallback when max retries exceeded', async () => {
      const invalidYaml = `input:
  invalid: {}`;

      // All validation calls fail
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockComponentsList })
        .mockResolvedValueOnce({ ok: true, json: async () => mockSchema })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            valid: false,
            error_count: 1,
            hallucinations: [{
              category: 'IMAGINED_COMPONENT',
              severity: 'ERROR',
              path: 'input.invalid',
              hallucination: 'invalid',
              message: 'Unknown component',
            }],
          }),
        });

      const env: GeneratorEnv = {
        AI: {
          run: vi.fn().mockResolvedValue(createMockLLMResponse(invalidYaml)),
        },
        CONTENT_CACHE: {
          get: vi.fn().mockResolvedValue(null),
          put: vi.fn(),
        },
      };

      const fallbackYaml = `input:
  generate:
    count: 1`;

      const fallback: FallbackGenerator = () => ({
        yaml: fallbackYaml,
        explanation: 'Fallback',
        components_used: ['generate'],
        generation_method: 'fallback',
      });

      const result = await generateValidPipeline('query', env, { maxRetries: 2, fallback });

      expect(result).not.toBeNull();
      expect(result!.generation_method).toBe('fallback');
      expect(result!.validation_attempts).toBe(2);
    });

    it('should use API-provided correction when available', async () => {
      const invalidYaml = `input:
  kafka:
    topic: test`;

      const apiCorrectedYaml = `input:
  kafka:
    topics:
      - test`;

      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockComponentsList })
        .mockResolvedValueOnce({ ok: true, json: async () => mockSchema })
        // First validation returns correction
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            valid: false,
            error_count: 1,
            hallucinations: [],
            corrected_yaml: apiCorrectedYaml,
          }),
        })
        // Validation of correction succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, error_count: 0, hallucinations: [], formatted_yaml: apiCorrectedYaml }),
        });

      const env = createMockEnv(createMockLLMResponse(invalidYaml));

      const result = await generateValidPipeline('kafka pipeline', env);

      expect(result).not.toBeNull();
      expect(result!.valid).toBe(true);
      expect(result!.yaml).toBe(apiCorrectedYaml);
      // LLM should only be called once (for initial generation)
      expect(env.AI.run).toHaveBeenCalledTimes(1);
    });
  });
});
