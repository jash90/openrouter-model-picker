/**
 * Normalization of the OpenRouter `GET /api/v1/models` response.
 *
 * Pure TypeScript, no React — safe to reuse on a server. OpenRouter reports
 * prices as STRINGS per single token (e.g. "0.000008"); here they become
 * numbers per 1,000,000 tokens, which is how price lists are usually read.
 */

export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

export interface ModelPricing {
  /** USD per 1M input (prompt) tokens. */
  promptPerM: number;
  /** USD per 1M output (completion) tokens. */
  completionPerM: number;
  /** USD per 1M reasoning tokens, when the provider bills them separately. */
  reasoningPerM: number | null;
  /** Flat USD fee per request (some providers charge it on top of tokens). */
  perRequest: number;
  /** USD per web search performed by a model with built-in search. */
  perWebSearch: number;
  /** USD per 1M tokens read from prompt cache. */
  cacheReadPerM: number | null;
  /** USD per input image. */
  perImage: number;
  /** True when prompt, completion and per-request prices are all zero. */
  isFree: boolean;
}

export interface OpenRouterModel {
  /** OpenRouter slug, e.g. "openai/gpt-5". */
  id: string;
  /** Display name, e.g. "OpenAI: GPT-5". */
  name: string;
  description: string;
  /** Vendor taken from the id prefix ("openai/gpt-5" → "openai"). */
  vendor: string;
  /** Unix timestamp (seconds) when the model was added. */
  created: number;
  contextLength: number | null;
  maxCompletionTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  /** OpenAI-compatible parameters the model accepts (union over providers). */
  supportedParameters: string[];
  /** The model searches the web on its own (Perplexity) — no plugin needed. */
  builtInWebSearch: boolean;
  /** Accepts `response_format` / `structured_outputs`. */
  supportsJsonMode: boolean;
  supportsReasoning: boolean;
  pricing: ModelPricing;
}

const PER_M = 1_000_000;

function perToken(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value));
  return Number.isFinite(n) ? n : null;
}

function perMillion(value: unknown): number | null {
  const n = perToken(value);
  return n == null ? null : n * PER_M;
}

/** Raw `pricing` object of one model → per-1M prices. */
export function normalizePricing(raw: unknown): ModelPricing {
  const r = (raw ?? {}) as Record<string, unknown>;
  const promptPerM = perMillion(r.prompt) ?? 0;
  const completionPerM = perMillion(r.completion) ?? 0;
  const perRequest = perToken(r.request) ?? 0;
  return {
    promptPerM,
    completionPerM,
    reasoningPerM: perMillion(r.internal_reasoning),
    perRequest,
    perWebSearch: perToken(r.web_search) ?? 0,
    cacheReadPerM: perMillion(r.input_cache_read),
    perImage: perToken(r.image) ?? 0,
    isFree: promptPerM === 0 && completionPerM === 0 && perRequest === 0,
  };
}

/**
 * One raw entry from `data[]` → `OpenRouterModel`.
 * Returns null for entries that cannot produce text (image-only models).
 */
export function normalizeModel(raw: unknown): OpenRouterModel | null {
  const r = raw as Record<string, any> | null;
  if (!r || typeof r.id !== 'string') return null;

  const outputModalities: string[] = Array.isArray(r.architecture?.output_modalities)
    ? r.architecture.output_modalities
    : ['text'];
  if (!outputModalities.includes('text')) return null;

  const supportedParameters: string[] = Array.isArray(r.supported_parameters) ? r.supported_parameters : [];
  const slash = r.id.indexOf('/');
  const vendor = slash > 0 ? r.id.slice(0, slash) : 'other';

  return {
    id: r.id,
    name: typeof r.name === 'string' && r.name ? r.name : r.id,
    description: typeof r.description === 'string' ? r.description : '',
    vendor,
    created: typeof r.created === 'number' ? r.created : 0,
    contextLength: typeof r.context_length === 'number' ? r.context_length : (r.top_provider?.context_length ?? null),
    maxCompletionTokens: typeof r.top_provider?.max_completion_tokens === 'number' ? r.top_provider.max_completion_tokens : null,
    inputModalities: Array.isArray(r.architecture?.input_modalities) ? r.architecture.input_modalities : ['text'],
    outputModalities,
    supportedParameters,
    // Only Perplexity always searches without extra parameters; everything else needs the OpenRouter web plugin.
    builtInWebSearch: vendor === 'perplexity',
    supportsJsonMode: supportedParameters.includes('response_format') || supportedParameters.includes('structured_outputs'),
    supportsReasoning: supportedParameters.includes('reasoning') || supportedParameters.includes('include_reasoning'),
    pricing: normalizePricing(r.pricing),
  };
}

/** Whole `/models` response body → normalized list (text-capable models only). */
export function normalizeModelsResponse(body: unknown): OpenRouterModel[] {
  const data = (body as { data?: unknown[] } | null)?.data;
  if (!Array.isArray(data)) return [];
  return data.map(normalizeModel).filter((m): m is OpenRouterModel => !!m);
}

export interface FetchModelsOptions {
  /** Optional. Without a key the public list is returned; with one, only models the key can call. */
  apiKey?: string;
  url?: string;
  signal?: AbortSignal;
  /** Extra headers, e.g. `HTTP-Referer` / `X-Title` for OpenRouter app attribution. */
  headers?: Record<string, string>;
}

/** Fetch and normalize the OpenRouter model list. Works in browsers and Node 18+. */
export async function fetchOpenRouterModels(options: FetchModelsOptions = {}): Promise<OpenRouterModel[]> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(options.headers ?? {}) };
  if (options.apiKey) headers.Authorization = `Bearer ${options.apiKey}`;
  const res = await fetch(options.url ?? OPENROUTER_MODELS_URL, { headers, signal: options.signal });
  if (!res.ok) throw new Error(`OpenRouter /models returned ${res.status}`);
  return normalizeModelsResponse(await res.json());
}
