/**
 * Schema-Driven Pipeline Generator
 *
 * Uses the pipeline schema from validate.expanso.io to generate YAML pipelines.
 * The LLM receives the actual schema and generates valid configurations directly.
 */

import { getSchemaContext, type ComponentsList } from './schema-client';

/**
 * Environment bindings needed for generation
 */
export interface GeneratorEnv {
  AI: {
    run: (model: string, options: { messages: Array<{ role: string; content: string }>; max_tokens?: number }) => Promise<{ response: string }>;
  };
  CONTENT_CACHE?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
}

/**
 * Result of pipeline generation
 */
export interface GenerationResult {
  yaml: string;
  explanation: string;
  components_used: string[];
  generation_method: 'schema' | 'fallback';
}

/**
 * Build the system prompt for pipeline generation
 */
function buildSystemPrompt(schemaContext: string): string {
  return `You are an expert at creating Bacalhau/Benthos data pipeline configurations.

You have access to the following schema of available components:

${schemaContext}

IMPORTANT RULES:
1. Generate ONLY valid YAML that conforms to the schema above
2. Use ONLY components listed in the schema - do not invent components
3. Every pipeline needs at minimum: input, pipeline.processors, and output sections
4. Use 'generate' input for testing/demo pipelines
5. Use 'stdout' output for simple testing
6. The 'mapping' processor is used for data transformation with Bloblang expressions
7. Always use the exact field names from the schema (e.g., 'addresses' not 'address', 'topics' not 'topic')

OUTPUT FORMAT:
1. First, output a brief explanation (1-2 sentences) of what the pipeline does
2. Then output the YAML in a code block
3. No additional commentary after the YAML`;
}

/**
 * Build the user prompt for a specific query
 */
function buildUserPrompt(query: string): string {
  return `Generate a pipeline configuration for the following request:

"${query}"

Remember:
- Use ONLY components from the schema I provided
- Include all required fields for each component
- Use realistic example values (addresses, topics, etc.)
- Output explanation first, then YAML in a code block`;
}

/**
 * Extract YAML from LLM response
 */
function extractYamlFromResponse(response: string): string | null {
  // Try to find YAML code block
  const yamlMatch = response.match(/```(?:yaml|yml)?\n([\s\S]*?)```/);
  if (yamlMatch) {
    return yamlMatch[1].trim();
  }

  // If no code block, try to find YAML-like content (starts with input: or pipeline:)
  const yamlLikeMatch = response.match(/(input:\s*[\s\S]*)/);
  if (yamlLikeMatch) {
    return yamlLikeMatch[1].trim();
  }

  return null;
}

/**
 * Extract explanation from LLM response (text before the YAML block)
 */
function extractExplanationFromResponse(response: string): string {
  const codeBlockIndex = response.indexOf('```');
  if (codeBlockIndex > 0) {
    return response.slice(0, codeBlockIndex).trim();
  }
  return '';
}

/**
 * Extract component names used in the YAML
 */
function extractComponentsFromYaml(yaml: string, components: ComponentsList): string[] {
  const used: string[] = [];
  const allComponents = [
    ...components.inputs,
    ...components.outputs,
    ...components.processors,
    ...components.caches,
    ...components.rate_limits,
  ];

  for (const component of allComponents) {
    // Check if component appears as a key in the YAML
    // Handles both top-level keys and list items (e.g., "- mapping:")
    const pattern = new RegExp(`(?:^|\\s|-)\\s*${component}:`, 'm');
    if (pattern.test(yaml)) {
      used.push(component);
    }
  }

  return [...new Set(used)];
}

/**
 * Generate a pipeline from a natural language query using the schema.
 *
 * This is the core generation function that:
 * 1. Fetches the relevant schema context for the query
 * 2. Builds a prompt with the schema
 * 3. Calls the LLM to generate YAML
 * 4. Extracts and returns the YAML
 */
