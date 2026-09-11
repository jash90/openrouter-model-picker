export interface PickerLabels {
  placeholder: string;
  searchPlaceholder: string;
  allVendors: string;
  sortName: string;
  sortCheapest: string;
  sortNewest: string;
  sortContext: string;
  refresh: string;
  refreshing: string;
  loading: string;
  loadError: string;
  noMatches: (query: string) => string;
  countOf: (shown: number, total: number) => string;
  modelsCount: (n: number) => string;
  pricesFrom: (time: string) => string;
  auto: string;
  now: string;
  isDefault: string;
  free: string;
  web: string;
  json: string;
  reasoning: string;
  context: string;
  maxOutput: string;
  perRequest: string;
  priceTitle: string;
  webTitle: string;
  jsonTitle: string;
}

export const enLabels: PickerLabels = {
  placeholder: 'Select a model…',
  searchPlaceholder: 'Search: gpt-5, claude, sonar, gemini, llama…',
  allVendors: 'All vendors',
  sortName: 'Name',
  sortCheapest: 'Cheapest',
  sortNewest: 'Newest',
  sortContext: 'Context',
  refresh: 'Refresh prices',
  refreshing: 'refreshing…',
  loading: 'Loading models from OpenRouter…',
  loadError: 'Could not load the model list',
  noMatches: (q) => `No models match “${q}”.`,
  countOf: (shown, total) => `${shown} of ${total}`,
  modelsCount: (n) => `${n} OpenRouter models`,
  pricesFrom: (t) => `prices as of ${t}`,
  auto: 'Automatic (server default)',
  now: 'now:',
  isDefault: 'default',
  free: 'free',
  web: 'web',
  json: 'json',
  reasoning: 'reasoning',
  context: 'context',
  maxOutput: 'max output',
  perRequest: 'per request',
  priceTitle: 'USD per 1M tokens: input / output',
  webTitle: 'Built-in web search',
  jsonTitle: 'Supports response_format JSON',
};

export const plLabels: PickerLabels = {
  placeholder: 'Wybierz model…',
  searchPlaceholder: 'Szukaj: gpt-5, claude, sonar, gemini, llama…',
  allVendors: 'Wszyscy producenci',
  sortName: 'Nazwa',
  sortCheapest: 'Najtańsze',
  sortNewest: 'Najnowsze',
  sortContext: 'Kontekst',
  refresh: 'Odśwież ceny',
  refreshing: 'odświeżam…',
  loading: 'Pobieram listę modeli z OpenRoutera…',
  loadError: 'Nie udało się pobrać listy modeli',
  noMatches: (q) => `Brak modeli pasujących do „${q}”.`,
  countOf: (shown, total) => `${shown} z ${total}`,
  modelsCount: (n) => `${n} modeli OpenRouter`,
  pricesFrom: (t) => `ceny z ${t}`,
  auto: 'Automatycznie (domyślny z serwera)',
  now: 'teraz:',
  isDefault: 'domyślny',
  free: 'darmowy',
  web: 'web',
  json: 'json',
  reasoning: 'reasoning',
  context: 'kontekst',
  maxOutput: 'max wyjście',
  perRequest: 'za żądanie',
  priceTitle: 'USD za 1M tokenów: wejście / wyjście',
  webTitle: 'Wbudowane wyszukiwanie w sieci',
  jsonTitle: 'Obsługuje response_format JSON',
};
