/**
 * Tests for Component Compatibility Matrix
 */

import { describe, it, expect } from 'vitest';
import {
  checkPipelineCompatibility,
  parsePipelineForCompatibility,
  checkCompatibility,
  formatCompatibilityWarnings,
  COMPATIBILITY_RULES,
  type CompatibilityWarning,
} from './compatibility-rules';

describe('Compatibility Rules', () => {
  describe('Rule count and structure', () => {
    it('should have at least 20 compatibility rules', () => {
      expect(COMPATIBILITY_RULES.length).toBeGreaterThanOrEqual(20);
    });

    it('all rules should have required fields', () => {
      for (const rule of COMPATIBILITY_RULES) {
        expect(rule.id).toBeTruthy();
        expect(rule.name).toBeTruthy();
        expect(rule.description).toBeTruthy();
        expect(typeof rule.condition).toBe('function');
        expect(['error', 'warning', 'info']).toContain(rule.severity);
        expect(rule.message).toBeTruthy();
      }
    });

    it('all rules should have unique IDs', () => {
      const ids = COMPATIBILITY_RULES.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Sync Response Patterns', () => {
    it('should warn when sync_response used without http_server input', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        output: { sync_response: {} },
      };

      const warnings = checkPipelineCompatibility(config);
      const syncWarning = warnings.find(w => w.rule === 'sync-response-without-http-server');

      expect(syncWarning).toBeDefined();
      expect(syncWarning?.severity).toBe('error');
    });

    it('should not warn when sync_response used with http_server input', () => {
      const config = {
        input: { http_server: { address: '0.0.0.0:8080' } },
        pipeline: { processors: [{ mapping: 'root = this' }] },
        output: { sync_response: {} },
      };

      const warnings = checkPipelineCompatibility(config);
      const syncWarning = warnings.find(w => w.rule === 'sync-response-without-http-server');

      expect(syncWarning).toBeUndefined();
    });

    it('should info when http_server used without sync_response', () => {
      const config = {
        input: { http_server: { address: '0.0.0.0:8080' } },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'test' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const httpWarning = warnings.find(w => w.rule === 'http-server-without-sync-response');

      expect(httpWarning).toBeDefined();
      expect(httpWarning?.severity).toBe('info');
    });

    it('should error when sync_response used with batching', () => {
      const config = {
        input: {
          http_server: {
            address: '0.0.0.0:8080',
            batching: { count: 10 },
          },
        },
        output: { sync_response: {} },
      };

      const warnings = checkPipelineCompatibility(config);
      const batchWarning = warnings.find(w => w.rule === 'sync-response-with-batching');

      expect(batchWarning).toBeDefined();
      expect(batchWarning?.severity).toBe('error');
    });
  });

  describe('Batching Compatibility', () => {
    it('should warn when input batching used with non-batching output', () => {
      const config = {
        input: {
          kafka: {
            addresses: ['localhost:9092'],
            topics: ['test'],
            batching: { count: 100 },
          },
        },
        output: { stdout: {} },
      };

      const warnings = checkPipelineCompatibility(config);
      const batchWarning = warnings.find(w => w.rule === 'input-batching-output-no-batching');

      expect(batchWarning).toBeDefined();
      expect(batchWarning?.severity).toBe('warning');
    });

    it('should not warn when input batching matches output batching capability', () => {
      const config = {
        input: {
          kafka: {
            addresses: ['localhost:9092'],
            topics: ['test'],
            batching: { count: 100 },
          },
        },
        output: { aws_s3: { bucket: 'test' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const batchWarning = warnings.find(w => w.rule === 'input-batching-output-no-batching');

      expect(batchWarning).toBeUndefined();
    });

    it('should info when batch count used without period', () => {
      const config = {
        input: {
          kafka: {
            addresses: ['localhost:9092'],
            topics: ['test'],
            batching: { count: 100 },
          },
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const batchWarning = warnings.find(w => w.rule === 'batch-without-window');

      expect(batchWarning).toBeDefined();
      expect(batchWarning?.severity).toBe('info');
    });
  });

  describe('Format Compatibility', () => {
    it('should warn when CSV input uses parse_json', () => {
      const config = {
        input: { csv: { paths: ['/data/*.csv'] } },
        pipeline: {
          processors: [{ mapping: 'root = this.parse_json()' }],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'test' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const csvWarning = warnings.find(w => w.rule === 'csv-input-json-processor');

      expect(csvWarning).toBeDefined();
      expect(csvWarning?.severity).toBe('warning');
    });

    it('should error when compressed data sent to JSON output', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [{ compress: { algorithm: 'gzip' } }],
        },
        output: { elasticsearch_v8: { urls: ['http://localhost:9200'], index: 'test' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const compressWarning = warnings.find(w => w.rule === 'binary-to-json-output');

      expect(compressWarning).toBeDefined();
      expect(compressWarning?.severity).toBe('error');
    });

    it('should not warn when compress followed by decompress', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [
            { compress: { algorithm: 'gzip' } },
            { decompress: { algorithm: 'gzip' } },
          ],
        },
        output: { elasticsearch_v8: { urls: ['http://localhost:9200'], index: 'test' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const compressWarning = warnings.find(w => w.rule === 'binary-to-json-output');

      expect(compressWarning).toBeUndefined();
    });
  });

  describe('Resource Sharing', () => {
    it('should warn when multiple database connections detected', () => {
      const config = {
        input: { sql_select: { driver: 'postgres', dsn: 'postgres://...' } },
        pipeline: {
          processors: [
            { sql_select: { driver: 'postgres', dsn: 'postgres://...' } },
            { mongodb: { url: 'mongodb://...' } },
          ],
        },
        output: { sql_insert: { driver: 'postgres', dsn: 'postgres://...' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const dbWarning = warnings.find(w => w.rule === 'multiple-db-connections');

      expect(dbWarning).toBeDefined();
      expect(dbWarning?.severity).toBe('warning');
    });

    it('should error when cache processor used without cache_resources', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [{ cache: { resource: 'my_cache', operator: 'get', key: '${! this.id }' } }],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const cacheWarning = warnings.find(w => w.rule === 'cache-without-resource');

      expect(cacheWarning).toBeDefined();
      expect(cacheWarning?.severity).toBe('error');
    });

    it('should not error when cache_resources defined', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [{ cache: { resource: 'my_cache', operator: 'get', key: '${! this.id }' } }],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
        cache_resources: [{ label: 'my_cache', memory: { ttl: 300 } }],
      };

      const warnings = checkPipelineCompatibility(config);
      const cacheWarning = warnings.find(w => w.rule === 'cache-without-resource');

      expect(cacheWarning).toBeUndefined();
    });

    it('should error when rate_limit used without rate_limit_resources', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [{ rate_limit: { resource: 'my_limiter' } }],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const rateLimitWarning = warnings.find(w => w.rule === 'rate-limit-without-resource');

      expect(rateLimitWarning).toBeDefined();
      expect(rateLimitWarning?.severity).toBe('error');
    });
  });

  describe('Error Handling', () => {
    it('should warn when try used without catch', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [
            { try: [{ mapping: 'root = this.parse_json()' }] },
          ],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const tryWarning = warnings.find(w => w.rule === 'try-without-catch');

      expect(tryWarning).toBeDefined();
      expect(tryWarning?.severity).toBe('warning');
    });

    it('should not warn when try followed by catch', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [
            { try: [{ mapping: 'root = this.parse_json()' }] },
            { catch: [{ mapping: 'root.error = error()' }] },
          ],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const tryWarning = warnings.find(w => w.rule === 'try-without-catch');

      expect(tryWarning).toBeUndefined();
    });

    it('should error when catch appears before try', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [
            { catch: [{ mapping: 'root.error = error()' }] },
            { try: [{ mapping: 'root = this.parse_json()' }] },
          ],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const catchWarning = warnings.find(w => w.rule === 'catch-before-try');

      expect(catchWarning).toBeDefined();
      expect(catchWarning?.severity).toBe('error');
    });
  });

  describe('Performance', () => {
    it('should warn when parallel has blocking operations', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [
            {
              parallel: {
                cap: 10,
                processors: [
                  { http: { url: 'http://api.example.com/process' } },
                ],
              },
            },
          ],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const parallelWarning = warnings.find(w => w.rule === 'blocking-in-parallel');

      expect(parallelWarning).toBeDefined();
      expect(parallelWarning?.severity).toBe('warning');
    });

    it('should warn when parallel has no cap', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [
            {
              parallel: {
                processors: [{ mapping: 'root = this' }],
              },
            },
          ],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const capWarning = warnings.find(w => w.rule === 'unbounded-parallel');

      expect(capWarning).toBeDefined();
      expect(capWarning?.severity).toBe('warning');
    });

    it('should info when repeated JSON parsing detected', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [
            { mapping: 'root.a = this.parse_json()' },
            { mapping: 'root.b = this.parse_json()' },
            { mapping: 'root.c = this.parse_json()' },
          ],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const parseWarning = warnings.find(w => w.rule === 'json-parse-every-message');

      expect(parseWarning).toBeDefined();
      expect(parseWarning?.severity).toBe('info');
    });
  });

  describe('CDC Patterns', () => {
    it('should warn when CDC source used with parallel processing', () => {
      const config = {
        input: { postgres_cdc: { dsn: 'postgres://...' } },
        pipeline: {
          processors: [
            { parallel: { processors: [{ mapping: 'root = this' }] } },
          ],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'cdc' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const cdcWarning = warnings.find(w => w.rule === 'cdc-without-ordering');

      expect(cdcWarning).toBeDefined();
      expect(cdcWarning?.severity).toBe('warning');
    });

    it('should warn when CDC source writes to non-idempotent output', () => {
      const config = {
        input: { mysql_cdc: { dsn: 'mysql://...' } },
        output: { file: { path: '/data/output.txt' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const cdcWarning = warnings.find(w => w.rule === 'cdc-to-non-idempotent-output');

      expect(cdcWarning).toBeDefined();
      expect(cdcWarning?.severity).toBe('warning');
    });
  });

  describe('Security', () => {
    it('should warn when HTTP processor uses non-TLS external URL', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [
            { http: { url: 'http://api.external-service.com/process' } },
          ],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const httpWarning = warnings.find(w => w.rule === 'http-without-tls');

      expect(httpWarning).toBeDefined();
      expect(httpWarning?.severity).toBe('warning');
    });

    it('should not warn when HTTP processor uses localhost', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [
            { http: { url: 'http://localhost:8080/process' } },
          ],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const httpWarning = warnings.find(w => w.rule === 'http-without-tls');

      expect(httpWarning).toBeUndefined();
    });

    it('should warn when log processor may expose sensitive data', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [
            { log: { message: 'User password: ${! this.password }', level: 'INFO' } },
          ],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const logWarning = warnings.find(w => w.rule === 'sensitive-data-logging');

      expect(logWarning).toBeDefined();
      expect(logWarning?.severity).toBe('warning');
    });
  });

  describe('Messaging Patterns', () => {
    it('should info when Kafka input lacks consumer_group', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const kafkaWarning = warnings.find(w => w.rule === 'kafka-consumer-group-missing');

      expect(kafkaWarning).toBeDefined();
      expect(kafkaWarning?.severity).toBe('info');
    });

    it('should not warn when Kafka input has consumer_group', () => {
      const config = {
        input: {
          kafka: {
            addresses: ['localhost:9092'],
            topics: ['test'],
            consumer_group: 'my-group',
          },
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const kafkaWarning = warnings.find(w => w.rule === 'kafka-consumer-group-missing');

      expect(kafkaWarning).toBeUndefined();
    });

    it('should warn when NATS request-reply lacks timeout', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        pipeline: {
          processors: [
            { nats_request_reply: { urls: ['nats://localhost:4222'], subject: 'req' } },
          ],
        },
        output: { kafka: { addresses: ['localhost:9092'], topic: 'out' } },
      };

      const warnings = checkPipelineCompatibility(config);
      const natsWarning = warnings.find(w => w.rule === 'nats-request-timeout');

      expect(natsWarning).toBeDefined();
      expect(natsWarning?.severity).toBe('warning');
    });
  });

  describe('Output Patterns', () => {
    it('should warn when switch output lacks default case', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        output: {
          switch: {
            cases: [
              { check: 'this.type == "a"', output: { kafka: { topic: 'a' } } },
              { check: 'this.type == "b"', output: { kafka: { topic: 'b' } } },
            ],
          },
        },
      };

      const warnings = checkPipelineCompatibility(config);
      const switchWarning = warnings.find(w => w.rule === 'switch-without-default');

      expect(switchWarning).toBeDefined();
      expect(switchWarning?.severity).toBe('warning');
    });

    it('should not warn when switch output has default case', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'], topics: ['test'] } },
        output: {
          switch: {
            cases: [
              { check: 'this.type == "a"', output: { kafka: { topic: 'a' } } },
              { output: { kafka: { topic: 'default' } } },
            ],
          },
        },
      };

      const warnings = checkPipelineCompatibility(config);
      const switchWarning = warnings.find(w => w.rule === 'switch-without-default');

      expect(switchWarning).toBeUndefined();
    });
  });

  describe('parsePipelineForCompatibility', () => {
    it('should parse input type and config', () => {
      const config = {
        input: {
          kafka: {
            addresses: ['localhost:9092'],
            topics: ['test'],
          },
        },
        output: { stdout: {} },
      };

      const parsed = parsePipelineForCompatibility(config);

      expect(parsed.input?.type).toBe('kafka');
      expect(parsed.input?.config).toEqual({
        addresses: ['localhost:9092'],
        topics: ['test'],
      });
    });

    it('should parse output type and config', () => {
      const config = {
        input: { generate: { mapping: 'root = "test"' } },
        output: {
          aws_s3: {
            bucket: 'my-bucket',
            path: '${! uuid_v4() }.json',
          },
        },
      };

      const parsed = parsePipelineForCompatibility(config);

      expect(parsed.output?.type).toBe('aws_s3');
      expect(parsed.output?.config).toEqual({
        bucket: 'my-bucket',
        path: '${! uuid_v4() }.json',
      });
    });

    it('should parse processors', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'] } },
        pipeline: {
          processors: [
            { mapping: 'root = this' },
            { http: { url: 'http://api.example.com' } },
          ],
        },
        output: { stdout: {} },
      };

      const parsed = parsePipelineForCompatibility(config);

      expect(parsed.processors).toHaveLength(2);
      expect(parsed.processors?.[0].type).toBe('mapping');
      expect(parsed.processors?.[1].type).toBe('http');
    });

    it('should parse cache_resources', () => {
      const config = {
        input: { kafka: { addresses: ['localhost:9092'] } },
        output: { stdout: {} },
        cache_resources: [
          { label: 'my_cache', memory: { ttl: 300 } },
        ],
      };

      const parsed = parsePipelineForCompatibility(config);

      expect(parsed.resources?.caches).toHaveLength(1);
      expect(parsed.resources?.caches?.[0].label).toBe('my_cache');
    });
  });

  describe('formatCompatibilityWarnings', () => {
    it('should return empty string for no warnings', () => {
      const result = formatCompatibilityWarnings([]);
      expect(result).toBe('');
    });

    it('should format warnings by severity', () => {
      const warnings: CompatibilityWarning[] = [
        { rule: 'rule1', severity: 'error', message: 'Error message', suggestion: 'Fix it' },
        { rule: 'rule2', severity: 'warning', message: 'Warning message' },
        { rule: 'rule3', severity: 'info', message: 'Info message' },
      ];

      const result = formatCompatibilityWarnings(warnings);

      expect(result).toContain('Compatibility Warnings');
      expect(result).toContain('[X] Error message');
      expect(result).toContain('[!] Warning message');
      expect(result).toContain('[i] Info message');
      expect(result).toContain('-> Fix it');
    });
  });

  describe('Valid pipelines should not have blocking warnings', () => {
    it('should pass valid Kafka to S3 pipeline', () => {
      const config = {
        input: {
          kafka: {
            addresses: ['localhost:9092'],
            topics: ['my-topic'],
            consumer_group: 'my-group',
          },
        },
        pipeline: {
          processors: [
            { mapping: 'root = this' },
          ],
        },
        output: {
          aws_s3: {
            bucket: 'my-bucket',
            path: '${! uuid_v4() }.json',
          },
        },
      };

      const warnings = checkPipelineCompatibility(config);
      const errors = warnings.filter(w => w.severity === 'error');

      expect(errors).toHaveLength(0);
    });

    it('should pass valid HTTP webhook pipeline', () => {
      const config = {
        input: {
          http_server: {
            address: '0.0.0.0:8080',
            path: '/webhook',
          },
        },
        pipeline: {
          processors: [
            { mapping: 'root = this' },
          ],
        },
        output: { sync_response: {} },
      };

      const warnings = checkPipelineCompatibility(config);
      const errors = warnings.filter(w => w.severity === 'error');

      expect(errors).toHaveLength(0);
    });

    it('should pass valid CDC to Kafka pipeline', () => {
      const config = {
        input: {
          postgres_cdc: {
            dsn: 'postgres://user:pass@localhost:5432/db',
          },
        },
        pipeline: {
          processors: [
            { mapping: 'root = this' },
          ],
        },
        output: {
          kafka: {
            addresses: ['localhost:9092'],
            topic: 'cdc-events',
          },
        },
      };

      const warnings = checkPipelineCompatibility(config);
      const errors = warnings.filter(w => w.severity === 'error');

      expect(errors).toHaveLength(0);
    });

    it('should pass valid try-catch error handling pipeline', () => {
      const config = {
        input: {
          kafka: {
            addresses: ['localhost:9092'],
            topics: ['events'],
            consumer_group: 'processor',
          },
        },
        pipeline: {
          processors: [
            { try: [{ mapping: 'root = this.parse_json()' }] },
            { catch: [{ mapping: 'root.error = error()' }] },
          ],
        },
        output: {
          kafka: {
            addresses: ['localhost:9092'],
            topic: 'processed',
          },
        },
      };

      const warnings = checkPipelineCompatibility(config);
      const errors = warnings.filter(w => w.severity === 'error');

      expect(errors).toHaveLength(0);
    });
  });

  describe('Suggestions are helpful', () => {
    it('should provide actionable suggestions for all rules with suggestions', () => {
      for (const rule of COMPATIBILITY_RULES) {
        if (rule.suggestion) {
          // Suggestion should be actionable (contain a verb or code example)
          const hasVerb = /\b(use|add|remove|consider|change|ensure|set|define|access|redact|reorder|split|limit)\b/i.test(rule.suggestion);
          const hasCodeExample = /[:{}\[\]`]/.test(rule.suggestion);
          expect(hasVerb || hasCodeExample).toBe(true);
        }
      }
    });
  });
});
