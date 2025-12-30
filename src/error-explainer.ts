/**
 * Error Explainer
 *
 * Provides detailed explanations and fixes for pipeline validation errors.
 * Transforms cryptic error messages into actionable guidance.
 */

import { VALID_INPUTS, VALID_OUTPUTS, VALID_PROCESSORS } from './pipeline-validator';

// ============================================================================
// Types
// ============================================================================

export type ErrorType = 'validation' | 'runtime' | 'connection' | 'bloblang' | 'unknown';

export interface ErrorExplanation {
  error_type: ErrorType;
  explanation: string;
  cause: string;
  fix: {
    description: string;
    before?: string;
    after: string;
  };
  related_docs: string[];
  common_mistakes: string[];
}

export interface ExplainOptions {
  error_message: string;
  context?: string;
  error_type?: ErrorType;
}

// ============================================================================
// Component Name Helpers
// ============================================================================

/**
 * Get all valid component names across all categories
 */
function getAllComponentNames(): string[] {
  return [
    ...Array.from(VALID_INPUTS),
    ...Array.from(VALID_OUTPUTS),
    ...Array.from(VALID_PROCESSORS),
  ];
}

/**
 * Get component names for a specific category
 */
function getComponentNames(category: 'inputs' | 'outputs' | 'processors'): string[] {
  switch (category) {
    case 'inputs':
      return Array.from(VALID_INPUTS);
    case 'outputs':
      return Array.from(VALID_OUTPUTS);
    case 'processors':
      return Array.from(VALID_PROCESSORS);
    default:
      return [];
  }
}

/**
 * Find similar component names using Levenshtein-like matching
 */
function findSimilarComponents(name: string, category?: 'inputs' | 'outputs' | 'processors'): string[] {
  const candidates = category ? getComponentNames(category) : getAllComponentNames();
  const normalized = name.toLowerCase();

  // Exact substring matches first
  const substringMatches = candidates.filter(
    (c) => c.includes(normalized) || normalized.includes(c)
  );

  // Then prefix matches
  const prefixMatches = candidates.filter(
    (c) => c.startsWith(normalized.slice(0, 3)) || normalized.startsWith(c.slice(0, 3))
  );

  // Combine and dedupe
  const matches = [...new Set([...substringMatches, ...prefixMatches])];
  return matches.slice(0, 5);
}

// ============================================================================
// Documentation Links
// ============================================================================

const DOCS_BASE = 'https://docs.expanso.io';

function getComponentDocsUrl(component: string, category?: string): string {
  const cat = category || 'components';
  return `${DOCS_BASE}/${cat}/${component}`;
}

function getBloblangDocsUrl(topic?: string): string {
  if (topic) {
    return `${DOCS_BASE}/bloblang/${topic}`;
  }
  return `${DOCS_BASE}/bloblang`;
}

function getGettingStartedUrl(): string {
  return `${DOCS_BASE}/getting-started`;
}

// ============================================================================
// Error Pattern Database
// ============================================================================