export async function generatePipelineFromSchema(
  query: string,
  env: GeneratorEnv
): Promise<GenerationResult | null> {
  try {
    // Get schema context for this query
    const { context: schemaContext, components } = await getSchemaContext(
      query,
      env.CONTENT_CACHE
    );

    // Build prompts
    const systemPrompt = buildSystemPrompt(schemaContext);
    const userPrompt = buildUserPrompt(query);

    // Call LLM
    const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1024,
    });

    const responseText = response.response;

    // Extract YAML and explanation
    const yaml = extractYamlFromResponse(responseText);
    if (!yaml) {
      console.error('Failed to extract YAML from response:', responseText.slice(0, 200));
      return null;
    }

    const explanation = extractExplanationFromResponse(responseText);
    const componentsUsed = extractComponentsFromYaml(yaml, components);

    return {
      yaml,
      explanation,
      components_used: componentsUsed,
      generation_method: 'schema',
    };
  } catch (error) {
    console.error('Schema-based generation error:', error);
    return null;
  }
}

/**
 * Build an error correction prompt
 */
function buildCorrectionPrompt(
  yaml: string,
  errors: string,
  originalQuery: string
): string {
  return `The following pipeline YAML has validation errors. Fix ONLY the errors listed.

ORIGINAL REQUEST: "${originalQuery}"

INVALID YAML:
\`\`\`yaml
${yaml}
\`\`\`

VALIDATION ERRORS:
${errors}

COMMON FIXES:
- "null:" input → use "generate:" instead
- Unknown component → check available components and use the closest match
- Wrong field name → use the exact field name from the schema
- Missing required field → add the required field with a sensible default

Return ONLY the corrected YAML in a code block, no explanation needed:`;
}

/**
 * Ask LLM to correct invalid YAML based on validation errors
 */
export async function correctYamlWithSchema(
  yaml: string,
  errors: string,
  originalQuery: string,
  env: GeneratorEnv
): Promise<string | null> {
  try {
    const correctionPrompt = buildCorrectionPrompt(yaml, errors, originalQuery);

    const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'user', content: correctionPrompt },
      ],
      max_tokens: 768,
    });

    return extractYamlFromResponse(response.response);
  } catch (error) {
    console.error('Schema correction error:', error);
    return null;
  }
}

/**
 * Hallucination error from validation API
 */
export interface Hallucination {
  category: string;
  severity: string;
  path: string;
  hallucination: string;
  message: string;
  correction?: string;
  line?: number;
}

/**
 * Validation result from validate.expanso.io
 */
export interface ValidationResult {
  valid: boolean;
  error_count: number;
  hallucinations: Hallucination[];
  formatted_yaml?: string;
  corrected_yaml?: string;
}

/**
 * Validate YAML against the validation API
 */
