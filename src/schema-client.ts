/**
 * Schema Client
 *
 * Fetches and caches the pipeline schema from validate.expanso.io.
 * The schema is used by the LLM to generate valid pipeline YAML.
 */

// Cache keys and TTL
const SCHEMA_CACHE_KEY = 'expanso:schema:v1';
const COMPONENTS_CACHE_KEY = 'expanso:components:v1';
const CACHE_TTL_SECONDS = 3600; // 1 hour

/**
 * Component lists from /components endpoint
 */
export interface ComponentsList {
  inputs: string[];
  outputs: string[];
  processors: string[];
  caches: string[];
  rate_limits: string[];
}

/**
 * Field schema from /schema endpoint
 */
export interface FieldSchema {
  type?: string;
  description?: string;
  is_optional?: boolean;
  is_advanced?: boolean;
  is_deprecated?: boolean;
  is_secret?: boolean;
  default?: unknown;
  items?: FieldSchema;
  properties?: Record<string, FieldSchema>;
  additionalProperties?: boolean | FieldSchema;
  $ref?: string;
}

/**
 * Component definition from /schema endpoint
 */
export interface ComponentDefinition {
  properties?: Record<string, FieldSchema>;
  additionalProperties?: boolean | FieldSchema;
  type?: string;
  description?: string;
}

/**
 * Full schema from /schema endpoint
 */
export interface PipelineSchema {
  definitions: Record<string, ComponentDefinition>;
  properties?: Record<string, FieldSchema>;
  type?: string;
}

/**
 * KV namespace interface for caching
 */
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/**
 * Fetch the component list from validate.expanso.io/components
 * Returns cached version if available, fetches fresh if not.
 */
export async function fetchComponents(cache?: KVNamespace): Promise<ComponentsList> {
  // Try cache first
  if (cache) {
    try {
      const cached = await cache.get(COMPONENTS_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as ComponentsList;
      }
    } catch (error) {
      console.error('Cache read error for components:', error);
    }
  }

  // Fetch fresh
  const response = await fetch('https://validate.expanso.io/components');
  if (!response.ok) {
    throw new Error(`Failed to fetch components: ${response.status} ${response.statusText}`);
  }

  const components: ComponentsList = await response.json();

  // Cache the result
  if (cache) {
    try {
      await cache.put(COMPONENTS_CACHE_KEY, JSON.stringify(components), {
        expirationTtl: CACHE_TTL_SECONDS,
      });
    } catch (error) {
      console.error('Cache write error for components:', error);
    }
  }

  return components;
}

/**
 * Fetch the full schema from validate.expanso.io/schema
 * Returns cached version if available, fetches fresh if not.
 *
 * Note: The full schema is ~350KB. Use extractRelevantSchema() to get
 * a smaller subset for LLM context.
 */
export async function fetchSchema(cache?: KVNamespace): Promise<PipelineSchema> {
  // Try cache first
  if (cache) {
    try {
      const cached = await cache.get(SCHEMA_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as PipelineSchema;
      }
    } catch (error) {
      console.error('Cache read error for schema:', error);
    }
  }

  // Fetch fresh
  const response = await fetch('https://validate.expanso.io/schema');
  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
  }

  const schema: PipelineSchema = await response.json();

  // Cache the result
  if (cache) {
    try {
      await cache.put(SCHEMA_CACHE_KEY, JSON.stringify(schema), {
        expirationTtl: CACHE_TTL_SECONDS,
      });
    } catch (error) {
      console.error('Cache write error for schema:', error);
    }
  }

  return schema;
}

/**
 * Extract component names from user query for schema filtering.
 * Returns component names that might be relevant to the query.
 */
