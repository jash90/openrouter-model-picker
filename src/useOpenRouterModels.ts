import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOpenRouterModels, OPENROUTER_MODELS_URL, type FetchModelsOptions, type OpenRouterModel } from './models';

export interface UseOpenRouterModelsOptions extends Omit<FetchModelsOptions, 'signal'> {
  /**
   * Replace the default fetch entirely — e.g. call your own backend that proxies
   * OpenRouter and adds auth. Must resolve to already-normalized models
   * (use `normalizeModelsResponse` if your backend forwards the raw body).
   */
  fetcher?: () => Promise<OpenRouterModel[]>;
  /** How long a fetched list stays fresh across all hook instances. Default 10 minutes. */
  ttlMs?: number;
  /** Set to false to skip fetching (e.g. until the user opens the picker). */
  enabled?: boolean;
}

export interface UseOpenRouterModelsResult {
  models: OpenRouterModel[];
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  /** ISO time of the list currently held (null before the first successful fetch). */
  fetchedAt: string | null;
  /** Bypass the cache and fetch again. */
  refresh: () => Promise<void>;
}

interface CacheEntry {
  models: OpenRouterModel[];
  fetchedAt: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<OpenRouterModel[]>>();

/** Clear the module-level cache (tests, or after changing the API key). */
export function clearOpenRouterModelsCache(): void {
  cache.clear();
}

/**
 * Loads the OpenRouter model list with a small module-level cache, so several
 * pickers on one page share a single request. No external state library needed.
 * If you already use TanStack Query or SWR, skip this hook and pass `models`
 * from your own query into the picker.
 */
export function useOpenRouterModels(options: UseOpenRouterModelsOptions = {}): UseOpenRouterModelsResult {
  const { fetcher, ttlMs = DEFAULT_TTL_MS, enabled = true, apiKey, url = OPENROUTER_MODELS_URL, headers } = options;
  const cacheKey = fetcher ? `fetcher:${url}` : `${url}|${apiKey ?? ''}`;

  const [entry, setEntry] = useState<CacheEntry | null>(() => cache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async (force: boolean) => {
    const cached = cache.get(cacheKey);
    if (!force && cached && Date.now() - cached.fetchedAt < ttlMs) {
      setEntry(cached);
      return;
    }
    let promise = inflight.get(cacheKey);
    if (!promise) {
      promise = (fetcherRef.current ? fetcherRef.current() : fetchOpenRouterModels({ apiKey, url, headers }))
        .then((models) => {
          cache.set(cacheKey, { models, fetchedAt: Date.now() });
          return models;
        })
        .finally(() => inflight.delete(cacheKey));
      inflight.set(cacheKey, promise);
    }
    cached ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      await promise;
      if (mounted.current) setEntry(cache.get(cacheKey) ?? null);
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (mounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, [cacheKey, ttlMs, apiKey, url, headers]);

  useEffect(() => {
    if (enabled) void load(false);
  }, [enabled, load]);

  return {
    models: entry?.models ?? [],
    loading,
    refreshing,
    error,
    fetchedAt: entry ? new Date(entry.fetchedAt).toISOString() : null,
    refresh: () => load(true),
  };
}
