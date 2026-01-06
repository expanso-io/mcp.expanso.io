/**
 * Extract examples from examples-registry.ts to individual YAML files
 */
import { PIPELINE_EXAMPLES } from '../src/examples-registry';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');

// Ensure directory exists
fs.mkdirSync(EXAMPLES_DIR, { recursive: true });

for (const example of PIPELINE_EXAMPLES) {
  // Create frontmatter + yaml content
  const frontmatter = {
    id: example.id,
    name: example.name,
    description: example.description,
    keywords: example.keywords,
    components: example.components,
    bloblangPatterns: example.bloblangPatterns || [],
  };

  const content = `---
${yaml.stringify(frontmatter).trim()}
---
${example.yaml}
`;

  const filename = `${example.id}.yaml`;
  fs.writeFileSync(path.join(EXAMPLES_DIR, filename), content);
  console.log(`Wrote ${filename}`);
}

console.log(`\nExtracted ${PIPELINE_EXAMPLES.length} examples to ${EXAMPLES_DIR}/`);
