/**
 * Tests for Pipeline Auto-Fix Capability
 *
 * Tests the automatic fixing of common pipeline errors including:
 * - Component name typos (HIGH confidence)
 * - Bloblang method name fixes (HIGH confidence)
 * - Structure fixes (HIGH confidence)
 * - Suggested fixes (medium/low confidence)
 */

import { describe, it, expect } from 'vitest';
import {
  validatePipelineYaml,
  applyAutoFixes,
  COMPONENT_TYPOS,
  BLOBLANG_METHOD_TYPOS,
  STRUCTURE_FIXES,
} from './pipeline-validator';

describe('Pipeline Auto-Fix Capability', () => {
  describe('applyAutoFixes function', () => {
    describe('Component name typos (HIGH confidence)', () => {
      it('should fix "kafaka" to "kafka"', () => {
        const yaml = `
input:
  kafaka:
    addresses: [localhost:9092]
    topics: [test]
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('kafka:');
        expect(result.fixedYaml).not.toContain('kafaka:');
        expect(result.fixesApplied).toContain('Component: "kafaka" → "kafka"');
      });

      it('should fix "s3" to "aws_s3"', () => {
        const yaml = `
input:
  generate:
    mapping: root = "test"
output:
  s3:
    bucket: my-bucket
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('aws_s3:');
        expect(result.fixedYaml).not.toContain('  s3:');
        expect(result.fixesApplied).toContain('Component: "s3" → "aws_s3"');
      });

      it('should fix "elastic" to "elasticsearch_v8"', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
output:
  elastic:
    urls: [http://localhost:9200]
    index: my-index
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('elasticsearch_v8:');
        expect(result.fixesApplied).toContain('Component: "elastic" → "elasticsearch_v8"');
      });

      it('should fix "blobl" to "bloblang" in processors', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  processors:
    - blobl: root = this
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('bloblang:');
        expect(result.fixesApplied).toContain('Component: "blobl" → "bloblang"');
      });

      it('should fix "map" to "mapping" in processors', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  processors:
    - map: root = this.uppercase()
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('mapping:');
        expect(result.fixesApplied).toContain('Component: "map" → "mapping"');
      });
    });

    describe('Bloblang method name fixes (HIGH confidence)', () => {
      it('should fix ".parseJson()" to ".parse_json()"', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  processors:
    - mapping: root = this.parseJson()
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('.parse_json()');
        expect(result.fixedYaml).not.toContain('.parseJson()');
        expect(result.fixesApplied).toContain('Bloblang method: ".parseJson()" → ".parse_json()"');
      });

      it('should fix ".formatJson()" to ".format_json()"', () => {
        const yaml = `
input:
  generate:
    mapping: root = {"key": "value"}
pipeline:
  processors:
    - mapping: root = this.formatJson()
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('.format_json()');
        expect(result.fixesApplied).toContain('Bloblang method: ".formatJson()" → ".format_json()"');
      });

      it('should fix ".mapEach()" to ".map_each()"', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  processors:
    - mapping: root = this.items.mapEach(x -> x.id)
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('.map_each(');
        expect(result.fixesApplied).toContain('Bloblang method: ".mapEach()" → ".map_each()"');
      });

      it('should fix ".forEach()" to ".map_each()"', () => {
        const yaml = `
input:
  generate:
    mapping: root = [1, 2, 3]
pipeline:
  processors:
    - mapping: root = this.forEach(x -> x * 2)
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('.map_each(');
        expect(result.fixesApplied).toContain('Bloblang method: ".forEach()" → ".map_each()"');
      });

      it('should fix ".toUpperCase()" to ".uppercase()"', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  processors:
    - mapping: root.name = this.name.toUpperCase()
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('.uppercase()');
        expect(result.fixesApplied).toContain('Bloblang method: ".toUpperCase()" → ".uppercase()"');
      });

      it('should fix ".toLowerCase()" to ".lowercase()"', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  processors:
    - mapping: root.email = this.email.toLowerCase()
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('.lowercase()');
        expect(result.fixesApplied).toContain('Bloblang method: ".toLowerCase()" → ".lowercase()"');
      });
    });

    describe('Structure fixes (HIGH confidence)', () => {
      it('should fix "pipeline.with" to "pipeline.processors"', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  with:
    - mapping: root = this
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('processors:');
        expect(result.fixedYaml).not.toContain('  with:');
        expect(result.fixesApplied).toContain('Structure: "pipeline.with" → "pipeline.processors"');
      });

      it('should fix "pipeline.steps" to "pipeline.processors"', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  steps:
    - mapping: root = this
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixedYaml).toContain('processors:');
        expect(result.fixesApplied).toContain('Structure: "pipeline.steps" → "pipeline.processors"');
      });
    });

    describe('Multiple fixes together', () => {
      it('should apply multiple fixes in one pass', () => {
        const yaml = `
input:
  kafaka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  processors:
    - map: root = this.parseJson().mapEach(x -> x.toUpperCase())
output:
  elastic:
    urls: [http://localhost:9200]
`;
        const result = applyAutoFixes(yaml);

        // Check all fixes were applied
        expect(result.fixedYaml).toContain('kafka:');
        expect(result.fixedYaml).toContain('mapping:');
        expect(result.fixedYaml).toContain('.parse_json()');
        expect(result.fixedYaml).toContain('.map_each(');
        expect(result.fixedYaml).toContain('.uppercase()');
        expect(result.fixedYaml).toContain('elasticsearch_v8:');

        // Check all fixes are recorded
        expect(result.fixesApplied.length).toBeGreaterThanOrEqual(4);
      });
    });

    describe('Suggested fixes (medium/low confidence)', () => {
      it('should suggest "http" disambiguation', () => {
        const yaml = `
input:
  http:
    url: http://example.com
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.suggestedFixes.length).toBeGreaterThan(0);
        expect(result.suggestedFixes.some(fix =>
          fix.original === 'http:' && fix.confidence === 'medium'
        )).toBe(true);
      });

      it('should suggest "sql" disambiguation', () => {
        const yaml = `
input:
  sql:
    driver: postgres
    query: SELECT * FROM users
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.suggestedFixes.some(fix =>
          fix.original === 'sql:' && fix.confidence === 'medium'
        )).toBe(true);
      });
    });

    describe('No changes needed', () => {
      it('should return empty fixes for valid YAML', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  processors:
    - mapping: root = this.parse_json()
output:
  stdout: {}
`;
        const result = applyAutoFixes(yaml);
        expect(result.fixesApplied).toHaveLength(0);
        expect(result.fixedYaml).toBe(yaml);
      });
    });
  });

  describe('validatePipelineYaml with auto-fix', () => {
    describe('Fixed YAML re-validates successfully', () => {
      it('should validate fixed "kafaka" → "kafka" pipeline', () => {
        const yaml = `
input:
  kafaka:
    addresses: [localhost:9092]
    topics: [test]
output:
  stdout: {}
`;
        const result = validatePipelineYaml(yaml);

        // Should be valid after fix
        expect(result.valid).toBe(true);
        expect(result.fixed_yaml).toBeDefined();
        expect(result.fixes_applied).toContain('Component: "kafaka" → "kafka"');
      });

      it('should validate fixed "s3" → "aws_s3" pipeline', () => {
        const yaml = `
input:
  generate:
    mapping: root = "test"
output:
  s3:
    bucket: my-bucket
`;
        const result = validatePipelineYaml(yaml);

        expect(result.valid).toBe(true);
        expect(result.fixed_yaml).toContain('aws_s3:');
        expect(result.fixes_applied).toContain('Component: "s3" → "aws_s3"');
      });

      it('should validate fixed Bloblang method names', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  processors:
    - mapping: root = this.parseJson()
output:
  stdout: {}
`;
        const result = validatePipelineYaml(yaml);

        expect(result.valid).toBe(true);
        expect(result.fixed_yaml).toContain('.parse_json()');
        expect(result.fixes_applied).toContain('Bloblang method: ".parseJson()" → ".parse_json()"');
      });

      it('should validate complex pipeline with multiple fixes', () => {
        const yaml = `
input:
  kafaka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  processors:
    - map: |
        root = this.parseJson()
        root.name = root.name.toUpperCase()
output:
  elastic:
    urls: [http://localhost:9200]
    index: my-index
`;
        const result = validatePipelineYaml(yaml);

        expect(result.valid).toBe(true);
        expect(result.fixed_yaml).toBeDefined();
        expect(result.fixes_applied).toBeDefined();
        expect(result.fixes_applied!.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('Response format', () => {
      it('should include fixed_yaml only when fixes applied', () => {
        const validYaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
output:
  stdout: {}
`;
        const result = validatePipelineYaml(validYaml);

        expect(result.valid).toBe(true);
        expect(result.fixed_yaml).toBeUndefined();
        expect(result.fixes_applied).toBeUndefined();
      });

      it('should include suggested_fixes for ambiguous components', () => {
        const yaml = `
input:
  http:
    url: http://example.com
output:
  stdout: {}
`;
        const result = validatePipelineYaml(yaml);

        expect(result.suggested_fixes).toBeDefined();
        expect(result.suggested_fixes!.length).toBeGreaterThan(0);
        expect(result.suggested_fixes![0].confidence).toBe('medium');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty YAML', () => {
        const result = validatePipelineYaml('');
        expect(result.valid).toBe(false);
      });

      it('should handle YAML with only comments', () => {
        const yaml = `# This is a comment
# Another comment
`;
        const result = validatePipelineYaml(yaml);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.includes('input'))).toBe(true);
      });

      it('should not modify valid YAML', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [my-topic]
output:
  aws_s3:
    bucket: my-bucket
`;
        const result = validatePipelineYaml(yaml);
        expect(result.valid).toBe(true);
        expect(result.fixed_yaml).toBeUndefined();
      });

      it('should handle nested Bloblang with multiple method calls', () => {
        const yaml = `
input:
  kafka:
    addresses: [localhost:9092]
    topics: [test]
pipeline:
  processors:
    - mapping: root = this.parseJson().items.mapEach(x -> x.name.toLowerCase())
output:
  stdout: {}
`;
        const result = validatePipelineYaml(yaml);

        expect(result.valid).toBe(true);
        expect(result.fixed_yaml).toContain('.parse_json()');
        expect(result.fixed_yaml).toContain('.map_each(');
        expect(result.fixed_yaml).toContain('.lowercase()');
      });
    });
  });

  describe('Registry completeness', () => {
    it('should have COMPONENT_TYPOS defined', () => {
      expect(COMPONENT_TYPOS).toBeDefined();
      expect(typeof COMPONENT_TYPOS).toBe('object');
    });

    it('should include key component typos', () => {
      expect(COMPONENT_TYPOS['kafaka']).toBe('kafka');
      expect(COMPONENT_TYPOS['s3']).toBe('aws_s3');
      expect(COMPONENT_TYPOS['elastic']).toBe('elasticsearch_v8');
      expect(COMPONENT_TYPOS['blobl']).toBe('bloblang');
      expect(COMPONENT_TYPOS['map']).toBe('mapping');
    });

    it('should have BLOBLANG_METHOD_TYPOS defined', () => {
      expect(BLOBLANG_METHOD_TYPOS).toBeDefined();
      expect(typeof BLOBLANG_METHOD_TYPOS).toBe('object');
    });

    it('should include key Bloblang method typos', () => {
      expect(BLOBLANG_METHOD_TYPOS['parseJson']).toBe('parse_json');
      expect(BLOBLANG_METHOD_TYPOS['formatJson']).toBe('format_json');
      expect(BLOBLANG_METHOD_TYPOS['mapEach']).toBe('map_each');
      expect(BLOBLANG_METHOD_TYPOS['toUpperCase']).toBe('uppercase');
      expect(BLOBLANG_METHOD_TYPOS['toLowerCase']).toBe('lowercase');
    });

    it('should have STRUCTURE_FIXES defined', () => {
      expect(STRUCTURE_FIXES).toBeDefined();
      expect(STRUCTURE_FIXES['pipeline.with']).toBe('pipeline.processors');
      expect(STRUCTURE_FIXES['pipeline.steps']).toBe('pipeline.processors');
    });
  });
});
