/**
 * Examples Loader
 *
 * Loads pipeline examples from individual YAML files in the examples/ directory.
 * Each file has YAML frontmatter with metadata, followed by the pipeline YAML.
 */

import * as yaml from 'yaml';
import type { PipelineExample } from './examples-registry';

// At build time, we'll inline all examples. For now, this provides the interface.
// The actual loading happens via a build script that generates examples-data.ts

export interface ExampleFile {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  components: {
    inputs: string[];
    processors: string[];
    outputs: string[];
  };
  bloblangPatterns: string[];
  yaml: string;
}

interface FrontmatterData {
  id: string;
  name: string;
  description: string;
  keywords?: string[];
  components?: {
    inputs?: string[];
    processors?: string[];
    outputs?: string[];
  };
  bloblangPatterns?: string[];
}

/**
 * Parse a YAML file with frontmatter into an ExampleFile
 */
export function parseExampleFile(content: string): ExampleFile | null {
  // Split frontmatter from body
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    return null;
  }

  const [, frontmatterYaml, bodyYaml] = frontmatterMatch;

  try {
    // Parse frontmatter using proper YAML parser
    const metadata = yaml.parse(frontmatterYaml) as FrontmatterData;

    return {
      id: metadata.id,
      name: metadata.name,
      description: metadata.description,
      keywords: metadata.keywords || [],
      components: {
        inputs: metadata.components?.inputs || [],
        processors: metadata.components?.processors || [],
        outputs: metadata.components?.outputs || [],
      },
      bloblangPatterns: metadata.bloblangPatterns || [],
      yaml: bodyYaml.trim(),
    };
  } catch {
    return null;
  }
}

/**
 * Convert ExampleFile to PipelineExample
 */
export function toExample(file: ExampleFile): PipelineExample {
  return {
    id: file.id,
    name: file.name,
    description: file.description,
    keywords: file.keywords,
    components: file.components,
    yaml: file.yaml,
    bloblangPatterns: file.bloblangPatterns,
  };
}