interface ErrorPattern {
  pattern: RegExp;
  type: ErrorType;
  explain: (match: RegExpMatchArray, context?: string) => ErrorExplanation;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // ============================================================================
  // Component Errors
  // ============================================================================
  {
    pattern: /unknown\s+input\s+(?:type[:\s]+)?["']?(\w+)["']?/i,
    type: 'validation',
    explain: (match, context) => {
      const badName = match[1];
      const suggestions = findSimilarComponents(badName, 'inputs');
      const bestMatch = suggestions[0] || 'kafka';

      return {
        error_type: 'validation',
        explanation: `The input type "${badName}" doesn't exist in Expanso/Benthos.`,
        cause: suggestions.length > 0
          ? `This looks like a typo. Did you mean "${bestMatch}"?`
          : `"${badName}" is not a valid input component. Check the docs for available inputs.`,
        fix: {
          description: `Change "${badName}" to "${bestMatch}"`,
          before: context || `input:\n  ${badName}:\n    # config...`,
          after: `input:\n  ${bestMatch}:\n    # config...`,
        },
        related_docs: [
          getComponentDocsUrl(bestMatch, 'inputs'),
          `${DOCS_BASE}/components/inputs`,
        ],
        common_mistakes: [
          'kafka vs kafaka (typo)',
          'http_server vs http (http_server for receiving, http for sending)',
          'aws_s3 vs s3 (use aws_s3)',
        ],
      };
    },
  },
  {
    pattern: /unknown\s+output\s+(?:type[:\s]+)?["']?(\w+)["']?/i,
    type: 'validation',
    explain: (match, context) => {
      const badName = match[1];
      const suggestions = findSimilarComponents(badName, 'outputs');
      const bestMatch = suggestions[0] || 'stdout';

      return {
        error_type: 'validation',
        explanation: `The output type "${badName}" doesn't exist in Expanso/Benthos.`,
        cause: suggestions.length > 0
          ? `This looks like a typo. Did you mean "${bestMatch}"?`
          : `"${badName}" is not a valid output component.`,
        fix: {
          description: `Change "${badName}" to "${bestMatch}"`,
          before: context || `output:\n  ${badName}:\n    # config...`,
          after: `output:\n  ${bestMatch}:\n    # config...`,
        },
        related_docs: [
          getComponentDocsUrl(bestMatch, 'outputs'),
          `${DOCS_BASE}/components/outputs`,
        ],
        common_mistakes: [
          'elasticsearch vs elasticsearch_v8 (use v8 version)',
          'aws_s3 vs s3 (use aws_s3)',
          'http vs http_client (use http_client for requests)',
        ],
      };
    },
  },
  {
    pattern: /unknown\s+processor\s+(?:type[:\s]+)?["']?(\w+)["']?/i,
    type: 'validation',
    explain: (match, context) => {
      const badName = match[1];
      const suggestions = findSimilarComponents(badName, 'processors');
      const bestMatch = suggestions[0] || 'mapping';

      // Special cases
      let specificAdvice = '';
      if (badName.toLowerCase() === 'map') {
        specificAdvice = 'Note: "map" is not a processor. Use "mapping" for Bloblang transformations.';
      } else if (badName.toLowerCase() === 'bloblang') {
        specificAdvice = 'Note: "bloblang" is called "mapping" in Benthos/Expanso.';
      }

      return {
        error_type: 'validation',
        explanation: `The processor type "${badName}" doesn't exist. ${specificAdvice}`.trim(),
        cause: suggestions.length > 0
          ? `Did you mean "${bestMatch}"?`
          : `"${badName}" is not a valid processor.`,
        fix: {
          description: `Change "${badName}" to "${bestMatch}"`,
          before: context || `pipeline:\n  processors:\n    - ${badName}:\n        # config...`,
          after: `pipeline:\n  processors:\n    - ${bestMatch}: |\n        root = this`,
        },
        related_docs: [
          getComponentDocsUrl(bestMatch, 'processors'),
          `${DOCS_BASE}/components/processors`,
        ],
        common_mistakes: [
          'map vs mapping (use mapping)',
          'bloblang vs mapping (use mapping)',
          'transform vs mapping (use mapping)',
          'filter vs mapping with deleted() (use mapping)',
        ],
      };
    },
  },

  // ============================================================================
  // Structure Errors
  // ============================================================================
  {
    pattern: /missing\s+(?:required\s+)?(?:section[:\s]+)?["']?input["']?|pipeline\s+must\s+have\s+(?:an\s+)?input/i,
    type: 'validation',
    explain: (match, context) => ({
      error_type: 'validation',
      explanation: 'Every Expanso pipeline requires an "input:" section that defines where data comes from.',
      cause: 'Your YAML is missing the input section, or it might be indented incorrectly.',
      fix: {
        description: 'Add an input section at the root level of your YAML',
        before: context || `output:\n  stdout: {}`,
        after: `input:\n  generate:\n    mapping: 'root = "test"'\n    interval: 1s\n\noutput:\n  stdout: {}`,
      },
      related_docs: [
        `${DOCS_BASE}/components/inputs`,
        getGettingStartedUrl(),
      ],
      common_mistakes: [
        'Indenting input under another key',
        'Using "inputs:" (plural) instead of "input:"',
        'Missing the colon after "input"',
      ],
    }),
  },
  {
    pattern: /missing\s+(?:required\s+)?(?:section[:\s]+)?["']?output["']?|pipeline\s+must\s+have\s+(?:an\s+)?output/i,
    type: 'validation',
    explain: (match, context) => ({
      error_type: 'validation',
      explanation: 'Every Expanso pipeline requires an "output:" section that defines where data goes.',
      cause: 'Your YAML is missing the output section, or it might be indented incorrectly.',
      fix: {
        description: 'Add an output section at the root level of your YAML',
        before: context || `input:\n  generate:\n    mapping: 'root = "test"'`,
        after: `input:\n  generate:\n    mapping: 'root = "test"'\n\noutput:\n  stdout: {}`,
      },
      related_docs: [
        `${DOCS_BASE}/components/outputs`,
        getGettingStartedUrl(),
      ],
      common_mistakes: [
        'Indenting output under another key',
        'Using "outputs:" (plural) instead of "output:"',
        'Missing the colon after "output"',
      ],
    }),
  },
  {
    pattern: /kubernetes|apiversion|kind:\s*(?:configmap|deployment|service)/i,
    type: 'validation',
    explain: () => ({
      error_type: 'validation',
      explanation: 'This looks like a Kubernetes manifest, not an Expanso pipeline.',
      cause: 'Expanso pipelines use input/pipeline/output structure, not Kubernetes apiVersion/kind structure.',
      fix: {
        description: 'Convert to Expanso pipeline format',
        before: `apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: my-config`,
        after: `input:\n  kafka:\n    addresses: ["localhost:9092"]\n    topics: ["my-topic"]\n\noutput:\n  stdout: {}`,
      },
      related_docs: [getGettingStartedUrl()],
      common_mistakes: [
        'Copying K8s ConfigMap instead of the pipeline YAML inside it',
        'Using K8s deployment format for pipeline config',
      ],
    }),
  },
  {
    pattern: /docker|services:|volumes:|version:\s*["']?[23]/i,
    type: 'validation',
    explain: () => ({
      error_type: 'validation',
      explanation: 'This looks like a Docker Compose file, not an Expanso pipeline.',
      cause: 'Expanso pipelines use input/pipeline/output structure, not Docker services/volumes structure.',
      fix: {
        description: 'Convert to Expanso pipeline format',
        before: `version: "3"\nservices:\n  app:\n    image: myapp`,
        after: `input:\n  http_server:\n    address: 0.0.0.0:8080\n\noutput:\n  stdout: {}`,
      },
      related_docs: [getGettingStartedUrl()],
      common_mistakes: [
        'Pasting Docker Compose instead of the pipeline config',
        'Confusing Docker service config with pipeline config',
      ],
    }),
  },

  // ============================================================================
  // Bloblang Errors
  // ============================================================================
  {
    pattern: /from_json\s*\(/i,
    type: 'bloblang',
    explain: (match, context) => ({
      error_type: 'bloblang',
      explanation: 'Bloblang doesn\'t have a from_json() function. Use the .parse_json() method instead.',
      cause: 'Common mistake from JavaScript/Python where JSON parsing is a standalone function. In Bloblang, it\'s a method you call on a value.',
      fix: {
        description: 'Change from_json(value) to value.parse_json()',
        before: context || `root = from_json(this.raw_data)`,
        after: `root = this.raw_data.parse_json()`,
      },
      related_docs: [
        getBloblangDocsUrl('methods/parse_json'),
        getBloblangDocsUrl(),
      ],
      common_mistakes: [
        'from_json(x) → x.parse_json()',
        'to_json(x) → x.format_json()',
        'JSON.parse(x) → x.parse_json()',
      ],
    }),
  },
  {
    pattern: /to_json\s*\(/i,
    type: 'bloblang',
    explain: (match, context) => ({
      error_type: 'bloblang',
      explanation: 'Bloblang doesn\'t have a to_json() function. Use the .format_json() method instead.',
      cause: 'Common mistake from other languages. In Bloblang, JSON serialization is a method.',
      fix: {
        description: 'Change to_json(value) to value.format_json()',
        before: context || `root = to_json(this.data)`,
        after: `root = this.data.format_json()`,
      },
      related_docs: [
        getBloblangDocsUrl('methods/format_json'),
        getBloblangDocsUrl(),
      ],
      common_mistakes: [
        'to_json(x) → x.format_json()',
        'JSON.stringify(x) → x.format_json()',
        'json.dumps(x) → x.format_json()',
      ],
    }),
  },
  {
    pattern: /\.parseJson\s*\(|\.parsejson\s*\(/i,
    type: 'bloblang',
    explain: (match, context) => ({
      error_type: 'bloblang',
      explanation: 'Bloblang uses snake_case for method names. Use .parse_json() not .parseJson().',
      cause: 'Bloblang follows snake_case convention, not camelCase like JavaScript.',
      fix: {
        description: 'Change .parseJson() to .parse_json()',
        before: context || `root = this.data.parseJson()`,
        after: `root = this.data.parse_json()`,
      },
      related_docs: [getBloblangDocsUrl('methods/parse_json')],
      common_mistakes: [
        'parseJson → parse_json',
        'mapEach → map_each',
        'formatJson → format_json',
        'toUpperCase → uppercase',
      ],
    }),
  },
  {
    pattern: /\.map\s*\(\s*\w+\s*=>/i,
    type: 'bloblang',
    explain: (match, context) => ({
      error_type: 'bloblang',
      explanation: 'Bloblang doesn\'t use arrow functions. Use .map_each() with Bloblang syntax.',
      cause: 'JavaScript-style arrow functions (=>) don\'t work in Bloblang. Use map_each with "this" reference.',
      fix: {
        description: 'Change .map(x => ...) to .map_each(item -> ...)',
        before: context || `root = this.items.map(x => x.toUpperCase())`,
        after: `root = this.items.map_each(item -> item.uppercase())`,
      },
      related_docs: [getBloblangDocsUrl('methods/map_each')],
      common_mistakes: [
        '.map(x => x) → .map_each(x -> x)',
        'Arrow => → Bloblang arrow ->',
        '.forEach() → .map_each()',
      ],
    }),
  },
  {
    pattern: /if\s+.+\s+then\s*$/m,
    type: 'bloblang',
    explain: (match, context) => ({
      error_type: 'bloblang',
      explanation: 'Bloblang if-then-else must use braces, not keywords only.',
      cause: 'Unlike some languages, Bloblang requires braces for conditionals.',
      fix: {
        description: 'Use if condition { value } else { other } syntax',
        before: context || `root = if this.x > 0 then "positive"`,
        after: `root = if this.x > 0 { "positive" } else { "non-positive" }`,
      },
      related_docs: [getBloblangDocsUrl('conditionals')],
      common_mistakes: [
        'if x then y → if x { y }',
        'Must include else clause or use match',
        'Braces are required, not optional',
      ],
    }),
  },
  {
    pattern: /\breturn\b/i,
    type: 'bloblang',
    explain: (match, context) => ({
      error_type: 'bloblang',
      explanation: 'Bloblang doesn\'t use "return" statements. Assign to "root" instead.',
      cause: 'Bloblang uses assignment (root = ...) instead of return statements.',
      fix: {
        description: 'Change "return value" to "root = value"',
        before: context || `return this.data.parse_json()`,
        after: `root = this.data.parse_json()`,
      },
      related_docs: [getBloblangDocsUrl()],
      common_mistakes: [
        'return x → root = x',
        'Bloblang is expression-based, not statement-based',
        'The last expression assigned to root is the output',
      ],
    }),
  },
  {
    pattern: /root\s*=\s*null\b/i,
    type: 'bloblang',
    explain: (match, context) => ({
      error_type: 'bloblang',
      explanation: 'Setting root = null doesn\'t drop the message. Use deleted() instead.',
      cause: 'In Bloblang, null is a valid value. To drop/filter a message, use the deleted() function.',
      fix: {
        description: 'Change "root = null" to "root = deleted()"',
        before: context || `root = if this.skip { null } else { this }`,
        after: `root = if this.skip { deleted() } else { this }`,
      },
      related_docs: [getBloblangDocsUrl('functions/deleted')],
      common_mistakes: [
        'root = null sends null, doesn\'t filter',
        'deleted() actually drops the message',
        'Use deleted() in conditionals to filter',
      ],
    }),
  },

  // ============================================================================
  // Connection Errors
  // ============================================================================
  {
    pattern: /connection\s+refused|ECONNREFUSED|cannot\s+connect/i,
    type: 'connection',
    explain: (match, context) => ({
      error_type: 'connection',
      explanation: 'The pipeline cannot connect to the specified service.',
      cause: 'The target service is not running, not accessible, or the address/port is wrong.',
      fix: {
        description: 'Verify the service is running and the connection details are correct',
        after: `# Check these common issues:
# 1. Is the service running? (docker ps, systemctl status, etc.)
# 2. Is the address correct? (localhost vs container name vs IP)
# 3. Is the port correct? (default ports: Kafka 9092, Redis 6379, etc.)
# 4. Are there firewall rules blocking the connection?
# 5. For Docker: are containers on the same network?`,
      },
      related_docs: [getGettingStartedUrl()],
      common_mistakes: [
        'localhost inside Docker should be the container/service name',
        'Kafka default port is 9092, not 9093 (SSL)',
        'Redis default port is 6379',
        'Elasticsearch default port is 9200',
      ],
    }),
  },
  {
    pattern: /authentication\s+failed|unauthorized|403|401|access\s+denied/i,
    type: 'connection',
    explain: (match, context) => ({
      error_type: 'connection',
      explanation: 'Authentication or authorization failed.',
      cause: 'The credentials are wrong, missing, or the user lacks permissions.',
      fix: {
        description: 'Check your credentials and permissions',
        after: `# Common auth issues:
# 1. API keys/tokens: check they're not expired
# 2. Username/password: verify they're correct
# 3. IAM roles: ensure the role has required permissions
# 4. Environment variables: check they're set correctly
# 5. Secrets: ensure they're properly formatted`,
      },
      related_docs: [getGettingStartedUrl()],
      common_mistakes: [
        'AWS credentials not set or expired',
        'API key in wrong header format',
        'Missing required IAM permissions',
        'Token expired and not refreshed',
      ],
    }),
  },
  {
    pattern: /timeout|timed?\s*out|deadline\s+exceeded/i,
    type: 'connection',
    explain: (match, context) => ({
      error_type: 'connection',
      explanation: 'The operation timed out waiting for a response.',
      cause: 'The target service is too slow, overloaded, or there\'s a network issue.',
      fix: {
        description: 'Increase timeout or check service health',
        after: `# To increase timeout in your component:
http:
  url: https://slow-api.example.com
  timeout: 30s  # Increase from default

# Or for Kafka:
kafka:
  addresses: ["broker:9092"]
  consumer_fetch_timeout: 5s`,
      },
      related_docs: [getGettingStartedUrl()],
      common_mistakes: [
        'Default timeouts may be too short for slow APIs',
        'Network latency not accounted for',
        'Target service overloaded',
        'DNS resolution taking too long',
      ],
    }),
  },

  // ============================================================================
  // Modbus Errors (Industrial Protocol)
  // ============================================================================
  {
    pattern: /modbus.*exception\s*(?:code\s*)?(\d+)|exception\s*(\d+).*modbus|illegal\s+(?:function|data\s+(?:address|value))|slave.*(?:failure|busy)|gateway/i,
    type: 'connection',
    explain: (match, context) => {
      // Extract exception code from the error message
      const codeMatch = match[0].match(/(?:exception\s*(?:code\s*)?|code\s*)(\d+)/i);
      const exceptionCode = codeMatch ? parseInt(codeMatch[1], 10) : null;

      // Modbus exception code explanations
      const exceptionExplanations: Record<number, { name: string; cause: string; fix: string }> = {
        1: {
          name: 'Illegal Function',
          cause: 'The function code is not supported by the slave device.',
          fix: 'Check your function code (FC). Common: FC1=coils, FC2=discrete inputs, FC3=holding registers, FC4=input registers. Verify your device supports the requested function.',
        },
        2: {
          name: 'Illegal Data Address',
          cause: 'The register address does not exist on the slave device.',
          fix: 'Verify register addresses in device documentation. Addresses are often 0-indexed. Some devices use 40001-based addressing for holding registers.',
        },
        3: {
          name: 'Illegal Data Value',
          cause: 'The value in the query data field is not acceptable to the server.',
          fix: 'Check: 1) Register count matches data type (FLOAT32 needs 2 registers), 2) Value is within valid range, 3) Byte order/endianness is correct.',
        },
        4: {
          name: 'Slave Device Failure',
          cause: 'An unrecoverable error occurred on the slave device.',
          fix: 'Check device status and logs. May need device restart or maintenance.',
        },
        5: {
          name: 'Acknowledge',
          cause: 'The slave accepted the request but needs time to process.',
          fix: 'Increase timeout values. The device is processing a long-running operation.',
        },
        6: {
          name: 'Slave Device Busy',
          cause: 'The slave is busy processing another command.',
          fix: 'Increase timeBetweenReads or add delays between requests. The device may be overloaded.',
        },
        10: {
          name: 'Gateway Path Unavailable',
          cause: 'Gateway cannot reach the target device on the network.',
          fix: 'Check network path and device availability. Verify Slave ID matches target device.',
        },
        11: {
          name: 'Gateway Target Failed to Respond',
          cause: 'No response from target device through the gateway.',
          fix: 'Verify Slave ID, check device power and connection, increase timeout.',
        },
      };

      const exInfo = exceptionCode !== null ? exceptionExplanations[exceptionCode] : null;

      return {
        error_type: 'connection' as ErrorType,
        explanation: exInfo
          ? `Modbus Exception Code ${exceptionCode}: ${exInfo.name}`
          : 'Modbus communication error with the device.',
        cause: exInfo?.cause || 'Configuration mismatch between Benthos and the Modbus device.',
        fix: {
          description: exInfo?.fix || 'Verify Modbus configuration matches device specifications',
          after: `# Modbus troubleshooting checklist:
input:
  modbus:
    controller: tcp://192.168.1.100:502
    slaveIDs: [1]  # Verify this matches your device
    timeout: 1s
    timeBetweenReads: 500ms  # Increase if device is slow
    addresses:
      - name: temperature
        register: holding  # FC3. Use 'input' for FC4
        address: 0         # Verify in device documentation
        type: float32      # Must match device data type
        # byte_order: ABCD  # Try DCBA, BADC, CDAB if values look wrong`,
        },
        related_docs: [
          `${DOCS_BASE}/components/inputs/modbus`,
          'https://learn.umh.app/course/troubleshooting-modbus-exception-errors-in-benthos-umh-on-umh-platform/',
        ],
        common_mistakes: [
          'Wrong Slave ID (device address)',
          'Register address off-by-one (0-indexed vs 1-indexed)',
          'Wrong function code (FC3 vs FC4)',
          'Data type mismatch (INT16 vs FLOAT32)',
          'Byte order/endianness incorrect',
          'Polling too fast for slow devices',
        ],
      };
    },
  },

  // ============================================================================
  // YAML Syntax Errors
  // ============================================================================
  {
    pattern: /yaml|indentation|indent|mapping\s+values|expected|unexpected/i,
    type: 'validation',
    explain: (match, context) => ({
      error_type: 'validation',
      explanation: 'There\'s a YAML syntax error in your pipeline configuration.',
      cause: 'Common YAML issues: incorrect indentation, missing colons, or invalid characters.',
      fix: {
        description: 'Check YAML syntax, especially indentation',
        before: context || `input:\nkafka:  # Wrong - not indented\n  addresses: [localhost:9092]`,
        after: `input:\n  kafka:  # Correct - indented 2 spaces\n    addresses:\n      - localhost:9092`,
      },
      related_docs: [getGettingStartedUrl()],
      common_mistakes: [
        'Mixing tabs and spaces (use spaces only)',
        'Inconsistent indentation (use 2 spaces)',
        'Missing colon after key names',
        'Using tabs instead of spaces',
      ],
    }),
  },
];

// ============================================================================
// Main Explainer
// ============================================================================

/**
 * Explain an error message and provide fix suggestions
 */
export function explainError(options: ExplainOptions): ErrorExplanation {
  const { error_message, context, error_type } = options;

  // Try to match against known patterns
  for (const pattern of ERROR_PATTERNS) {
    const match = error_message.match(pattern.pattern);
    if (match) {
      const explanation = pattern.explain(match, context);
      // Override type if explicitly provided
      if (error_type && error_type !== 'unknown') {
        explanation.error_type = error_type;
      }
      return explanation;
    }
  }

  // No pattern matched - return generic help
  return getGenericExplanation(error_message, context, error_type);
}

/**
 * Generic explanation when no specific pattern matches
 */
function getGenericExplanation(
  error_message: string,
  context?: string,
  error_type?: ErrorType
): ErrorExplanation {
  // Try to extract any component name mentioned
  const componentMatch = error_message.match(/["'](\w+)["']/);
  const possibleComponent = componentMatch?.[1];
  const suggestions = possibleComponent ? findSimilarComponents(possibleComponent) : [];

  return {
    error_type: error_type || 'unknown',
    explanation: `An error occurred: ${error_message}`,
    cause: 'The specific cause could not be determined automatically.',
    fix: {
      description: suggestions.length > 0
        ? `If "${possibleComponent}" is a component name, similar valid names are: ${suggestions.join(', ')}`
        : 'Review the error message and check the documentation',
      after: `# General troubleshooting steps:
# 1. Validate your YAML syntax
# 2. Check component names are spelled correctly
# 3. Verify all required fields are present
# 4. Check the Expanso documentation for examples`,
    },
    related_docs: [
      getGettingStartedUrl(),
      `${DOCS_BASE}/components`,
      getBloblangDocsUrl(),
    ],
    common_mistakes: [
      'Typos in component names',
      'Missing required configuration fields',
      'Incorrect YAML indentation',
      'Using wrong syntax for Bloblang expressions',
    ],
  };
}

/**
 * Check if an error message likely relates to Bloblang
 */
export function isBloblangError(error_message: string): boolean {
  const bloblangIndicators = [
    /bloblang/i,
    /mapping/i,
    /parse_json|format_json/i,
    /root\s*=/i,
    /this\./i,
    /\.map_each/i,
    /deleted\(\)/i,
  ];
  return bloblangIndicators.some((p) => p.test(error_message));
}

/**
 * Check if an error message likely relates to connection issues
 */
export function isConnectionError(error_message: string): boolean {
  const connectionIndicators = [
    /connection/i,
    /refused/i,
    /timeout/i,
    /unreachable/i,
    /network/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
  ];
  return connectionIndicators.some((p) => p.test(error_message));
}
