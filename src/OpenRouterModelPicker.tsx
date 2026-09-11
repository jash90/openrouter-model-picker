import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { OpenRouterModel } from './models';
import { blendedPricePerM, formatContext, formatPerM, vendorLabel } from './format';
import { enLabels, type PickerLabels } from './labels';

export type PickerSortKey = 'name' | 'cheapest' | 'newest' | 'context';

export interface OpenRouterModelPickerProps {
  /** Normalized model list — from `useOpenRouterModels`, your own query, or a server. */
  models: OpenRouterModel[];
  /** Selected model id. Empty/undefined = nothing selected (or "automatic" when `allowAuto`). */
  value?: string;
  /** Called with the model id, or "" when the automatic option is chosen. */
  onChange: (id: string) => void;
  loading?: boolean;
  refreshing?: boolean;
  error?: unknown;
  /** Shown as a "Refresh prices" button inside the dropdown. */
  onRefresh?: () => void;
  /** ISO string or Date of the list currently shown — rendered next to the label. */
  fetchedAt?: string | Date | null;
  /** Model the server would use when none is chosen; marked in the list and shown under "automatic". */
  defaultModelId?: string;
  /** Adds an "automatic" entry at the top of the list that maps to value "". */
  allowAuto?: boolean;
  /** Label above the control. Omit for a bare control. */
  label?: ReactNode;
  /** Tighter paddings, no detail chips under the control. */
  compact?: boolean;
  disabled?: boolean;
  /** Partial overrides merged over the English defaults; import `plLabels` for Polish. */
  labels?: Partial<PickerLabels>;
  /** Vendor id → display name overrides (e.g. { 'x-ai': 'xAI' }). */
  vendorLabels?: Record<string, string>;
  /** Restrict the list (e.g. only models with JSON mode). */
  filter?: (model: OpenRouterModel) => boolean;
  initialSort?: PickerSortKey;
  /** Force light/dark regardless of the OS setting. */
  theme?: 'light' | 'dark';
  className?: string;
  id?: string;
}

function matches(m: OpenRouterModel, q: string, vendors?: Record<string, string>): boolean {
  if (!q) return true;
  const hay = `${m.id} ${m.name} ${vendorLabel(m.vendor, vendors)}`.toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}

