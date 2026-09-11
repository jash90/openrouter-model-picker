import { describe, expect, it } from 'vitest';
import { normalizeModel, normalizeModelsResponse, normalizePricing } from './models';
import { blendedPricePerM, formatContext, formatPerM, vendorLabel } from './format';

describe('normalizePricing', () => {
  it('converts per-token strings to USD per 1M tokens', () => {
    const p = normalizePricing({ prompt: '0.000003', completion: '0.000015', request: '0.005', web_search: '0.01', input_cache_read: '0.0000003' });
    expect(p.promptPerM).toBeCloseTo(3);
    expect(p.completionPerM).toBeCloseTo(15);
    expect(p.perRequest).toBe(0.005);
    expect(p.perWebSearch).toBe(0.01);
    expect(p.cacheReadPerM).toBeCloseTo(0.3);
    expect(p.isFree).toBe(false);
  });

  it('marks zero-priced models as free and tolerates missing fields', () => {
    const p = normalizePricing({ prompt: '0', completion: '0' });
    expect(p.isFree).toBe(true);
    expect(p.reasoningPerM).toBeNull();
    expect(normalizePricing(undefined).promptPerM).toBe(0);
  });
});

describe('normalizeModel', () => {
  const raw = {
    id: 'anthropic/claude-sonnet-5',
    name: 'Anthropic: Claude Sonnet 5',
    created: 1_700_000_000,
    context_length: 200_000,
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
    top_provider: { max_completion_tokens: 64_000 },
    supported_parameters: ['max_tokens', 'response_format', 'reasoning'],
    pricing: { prompt: '0.000003', completion: '0.000015' },
  };

  it('derives vendor, capability flags and prices', () => {
    const m = normalizeModel(raw)!;
    expect(m.vendor).toBe('anthropic');
    expect(m.pricing.promptPerM).toBeCloseTo(3);
    expect(m.supportsJsonMode).toBe(true);
    expect(m.supportsReasoning).toBe(true);
    expect(m.builtInWebSearch).toBe(false);
    expect(m.maxCompletionTokens).toBe(64_000);
    expect(m.contextLength).toBe(200_000);
  });

  it('flags Perplexity as built-in web search', () => {
    expect(normalizeModel({ id: 'perplexity/sonar-pro', pricing: {} })!.builtInWebSearch).toBe(true);
  });

  it('drops models that cannot output text and garbage entries', () => {
    expect(normalizeModel({ id: 'x/image-only', architecture: { output_modalities: ['image'] } })).toBeNull();
    expect(normalizeModel(null)).toBeNull();
    expect(normalizeModel({ name: 'no id' })).toBeNull();
  });

  it('normalizes a whole response body', () => {
    expect(normalizeModelsResponse({ data: [raw, { id: 'x/img', architecture: { output_modalities: ['image'] } }] })).toHaveLength(1);
    expect(normalizeModelsResponse({})).toEqual([]);
  });
});

describe('format helpers', () => {
  it('formats prices and context sizes', () => {
    expect(formatPerM(1.25)).toBe('$1.25');
    expect(formatPerM(0.0004)).toBe('$0.0004');
    expect(formatPerM(0)).toBe('$0');
    expect(formatPerM(null)).toBe('—');
    expect(formatContext(200_000)).toBe('200k');
    expect(formatContext(1_047_576)).toBe('1M');
    expect(formatContext(1_500_000)).toBe('1.5M');
    expect(formatContext(null)).toBe('—');
  });

  it('labels vendors with overrides and a readable fallback', () => {
    expect(vendorLabel('openai')).toBe('OpenAI');
    expect(vendorLabel('some-new-vendor')).toBe('Some New Vendor');
    expect(vendorLabel('openai', { openai: 'Open AI' })).toBe('Open AI');
  });

  it('blends prices 3:1 and counts per-request fees', () => {
    const m = normalizeModel({ id: 'a/b', pricing: { prompt: '0.000004', completion: '0.000008', request: '0.001' } })!;
    expect(blendedPricePerM(m)).toBeCloseTo(4 * 0.75 + 8 * 0.25 + 1);
  });
});
