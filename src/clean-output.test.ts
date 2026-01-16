/**
 * Tests for Clean Output Contract
 *
 * Ensures that responses to users never leak internal implementation details
 * like retry attempts, error categories, or fix explanations.
 */

import { describe, it, expect } from 'vitest';
import { cleanResponseText, INTERNAL_PHRASES, INTERNAL_ERROR_CATEGORIES } from './response-cleaner';

describe('Clean Output Contract', () => {
  describe('INTERNAL_PHRASES detection', () => {
    it('should detect "I made the following changes"', () => {
      const text = 'Here is the pipeline. I made the following changes to fix the errors.';
      expect(INTERNAL_PHRASES.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()))).toBe(true);
    });

    it('should detect "I\'ve removed"', () => {
      const text = "I've removed the invalid field from the configuration.";
      expect(INTERNAL_PHRASES.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()))).toBe(true);
    });

    it('should detect "I simplified"', () => {
      const text = 'I simplified the pipeline structure.';
      expect(INTERNAL_PHRASES.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()))).toBe(true);
    });

    it('should detect "should now be valid"', () => {
      const text = 'The YAML should now be valid.';
      expect(INTERNAL_PHRASES.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()))).toBe(true);
    });

    it('should detect "I have removed"', () => {
      const text = 'I have removed the duplicate keys.';
      expect(INTERNAL_PHRASES.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()))).toBe(true);
    });

    it('should detect "I have fixed"', () => {
      const text = 'I have fixed the validation errors.';
      expect(INTERNAL_PHRASES.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()))).toBe(true);
    });
  });

  describe('INTERNAL_ERROR_CATEGORIES detection', () => {
    it('should detect IMAGINED_COMPONENT', () => {
      const text = 'Error: IMAGINED_COMPONENT - kafka2 is not a valid component';
      expect(INTERNAL_ERROR_CATEGORIES.some(cat => text.includes(cat))).toBe(true);
    });

    it('should detect IMAGINED_FIELD', () => {
      const text = 'IMAGINED_FIELD: max_in_flight is not valid';
      expect(INTERNAL_ERROR_CATEGORIES.some(cat => text.includes(cat))).toBe(true);
    });

    it('should detect IMAGINED_STRUCTURE', () => {
      const text = 'The error was IMAGINED_STRUCTURE';
      expect(INTERNAL_ERROR_CATEGORIES.some(cat => text.includes(cat))).toBe(true);
    });

    it('should detect IMAGINED_SYNTAX', () => {
      const text = 'Found IMAGINED_SYNTAX error in bloblang';
      expect(INTERNAL_ERROR_CATEGORIES.some(cat => text.includes(cat))).toBe(true);
    });
  });

  describe('cleanResponseText', () => {
    it('should remove internal change explanations', () => {
      const dirty = `Here is your pipeline:

\`\`\`yaml
input:
  kafka:
    addresses: [localhost:9092]
\`\`\`

I made the following changes:
- Removed the invalid field
- Simplified the structure

This should now be valid.`;

      const clean = cleanResponseText(dirty);

      expect(clean).not.toContain('I made the following changes');
      expect(clean).not.toContain('Removed the invalid');
      expect(clean).not.toContain('Simplified the structure');
      expect(clean).not.toContain('should now be valid');
      expect(clean).toContain('```yaml');
    });

    it('should remove bullet point lists explaining fixes', () => {
      const dirty = `Here is the pipeline:

\`\`\`yaml
input:
  generate:
    mapping: root = {}
\`\`\`

- Removed max_in_flight as it's not valid
- Changed kafka to generate
- Fixed the syntax error`;

      const clean = cleanResponseText(dirty);

      expect(clean).not.toContain('Removed max_in_flight');
      expect(clean).not.toContain('Changed kafka');
      expect(clean).not.toContain('Fixed the syntax');
      expect(clean).toContain('```yaml');
    });

    it('should remove "I\'ve" style explanations', () => {
      const dirty = `\`\`\`yaml
input:
  kafka:
    addresses: [localhost:9092]
\`\`\`

I've removed the invalid batching configuration and simplified the output section.`;

      const clean = cleanResponseText(dirty);

      expect(clean).not.toContain("I've removed");
      expect(clean).not.toContain('simplified');
    });

    it('should remove "I have" style explanations', () => {
      const dirty = `\`\`\`yaml
output:
  stdout: {}
\`\`\`

I have fixed the validation errors and updated the configuration.`;

      const clean = cleanResponseText(dirty);

      expect(clean).not.toContain('I have fixed');
      expect(clean).not.toContain('updated the configuration');
    });

    it('should remove "This pipeline is now valid" statements', () => {
      const dirty = `\`\`\`yaml
input:
  generate: {}
\`\`\`

This pipeline is now valid and ready to use.`;

      const clean = cleanResponseText(dirty);

      expect(clean).not.toContain('is now valid');
    });

    it('should preserve YAML blocks', () => {
      const dirty = `Here is your pipeline:

\`\`\`yaml
input:
  kafka:
    addresses: [localhost:9092]
    topics: [my-topic]
output:
  stdout: {}
\`\`\`

I made the following changes to fix it.`;

      const clean = cleanResponseText(dirty);

      expect(clean).toContain('kafka:');
      expect(clean).toContain('addresses:');
      expect(clean).toContain('topics:');
      expect(clean).toContain('stdout:');
    });

    it('should preserve normal explanatory text', () => {
      const dirty = `Here is a Kafka to S3 pipeline:

\`\`\`yaml
input:
  kafka:
    addresses: [localhost:9092]
output:
  aws_s3:
    bucket: my-bucket
\`\`\`

This pipeline reads from Kafka and writes to S3. You can adjust the addresses and bucket name.`;

      const clean = cleanResponseText(dirty);

      expect(clean).toContain('reads from Kafka');
      expect(clean).toContain('writes to S3');
      expect(clean).toContain('adjust the addresses');
    });

    it('should not remove valid technical terms', () => {
      const text = `The pipeline uses a mapping processor to transform data.
You can modify the input configuration as needed.`;

      const clean = cleanResponseText(text);

      expect(clean).toContain('mapping processor');
      expect(clean).toContain('transform data');
      expect(clean).toContain('modify the input');
    });

    it('should remove LLM-generated "Components used" section', () => {
      const dirty = `\`\`\`yaml
input:
  kafka: {}
output:
  stdout: {}
\`\`\`

**Components used:**
- Input: kafka
- Output: stdout`;

      const clean = cleanResponseText(dirty);

      expect(clean).not.toContain('Components used');
      expect(clean).not.toContain('Input: kafka');
    });

    it('should handle multiple internal phrases in one response', () => {
      const dirty = `\`\`\`yaml
input:
  generate: {}
\`\`\`

I've removed the invalid fields. I simplified the configuration. This should now be valid. I made the following changes:
- Fixed the component name
- Removed extra fields`;

      const clean = cleanResponseText(dirty);

      expect(clean).not.toContain("I've removed");
      expect(clean).not.toContain('I simplified');
      expect(clean).not.toContain('should now be valid');
      expect(clean).not.toContain('I made the following');
      expect(clean).not.toContain('Fixed the component');
    });

    it('should not break on empty input', () => {
      expect(() => cleanResponseText('')).not.toThrow();
      expect(cleanResponseText('')).toBe('');
    });

    it('should not break on YAML-only input', () => {
      const yamlOnly = `\`\`\`yaml
input:
  kafka: {}
\`\`\``;

      const clean = cleanResponseText(yamlOnly);
      expect(clean).toContain('kafka:');
    });
  });

  describe('hasInternalLeakage', () => {
    // Import function if exported
    it('should detect internal error categories in text', () => {
      const text = 'The IMAGINED_COMPONENT error indicates an invalid component name.';
      const hasLeak = INTERNAL_ERROR_CATEGORIES.some(cat => text.includes(cat));
      expect(hasLeak).toBe(true);
    });

    it('should not flag normal technical text', () => {
      const text = 'This pipeline reads from Kafka and writes to S3.';
      const hasLeak = INTERNAL_ERROR_CATEGORIES.some(cat => text.includes(cat));
      expect(hasLeak).toBe(false);
    });
  });
});
