import type { OpenRouterModel } from './models';

/** "$1.25" / "$0.0004" / "$0" — USD per 1M tokens. */
export function formatPerM(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value === 0) return '$0';
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

/** "200k" / "1M" / "1.5M" context window. */
export function formatContext(tokens: number | null | undefined): string {
  if (!tokens) return '—';
  if (tokens >= 1_000_000) {
    const m = (tokens / 1_000_000).toFixed(1);
    return `${m.endsWith('.0') ? m.slice(0, -2) : m}M`;
  }
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}k`;
  return String(tokens);
}

export const DEFAULT_VENDOR_LABELS: Record<string, string> = {
  openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', 'meta-llama': 'Meta', mistralai: 'Mistral',
  perplexity: 'Perplexity', 'x-ai': 'xAI', deepseek: 'DeepSeek', qwen: 'Qwen', cohere: 'Cohere',
  amazon: 'Amazon', microsoft: 'Microsoft', nvidia: 'NVIDIA', moonshotai: 'Moonshot', 'z-ai': 'Z.ai',
  openrouter: 'OpenRouter',
};

export function vendorLabel(vendor: string, overrides?: Record<string, string>): string {
  return overrides?.[vendor] ?? DEFAULT_VENDOR_LABELS[vendor]
    ?? vendor.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Blended USD per 1M tokens at a typical 3:1 input:output ratio — used by the
 * "cheapest" sort. A per-request fee is counted as ~1000 requests per 1M tokens.
 */
export function blendedPricePerM(m: OpenRouterModel): number {
  return m.pricing.promptPerM * 0.75 + m.pricing.completionPerM * 0.25 + m.pricing.perRequest * 1000;
}
