/**
 * Response Cleaner
 *
 * Ensures responses don't leak internal implementation details to users.
 * Users should never see retry attempts, error categories, or fix explanations.
 */

/**
 * Internal phrases that indicate LLM is explaining its fix attempts.
 * These should never appear in user-facing responses.
 */
export const INTERNAL_PHRASES = [
  'I made the following changes',
  'I\'ve removed',
  'I have removed',
  'I\'ve simplified',
  'I have simplified',
  'I simplified',
  'I\'ve updated',
  'I have updated',
  'I\'ve fixed',
  'I have fixed',
  'I\'ve changed',
  'I have changed',
  'I\'ve replaced',
  'I have replaced',
  'I\'ve modified',
  'I have modified',
  'should now be valid',
  'is now valid',
  'This pipeline is now',
  'This YAML is now',
  'This configuration is now',
  'now be valid',
  'now works',
];

/**
 * Internal error category names from the validation API.
 * These are implementation details users should never see.
 */
export const INTERNAL_ERROR_CATEGORIES = [
  'IMAGINED_COMPONENT',
  'IMAGINED_FIELD',
  'IMAGINED_STRUCTURE',
  'IMAGINED_SYNTAX',
  'WRONG_TYPE',
  'DUPLICATE_LABEL',
  'UNDEFINED_RESOURCE',
];

/**
 * Clean response text by removing internal implementation details.
 *
 * This removes:
 * - Phrases explaining what changes were made ("I removed X", "I fixed Y")
 * - Bullet lists of fixes
 * - "This should now be valid" type statements
 * - LLM-generated "Components used" sections
 *
 * It preserves:
 * - YAML code blocks
 * - Normal explanatory text about what the pipeline does
 * - Technical documentation
 */
export function cleanResponseText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove "I made the following changes:" type paragraphs
  // Match "I" followed by have/'ve + past tense verb + explanation until period or newline
  cleaned = cleaned.replace(
    /\n*(?:I(?:'ve| have)? (?:made|removed|simplified|updated|fixed|changed|replaced|modified)[^`]*?(?:should now be|is now|now (?:be|is)|now works)[^`]*?\.)/gi,
    ''
  );

  // Remove standalone "I've/I have [action]" sentences (more aggressive)
  cleaned = cleaned.replace(
    /\n*(?:I(?:'ve| have)? (?:removed|simplified|updated|fixed|changed|replaced|modified|corrected|made)[^`\n]*?\.)/gi,
    ''
  );

  // Remove "I made the following changes:" type sections with bullet lists
  cleaned = cleaned.replace(
    /\n*I (?:made|have made|'ve made) the following[^`]*?(?=\n\n|```|$)/gi,
    ''
  );

  // Remove bullet lists explaining internal fixes (starts with - or * or •)
  // Only match bullets that start with fix-related verbs
  cleaned = cleaned.replace(
    /\n*(?:[-•*]\s*(?:Removed|Simplified|Updated|Fixed|Changed|Replaced|Modified|Corrected)[^`\n]*\n?)+/gi,
    ''
  );

  // Remove "This should now be valid" type sentences
  cleaned = cleaned.replace(
    /\n*(?:This (?:pipeline|YAML|configuration) (?:should now be|is now|now (?:be|is))[^`]*?\.)/gi,
    ''
  );

  // Remove "should now be valid" at end of sentences
  cleaned = cleaned.replace(
    /[^`]*?(?:should now be valid|is now valid|now works)[^`]*?\./gi,
    ''
  );

  // Remove LLM-generated "Components used:" section (we add our own validated one)
  cleaned = cleaned.replace(
    /\n*\*?\*?Components used:?\*?\*?:?\n(?:[-•*]\s*(?:Input|Output|Processor|Cache|Rate Limit|Buffer|Metric):[^\n]+\n?)*/gi,
    ''
  );

  // Remove internal error category mentions
  for (const category of INTERNAL_ERROR_CATEGORIES) {
    // Match the category name when it appears outside of code blocks
    cleaned = cleaned.replace(new RegExp(`(?<![\`])[^a-zA-Z]?${category}[^a-zA-Z]?(?![\`])`, 'g'), ' ');
  }

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Check if text contains internal leakage.
 * Useful for validation and testing.
 */
export function hasInternalLeakage(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Check for internal phrases
  for (const phrase of INTERNAL_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      return true;
    }
  }

  // Check for internal error categories
  for (const category of INTERNAL_ERROR_CATEGORIES) {
    if (text.includes(category)) {
      return true;
    }
  }

  return false;
}

/**
 * Remove invalid YAML blocks from response when validation failed.
 * Better to show no YAML than broken YAML.
 */
export function removeInvalidYaml(text: string, invalidYaml: string): string {
  if (!invalidYaml) return text;

  // Escape special regex characters in the YAML
  const escapedYaml = invalidYaml.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Remove the code block containing the invalid YAML
  const pattern = new RegExp('```(?:yaml|yml)?\\n' + escapedYaml + '\\n?```', 'g');
  return text.replace(pattern, '').trim();
}
