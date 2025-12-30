/**
 * Tests for Error Explainer
 * Validates error pattern matching and explanation quality
 */

import { describe, it, expect } from 'vitest';
import {
  explainError,
  isBloblangError,
  isConnectionError,
  type ErrorExplanation,
} from './error-explainer';

describe('Error Explainer', () => {
  describe('Component Error Explanations', () => {
    it('should explain unknown input type with typo', () => {
      const result = explainError({
        error_message: 'Unknown input type: kafaka',
      });

      expect(result.error_type).toBe('validation');
      expect(result.explanation).toContain('kafaka');
      expect(result.cause).toContain('kafka');
      expect(result.fix.description).toContain('kafka');
      expect(result.fix.after).toContain('kafka');
      expect(result.related_docs.length).toBeGreaterThan(0);
    });

    it('should explain unknown output type', () => {
      const result = explainError({
        error_message: 'Unknown output type: elastic',
      });

      expect(result.error_type).toBe('validation');
      expect(result.explanation).toContain('elastic');
      expect(result.fix.after).toBeDefined();
      expect(result.related_docs.length).toBeGreaterThan(0);
    });

    it('should explain unknown processor type', () => {
      const result = explainError({
        error_message: 'Unknown processor type: map',
      });

      expect(result.error_type).toBe('validation');
      expect(result.explanation).toContain('map');
      expect(result.explanation).toContain('mapping');
      expect(result.fix.after).toContain('mapping');
    });

    it('should explain bloblang processor typo', () => {
      const result = explainError({
        error_message: 'Unknown processor type: blobl',
      });

      // 'blobl' typo should suggest 'bloblang' or 'mapping'
      expect(result.fix.after).toMatch(/mapping|bloblang/);
    });

    it('should include before/after code examples', () => {
      const result = explainError({
        error_message: 'Unknown input type: kafaka',
        context: 'input:\n  kafaka:\n    addresses: [localhost:9092]',
      });

      expect(result.fix.before).toBeDefined();
      expect(result.fix.after).toBeDefined();
    });
  });

  describe('Benthos-UMH Component Detection', () => {
    it('should detect benthos-umh input components', () => {
      const result = explainError({
        error_message: 'Unknown input type: opcua',
      });

      expect(result.error_type).toBe('validation');
      expect(result.explanation).toContain('benthos-umh');
      expect(result.cause).toContain('United Manufacturing Hub');
      expect(result.related_docs.some(d => d.includes('benthos-umh'))).toBe(true);
    });

    it('should detect benthos-umh processor components', () => {
      const result = explainError({
        error_message: 'Unknown processor type: nodered_js',
      });

      expect(result.error_type).toBe('validation');
      expect(result.explanation).toContain('benthos-umh');
      expect(result.fix.after).toContain('docker pull');
    });

    it('should detect benthos-umh output components', () => {
      const result = explainError({
        error_message: 'Unknown output type: umh_output',
      });

      expect(result.error_type).toBe('validation');
      expect(result.explanation).toContain('benthos-umh');
      expect(result.common_mistakes.some(m => m.includes('fork'))).toBe(true);
    });

    it('should suggest alternatives for benthos-umh components', () => {
      const result = explainError({
        error_message: 'Unknown input type: ethernetip',
      });

      expect(result.fix.after).toContain('benthos-umh');
      expect(result.related_docs.some(d => d.includes('umh.app'))).toBe(true);
    });
  });

  describe('Structure Error Explanations', () => {
    it('should explain missing input section', () => {
      const result = explainError({
        error_message: 'Missing required section: input',
      });

      expect(result.error_type).toBe('validation');
      expect(result.explanation).toContain('input');
      expect(result.fix.after).toContain('input:');
    });

    it('should explain missing output section', () => {
      const result = explainError({
        error_message: 'Pipeline must have an output',
      });

      expect(result.error_type).toBe('validation');
      expect(result.explanation).toContain('output');
      expect(result.fix.after).toContain('output:');
    });

    it('should detect Kubernetes manifest structure', () => {
      const result = explainError({
        error_message: 'Invalid structure: found apiVersion, kind',
        context: 'apiVersion: v1\nkind: ConfigMap',
      });

      expect(result.explanation).toContain('Kubernetes');
      expect(result.fix.after).toContain('input:');
    });

    it('should detect Docker Compose structure', () => {
      const result = explainError({
        error_message: 'Docker compose format detected - services: and volumes:',
        context: 'services:\n  app:\n    image: myapp',
      });

      expect(result.explanation).toContain('Docker');
      expect(result.fix.after).toContain('input:');
    });
  });

  describe('Bloblang Error Explanations', () => {
    it('should explain from_json() error', () => {
      const result = explainError({
        error_message: 'Invalid function from_json()',
      });

      expect(result.error_type).toBe('bloblang');
      expect(result.explanation).toContain('from_json');
      expect(result.explanation).toContain('parse_json');
      expect(result.fix.after).toContain('.parse_json()');
    });

    it('should explain to_json() error', () => {
      const result = explainError({
        error_message: 'Unknown function to_json()',
      });

      expect(result.error_type).toBe('bloblang');
      expect(result.explanation).toContain('format_json');
      expect(result.fix.after).toContain('.format_json()');
    });

    it('should explain parseJson camelCase error', () => {
      const result = explainError({
        error_message: 'Unknown method .parseJson()',
      });

      expect(result.error_type).toBe('bloblang');
      expect(result.explanation).toContain('snake_case');
      expect(result.fix.after).toContain('parse_json');
    });

    it('should explain arrow function error', () => {
      const result = explainError({
        error_message: 'Syntax error: .map(x => x.toUpperCase())',
      });

      expect(result.error_type).toBe('bloblang');
      expect(result.explanation).toContain('arrow');
      expect(result.fix.after).toContain('map_each');
      expect(result.fix.after).toContain('->');
    });

    it('should explain if-then error', () => {
      const result = explainError({
        error_message: 'Syntax error: if this.x > 0 then',
      });

      expect(result.error_type).toBe('bloblang');
      expect(result.explanation).toContain('braces');
      expect(result.fix.after).toContain('{');
      expect(result.fix.after).toContain('}');
    });

    it('should explain return statement error', () => {
      const result = explainError({
        error_message: 'Unexpected token: return',
      });

      expect(result.error_type).toBe('bloblang');
      expect(result.explanation).toContain('root');
      expect(result.fix.after).toContain('root =');
    });

    it('should explain root = null error', () => {
      const result = explainError({
        error_message: 'Setting root = null does not filter',
      });

      expect(result.error_type).toBe('bloblang');
      expect(result.explanation).toContain('deleted');
      expect(result.fix.after).toContain('deleted()');
    });
  });

  describe('Connection Error Explanations', () => {
    it('should explain connection refused', () => {
      const result = explainError({
        error_message: 'Connection refused: localhost:9092',
      });

      expect(result.error_type).toBe('connection');
      expect(result.explanation).toContain('connect');
      expect(result.fix.after).toContain('service');
    });

    it('should explain ECONNREFUSED', () => {
      const result = explainError({
        error_message: 'Error: ECONNREFUSED',
      });

      expect(result.error_type).toBe('connection');
    });

    it('should explain authentication failed', () => {
      const result = explainError({
        error_message: 'Authentication failed: 401 Unauthorized',
      });

      expect(result.error_type).toBe('connection');
      expect(result.explanation).toContain('Authentication');
      expect(result.fix.after).toContain('API keys');
    });

    it('should explain timeout errors', () => {
      const result = explainError({
        error_message: 'Request timed out after 30s',
      });

      expect(result.error_type).toBe('connection');
      expect(result.explanation).toContain('timed out');
      expect(result.fix.after).toContain('timeout');
    });
  });

  describe('Modbus Error Explanations', () => {
    it('should explain Modbus exception code 3 (Illegal Data Value)', () => {
      const result = explainError({
        error_message: 'Modbus exception code 3',
      });

      expect(result.error_type).toBe('connection');
      expect(result.explanation).toContain('Exception Code 3');
      expect(result.explanation).toContain('Illegal Data Value');
      expect(result.cause).toContain('value');
      expect(result.common_mistakes).toContain('Wrong Slave ID (device address)');
    });

    it('should explain Modbus exception code 2 (Illegal Data Address)', () => {
      const result = explainError({
        error_message: 'Error: modbus exception 2 on device',
      });

      expect(result.error_type).toBe('connection');
      expect(result.explanation).toContain('Illegal Data Address');
      expect(result.fix.after).toContain('modbus');
    });

    it('should explain generic Modbus errors without exception code', () => {
      const result = explainError({
        error_message: 'Illegal function error from slave device',
      });

      expect(result.error_type).toBe('connection');
      expect(result.common_mistakes.some(m => m.includes('Slave ID'))).toBe(true);
    });

    it('should include Modbus troubleshooting documentation links', () => {
      const result = explainError({
        error_message: 'Modbus exception code 1',
      });

      expect(result.related_docs.some(d => d.includes('modbus'))).toBe(true);
    });
  });

  describe('YAML Syntax Error Explanations', () => {
    it('should explain YAML indentation errors', () => {
      const result = explainError({
        error_message: 'YAML error: bad indentation',
      });

      expect(result.error_type).toBe('validation');
      expect(result.explanation).toContain('YAML');
      // Check that common mistakes include indentation-related advice
      expect(result.common_mistakes.some(m => m.toLowerCase().includes('indent'))).toBe(true);
    });
  });

  describe('Context Usage', () => {
    it('should use provided context in fix.before', () => {
      const context = 'input:\n  kafaka:\n    addresses: [localhost]';
      const result = explainError({
        error_message: 'Unknown input type: kafaka',
        context,
      });

      expect(result.fix.before).toBe(context);
    });

    it('should provide default before when no context', () => {
      const result = explainError({
        error_message: 'Unknown input type: kafaka',
      });

      expect(result.fix.before).toBeDefined();
      expect(result.fix.before).toContain('kafaka');
    });
  });

  describe('Documentation Links', () => {
    it('should include relevant docs for component errors', () => {
      const result = explainError({
        error_message: 'Unknown input type: kafaka',
      });

      expect(result.related_docs.length).toBeGreaterThan(0);
      expect(result.related_docs.some(url => url.includes('docs.expanso.io'))).toBe(true);
    });

    it('should include Bloblang docs for Bloblang errors', () => {
      const result = explainError({
        error_message: 'Invalid function from_json()',
      });

      expect(result.related_docs.some(url => url.includes('bloblang'))).toBe(true);
    });
  });

  describe('Common Mistakes', () => {
    it('should include common mistakes for component errors', () => {
      const result = explainError({
        error_message: 'Unknown input type: kafaka',
      });

      expect(result.common_mistakes.length).toBeGreaterThan(0);
    });

    it('should include relevant mistakes for Bloblang errors', () => {
      const result = explainError({
        error_message: 'Invalid function from_json()',
      });

      expect(result.common_mistakes.some(m => m.includes('parse_json'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown error patterns gracefully', () => {
      const result = explainError({
        error_message: 'Some completely unknown error xyz123',
      });

      expect(result.error_type).toBe('unknown');
      expect(result.explanation).toBeDefined();
      expect(result.fix.after).toBeDefined();
      expect(result.related_docs.length).toBeGreaterThan(0);
    });

    it('should handle empty error message', () => {
      const result = explainError({
        error_message: '',
      });

      expect(result).toBeDefined();
      expect(result.error_type).toBe('unknown');
    });

    it('should handle very long error messages', () => {
      const longError = 'Error: '.repeat(100) + 'Unknown input type: test';
      const result = explainError({
        error_message: longError,
      });

      expect(result).toBeDefined();
    });

    it('should respect error_type override', () => {
      const result = explainError({
        error_message: 'Unknown input type: kafaka',
        error_type: 'runtime',
      });

      expect(result.error_type).toBe('runtime');
    });
  });

  describe('Response Structure', () => {
    it('should return properly structured explanation', () => {
      const result = explainError({
        error_message: 'Unknown input type: kafaka',
      });

      expect(result).toHaveProperty('error_type');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('cause');
      expect(result).toHaveProperty('fix');
      expect(result.fix).toHaveProperty('description');
      expect(result.fix).toHaveProperty('after');
      expect(result).toHaveProperty('related_docs');
      expect(result).toHaveProperty('common_mistakes');

      expect(typeof result.error_type).toBe('string');
      expect(typeof result.explanation).toBe('string');
      expect(typeof result.cause).toBe('string');
      expect(typeof result.fix.description).toBe('string');
      expect(typeof result.fix.after).toBe('string');
      expect(Array.isArray(result.related_docs)).toBe(true);
      expect(Array.isArray(result.common_mistakes)).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    describe('isBloblangError', () => {
      it('should detect Bloblang-related errors', () => {
        expect(isBloblangError('bloblang error')).toBe(true);
        expect(isBloblangError('mapping processor failed')).toBe(true);
        expect(isBloblangError('parse_json() method')).toBe(true);
        expect(isBloblangError('root = this.value')).toBe(true);
      });

      it('should not flag non-Bloblang errors', () => {
        expect(isBloblangError('kafka connection failed')).toBe(false);
        expect(isBloblangError('s3 bucket not found')).toBe(false);
      });
    });

    describe('isConnectionError', () => {
      it('should detect connection-related errors', () => {
        expect(isConnectionError('connection refused')).toBe(true);
        expect(isConnectionError('ECONNREFUSED')).toBe(true);
        expect(isConnectionError('request timeout')).toBe(true);
        expect(isConnectionError('network unreachable')).toBe(true);
      });

      it('should not flag non-connection errors', () => {
        expect(isConnectionError('unknown input type')).toBe(false);
        expect(isConnectionError('invalid yaml')).toBe(false);
      });
    });
  });
});