export function extractRelevantComponentNames(
  query: string,
  components: ComponentsList
): string[] {
  const queryLower = query.toLowerCase();
  const relevantNames: string[] = [];

  // Check all component types
  const allComponents = [
    ...components.inputs,
    ...components.outputs,
    ...components.processors,
    ...components.caches,
    ...components.rate_limits,
  ];

  for (const name of allComponents) {
    // Direct match
    if (queryLower.includes(name.toLowerCase())) {
      relevantNames.push(name);
      continue;
    }

    // Partial match (e.g., "kafka" matches "kafka_franz")
    const nameParts = name.split('_');
    for (const part of nameParts) {
      if (part.length > 2 && queryLower.includes(part.toLowerCase())) {
        relevantNames.push(name);
        break;
      }
    }
  }

  // Always include common components that might be needed
  const commonComponents = ['mapping', 'log', 'generate', 'stdout'];
  for (const common of commonComponents) {
    if (!relevantNames.includes(common) && allComponents.includes(common)) {
      relevantNames.push(common);
    }
  }

  return [...new Set(relevantNames)];
}

/**
 * Extract a subset of the schema relevant to specific components.
 * This reduces the schema size for LLM context.
 */
export function extractRelevantSchema(
  schema: PipelineSchema,
  componentNames: string[]
): Record<string, ComponentDefinition> {
  const relevantSchema: Record<string, ComponentDefinition> = {};

  for (const name of componentNames) {
    // Check for direct definition
    if (schema.definitions[name]) {
      relevantSchema[name] = schema.definitions[name];
    }

    // Check for input/output/processor prefixed definitions
    for (const prefix of ['input_', 'output_', 'processor_']) {
      const prefixedName = `${prefix}${name}`;
      if (schema.definitions[prefixedName]) {
        relevantSchema[prefixedName] = schema.definitions[prefixedName];
      }
    }
  }

  // Always include top-level pipeline structure definitions
  const structuralDefs = ['input', 'output', 'processor', 'pipeline', 'buffer', 'cache'];
  for (const def of structuralDefs) {
    if (schema.definitions[def] && !relevantSchema[def]) {
      relevantSchema[def] = schema.definitions[def];
    }
  }

  return relevantSchema;
}

/**
 * Format schema for LLM context.
 * Creates a compact representation of component schemas.
 */
export function formatSchemaForLLM(
  relevantSchema: Record<string, ComponentDefinition>,
  components: ComponentsList
): string {
  const lines: string[] = [];

  lines.push('# Available Pipeline Components\n');

  lines.push('## Inputs');
  lines.push(components.inputs.join(', '));
  lines.push('');

  lines.push('## Outputs');
  lines.push(components.outputs.join(', '));
  lines.push('');

  lines.push('## Processors');
  lines.push(components.processors.join(', '));
  lines.push('');

  lines.push('## Caches');
  lines.push(components.caches.join(', '));
  lines.push('');

  lines.push('# Component Schemas\n');

  for (const [name, definition] of Object.entries(relevantSchema)) {
    // Skip structural definitions - focus on actual component configs
    if (['input', 'output', 'processor', 'pipeline', 'buffer', 'cache'].includes(name)) {
      continue;
    }

    lines.push(`## ${name}`);

    if (definition.properties) {
      for (const [propName, propSchema] of Object.entries(definition.properties)) {
        const required = !propSchema.is_optional ? '*' : '';
        const type = propSchema.type || 'unknown';
        const desc = propSchema.description ? ` - ${propSchema.description}` : '';
        lines.push(`  ${propName}${required}: ${type}${desc}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get schema context for LLM pipeline generation.
 * Fetches components and schema, extracts relevant parts, and formats for LLM.
 */
export async function getSchemaContext(
  query: string,
  cache?: KVNamespace
): Promise<{ context: string; components: ComponentsList }> {
  const [components, schema] = await Promise.all([
    fetchComponents(cache),
    fetchSchema(cache),
  ]);

  const relevantNames = extractRelevantComponentNames(query, components);
  const relevantSchema = extractRelevantSchema(schema, relevantNames);
  const context = formatSchemaForLLM(relevantSchema, components);

  return { context, components };
}