export async function validateYaml(
  yaml: string,
  options: { autoCorrect?: boolean } = {}
): Promise<ValidationResult> {
  try {
    const params = new URLSearchParams();
    if (options.autoCorrect) params.set('auto_correct', 'true');
    const queryString = params.toString();
    const url = `https://validate.expanso.io/validate${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: yaml,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        valid: false,
        error_count: 1,
        hallucinations: [{
          category: 'UNKNOWN',
          severity: 'ERROR',
          path: 'root',
          hallucination: 'request_failed',
          message: errorText || `Validation failed with status ${response.status}`,
        }],
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Validation API error:', error);
    // Fail open on network issues - don't block user
    return { valid: true, error_count: 0, hallucinations: [] };
  }
}

/**
 * Format hallucinations into error strings for LLM correction
 */
function formatHallucinationsForCorrection(hallucinations: Hallucination[]): string {
  return hallucinations
    .filter(h => h.severity === 'ERROR')
    .map(h => {
      const correction = h.correction ? ` → Use: ${h.correction}` : '';
      return `- ${h.path}: ${h.message}${correction}`;
    })
    .join('\n');
}

/**
 * Result of validated pipeline generation
 */
export interface ValidatedGenerationResult extends GenerationResult {
  valid: boolean;
  validation_attempts: number;
  hallucinations: Hallucination[];
}

/**
 * Fallback function type for example-based generation
 */
export type FallbackGenerator = (query: string) => GenerationResult | null;

/**
 * Generate a valid pipeline with validation loop.
 *
 * This is the main orchestration function that:
 * 1. Generates YAML from schema using LLM
 * 2. Validates against validate.expanso.io
 * 3. If invalid, asks LLM to correct based on errors
 * 4. Retries up to maxRetries times
 * 5. Falls back to example-based generation if all retries fail
 */
export async function generateValidPipeline(
  query: string,
  env: GeneratorEnv,
  options: {
    maxRetries?: number;
    fallback?: FallbackGenerator;
  } = {}
): Promise<ValidatedGenerationResult | null> {
  const maxRetries = options.maxRetries ?? 3;

  // Step 1: Generate initial YAML from schema
  const initialResult = await generatePipelineFromSchema(query, env);
  if (!initialResult) {
    // Schema generation failed, try fallback
    if (options.fallback) {
      const fallbackResult = options.fallback(query);
      if (fallbackResult) {
        return {
          ...fallbackResult,
          valid: false, // Assume fallback needs validation too
          validation_attempts: 0,
          hallucinations: [],
          generation_method: 'fallback',
        };
      }
    }
    return null;
  }

  let currentYaml = initialResult.yaml;
  let attempts = 0;

  // Step 2: Validation loop
  while (attempts < maxRetries) {
    attempts++;

    // Validate current YAML
    const validationResult = await validateYaml(currentYaml, { autoCorrect: true });

    // If valid, we're done!
    if (validationResult.valid) {
      // Use formatted YAML if available (properly indented)
      const finalYaml = validationResult.formatted_yaml || currentYaml;
      return {
        yaml: finalYaml,
        explanation: initialResult.explanation,
        components_used: initialResult.components_used,
        generation_method: 'schema',
        valid: true,
        validation_attempts: attempts,
        hallucinations: [],
      };
    }

    // If validation API provided a correction, try that first
    if (validationResult.corrected_yaml) {
      const correctionValidation = await validateYaml(validationResult.corrected_yaml);
      if (correctionValidation.valid) {
        return {
          yaml: correctionValidation.formatted_yaml || validationResult.corrected_yaml,
          explanation: initialResult.explanation,
          components_used: initialResult.components_used,
          generation_method: 'schema',
          valid: true,
          validation_attempts: attempts,
          hallucinations: [],
        };
      }
      // API correction didn't work, fall through to LLM correction
    }

    // Format errors for LLM
    const errorText = formatHallucinationsForCorrection(validationResult.hallucinations);
    if (!errorText) {
      // No actionable errors, can't fix
      break;
    }

    // Ask LLM to correct
    const correctedYaml = await correctYamlWithSchema(currentYaml, errorText, query, env);
    if (!correctedYaml) {
      // LLM couldn't correct, try fallback
      break;
    }

    currentYaml = correctedYaml;
  }

  // Step 3: Max retries reached or correction failed, try fallback
  if (options.fallback) {
    const fallbackResult = options.fallback(query);
    if (fallbackResult) {
      // Validate the fallback result too
      const fallbackValidation = await validateYaml(fallbackResult.yaml, { autoCorrect: true });
      return {
        ...fallbackResult,
        yaml: fallbackValidation.formatted_yaml || fallbackResult.yaml,
        valid: fallbackValidation.valid,
        validation_attempts: attempts,
        hallucinations: fallbackValidation.hallucinations,
        generation_method: 'fallback',
      };
    }
  }

  // No fallback or fallback also failed - return best attempt
  const finalValidation = await validateYaml(currentYaml);
  return {
    yaml: currentYaml,
    explanation: initialResult.explanation,
    components_used: initialResult.components_used,
    generation_method: 'schema',
    valid: finalValidation.valid,
    validation_attempts: attempts,
    hallucinations: finalValidation.hallucinations,
  };
}
