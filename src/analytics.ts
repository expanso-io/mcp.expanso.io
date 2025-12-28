/**
 * PostHog Analytics for Cloudflare Workers
 *
 * Uses the PostHog API directly since posthog-node may not work in Workers runtime.
 */

const POSTHOG_HOST = 'https://us.i.posthog.com';

interface AnalyticsEvent {
  event: string;
  distinctId: string;
  properties?: Record<string, unknown>;
}

/**
 * Track an event to PostHog
 */
export async function trackEvent(
  apiKey: string,
  event: AnalyticsEvent
): Promise<void> {
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        event: event.event,
        distinct_id: event.distinctId,
        properties: {
          ...event.properties,
          $lib: 'expanso-mcp-server',
          $lib_version: '1.0.0',
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Don't let analytics errors affect the main flow
    console.error('PostHog tracking error:', error);
  }
}

/**
 * Track a page view
 */
export async function trackPageView(
  apiKey: string,
  distinctId: string,
  path: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await trackEvent(apiKey, {
    event: '$pageview',
    distinctId,
    properties: {
      $current_url: path,
      ...properties,
    },
  });
}

/**
 * Track MCP chat message
 */
export async function trackChat(
  apiKey: string,
  distinctId: string,
  message: string,
  responseLength: number,
  sourcesCount: number
): Promise<void> {
  await trackEvent(apiKey, {
    event: 'mcp_chat',
    distinctId,
    properties: {
      message_length: message.length,
      response_length: responseLength,
      sources_count: sourcesCount,
    },
  });
}

/**
 * Track MCP search
 */
export async function trackSearch(
  apiKey: string,
  distinctId: string,
  query: string,
  resultsCount: number,
  domain?: string
): Promise<void> {
  await trackEvent(apiKey, {
    event: 'mcp_search',
    distinctId,
    properties: {
      query,
      query_length: query.length,
      results_count: resultsCount,
      domain_filter: domain || 'all',
    },
  });
}

/**
 * Track MCP tool call
 */
export async function trackToolCall(
  apiKey: string,
  distinctId: string,
  toolName: string,
  success: boolean
): Promise<void> {
  await trackEvent(apiKey, {
    event: 'mcp_tool_call',
    distinctId,
    properties: {
      tool_name: toolName,
      success,
    },
  });
}

/**
 * Track resource read
 */
export async function trackResourceRead(
  apiKey: string,
  distinctId: string,
  uri: string,
  found: boolean
): Promise<void> {
  await trackEvent(apiKey, {
    event: 'mcp_resource_read',
    distinctId,
    properties: {
      resource_uri: uri,
      resource_domain: new URL(uri).hostname,
      found,
    },
  });
}

/**
 * Track YAML generated in chat responses (automatic, no user action needed)
 */
export async function trackYamlGenerated(
  apiKey: string,
  distinctId: string,
  yaml: string,
  userMessage: string,
  validationResult: { valid: boolean; errors: string[]; warnings: string[] },
  yamlId: string
): Promise<void> {
  await trackEvent(apiKey, {
    event: 'yaml_generated',
    distinctId,
    properties: {
      yaml_id: yamlId,
      yaml_preview: yaml.slice(0, 500), // Short preview for PostHog
      yaml_length: yaml.length,
      user_message: userMessage.slice(0, 500),
      validator_valid: validationResult.valid,
      validator_errors: validationResult.errors,
      validator_error_count: validationResult.errors.length,
      validator_warnings: validationResult.warnings,
    },
  });
}

/**
 * Track YAML feedback from users
 */
export async function trackYamlFeedback(
  apiKey: string,
  distinctId: string,
  yaml: string,
  isValid: boolean,
  userMessage: string,
  validationResult?: { errors: string[]; warnings: string[] }
): Promise<void> {
  await trackEvent(apiKey, {
    event: 'yaml_feedback',
    distinctId,
    properties: {
      yaml_content: yaml.slice(0, 2000), // Truncate for storage
      yaml_length: yaml.length,
      user_reported_valid: isValid,
      user_message: userMessage.slice(0, 500),
      validator_errors: validationResult?.errors || [],
      validator_warnings: validationResult?.warnings || [],
      validator_error_count: validationResult?.errors?.length || 0,
    },
  });
}

/**
 * Generate a distinct ID from request headers
 */
export function getDistinctId(request: Request): string {
  // Use CF-Connecting-IP or fall back to a hash of user-agent
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) {
    // Hash the IP for privacy
    return `cf_${hashString(ip)}`;
  }

  const ua = request.headers.get('User-Agent') || 'unknown';
  return `ua_${hashString(ua)}`;
}

/**
 * Simple string hash for anonymization
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