function timeLabel(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Searchable picker over the full OpenRouter model list: text search across
 * id / name / vendor, vendor filter, sorting, keyboard navigation, and a price
 * per 1M tokens on every row — choosing a model is choosing its price list.
 */
export function OpenRouterModelPicker(props: OpenRouterModelPickerProps) {
  const {
    models, value, onChange, loading, refreshing, error, onRefresh, fetchedAt, defaultModelId,
    allowAuto, label, compact, disabled, vendorLabels, filter, initialSort = 'name', theme, className, id,
  } = props;
  const t: PickerLabels = useMemo(() => ({ ...enLabels, ...(props.labels ?? {}) }), [props.labels]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [vendor, setVendor] = useState('all');
  const [sort, setSort] = useState<PickerSortKey>(initialSort);
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => (filter ? models.filter(filter) : models), [models, filter]);
  const selected = value ? visible.find((m) => m.id === value) ?? models.find((m) => m.id === value) : undefined;

  const vendors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of visible) counts.set(m.vendor, (counts.get(m.vendor) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = visible.filter((m) => (vendor === 'all' || m.vendor === vendor) && matches(m, q, vendorLabels));
    const sorters: Record<PickerSortKey, (a: OpenRouterModel, b: OpenRouterModel) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      cheapest: (a, b) => blendedPricePerM(a) - blendedPricePerM(b) || a.name.localeCompare(b.name),
      newest: (a, b) => b.created - a.created || a.name.localeCompare(b.name),
      context: (a, b) => (b.contextLength ?? 0) - (a.contextLength ?? 0) || a.name.localeCompare(b.name),
    };
    return [...list].sort(sorters[sort]);
  }, [visible, query, vendor, sort, vendorLabels]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => { setCursor(0); }, [query, vendor, sort]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const idx = filtered.findIndex((m) => m.id === value);
    if (idx >= 0) setCursor(idx);
    // Only when opening: re-running on every filter change would fight the cursor reset above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [cursor, open]);

  const pick = (modelId: string) => { onChange(modelId); setOpen(false); setQuery(''); };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(filtered.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const m = filtered[cursor]; if (m) pick(m.id); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  const isAuto = !!allowAuto && !value;
  const summaryTitle = selected ? selected.name : value ? value : isAuto ? t.auto : t.placeholder;
  const priceTime = timeLabel(fetchedAt);
  const errorMessage = error ? (error instanceof Error ? error.message : String(error)) : null;

  const rootClass = ['orp', open && 'orp--open', compact && 'orp--compact', label && 'orp--has-label', className]
    .filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={rootClass} data-theme={theme} id={id}>
      {label && (
        <div className="orp__label">
          <span>{label}</span>
          <span className="orp__label-meta">
            {models.length ? t.modelsCount(models.length) : ''}
            {priceTime && ` · ${t.pricesFrom(priceTime)}`}
          </span>
        </div>
      )}

      <div className="orp__anchor">
      <button
        type="button"
        className="orp__summary"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="orp__summary-inner">
          <div className="orp__summary-text">
            <p className="orp__summary-title">{summaryTitle}</p>
            {selected ? (
              <p className="orp__summary-sub orp__mono">{selected.id}</p>
            ) : isAuto && defaultModelId ? (
              <p className="orp__summary-sub">{t.now} <span className="orp__mono">{defaultModelId}</span></p>
            ) : loading ? (
              <p className="orp__summary-sub">{t.loading}</p>
            ) : errorMessage ? (
              <p className="orp__summary-sub orp__summary-sub--error">{t.loadError}</p>
            ) : null}
          </div>
          <div className="orp__summary-right">
            {selected && <PriceTag model={selected} t={t} />}
            <svg className="orp__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </div>
        </div>
      </button>

      {open && (
        <div className="orp__popover">
          <div className="orp__toolbar">
            <div className="orp__search">
              <svg className="orp__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                className="orp__input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
                role="combobox"
                aria-expanded="true"
                aria-controls={`${id ?? 'orp'}-listbox`}
              />
            </div>
            <div className="orp__filters">
              <select className="orp__select" value={vendor} onChange={(e) => setVendor(e.target.value)} aria-label={t.allVendors}>
                <option value="all">{t.allVendors} ({visible.length})</option>
                {vendors.map(([v, n]) => <option key={v} value={v}>{vendorLabel(v, vendorLabels)} ({n})</option>)}
              </select>
              <div className="orp__sorts" role="group">
                {([['name', t.sortName], ['cheapest', t.sortCheapest], ['newest', t.sortNewest], ['context', t.sortContext]] as const).map(([key, text]) => (
                  <button key={key} type="button" onClick={() => setSort(key)}
                    className={`orp__sort${sort === key ? ' orp__sort--active' : ''}`} aria-pressed={sort === key}>
                    {text}
                  </button>
                ))}
              </div>
              <span className="orp__count">{t.countOf(filtered.length, visible.length)}</span>
              {onRefresh && (
                <button type="button" className="orp__refresh" onClick={onRefresh} disabled={!!refreshing} title={t.refresh}>
                  {refreshing ? t.refreshing : t.refresh}
                </button>
              )}
            </div>
          </div>

          <div ref={listRef} className="orp__list" role="listbox" id={`${id ?? 'orp'}-listbox`}>
            {allowAuto && (
              <button type="button" role="option" aria-selected={!value}
                className={`orp__auto${!value ? ' orp__auto--selected' : ''}`}
                onClick={() => { onChange(''); setOpen(false); }}>
                {t.auto}
                {defaultModelId && <span className="orp__auto-id orp__mono">{defaultModelId}</span>}
              </button>
            )}
            {loading && !models.length && <p className="orp__message">{t.loading}</p>}
            {errorMessage && !models.length && <p className="orp__message orp__message--error">{t.loadError}: {errorMessage}</p>}
            {!loading && !errorMessage && !filtered.length && <p className="orp__message">{t.noMatches(query)}</p>}
            {filtered.map((m, i) => (
              <ModelRow key={m.id} model={m} index={i} active={i === cursor} selected={m.id === value}
                isDefault={m.id === defaultModelId} t={t} onHover={() => setCursor(i)} onPick={() => pick(m.id)} />
            ))}
          </div>
        </div>
      )}
      </div>

      {selected && !compact && (
        <div className="orp__details">
          <span className="orp__chip">{vendorLabel(selected.vendor, vendorLabels)}</span>
          <span className="orp__chip">{t.context} {formatContext(selected.contextLength)}</span>
          {selected.maxCompletionTokens && <span className="orp__chip">{t.maxOutput} {formatContext(selected.maxCompletionTokens)}</span>}
          {selected.builtInWebSearch && <span className="orp__chip orp__chip--info">{t.webTitle}</span>}
          {selected.supportsJsonMode && <span className="orp__chip orp__chip--ok">{t.json}</span>}
          {selected.supportsReasoning && <span className="orp__chip orp__chip--violet">{t.reasoning}</span>}
          {selected.pricing.perRequest > 0 && <span className="orp__chip orp__chip--warn">+{formatPerM(selected.pricing.perRequest)} {t.perRequest}</span>}
          {selected.pricing.isFree && <span className="orp__chip orp__chip--ok">{t.free}</span>}
        </div>
      )}
    </div>
  );
}

function ModelRow({ model, index, active, selected, isDefault, t, onHover, onPick }: {
  model: OpenRouterModel; index: number; active: boolean; selected: boolean; isDefault: boolean;
  t: PickerLabels; onHover: () => void; onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      data-index={index}
      data-model-id={model.id}
      onMouseEnter={onHover}
      onClick={onPick}
      className={`orp__row${active ? ' orp__row--active' : ''}${selected ? ' orp__row--selected' : ''}`}
    >
      <div className="orp__row-main">
        <p className="orp__row-name">
          {model.name}
          {isDefault && <span className="orp__row-default">{t.isDefault}</span>}
        </p>
        <p className="orp__row-id">{model.id}</p>
      </div>
      <div className="orp__row-side">
        {model.builtInWebSearch && <span className="orp__badge orp__badge--info" title={t.webTitle}>{t.web}</span>}
        {model.supportsJsonMode && <span className="orp__badge orp__badge--ok" title={t.jsonTitle}>{t.json}</span>}
        <span className="orp__ctx">{formatContext(model.contextLength)}</span>
        <PriceTag model={model} t={t} />
      </div>
    </button>
  );
}

/** "$1.25 / $10.00" — USD per 1M tokens, input / output. */
function PriceTag({ model, t }: { model: OpenRouterModel; t: PickerLabels }) {
  if (model.pricing.isFree) return <span className="orp__badge orp__badge--ok">{t.free}</span>;
  return (
    <span className="orp__price" title={t.priceTitle}>
      {formatPerM(model.pricing.promptPerM)} <span className="orp__price-sep">/</span> {formatPerM(model.pricing.completionPerM)}
    </span>
  );
}
