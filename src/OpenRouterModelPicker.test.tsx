import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { OpenRouterModelPicker } from './OpenRouterModelPicker';
import { normalizeModel, type OpenRouterModel } from './models';
import { plLabels } from './labels';

const models: OpenRouterModel[] = [
  normalizeModel({ id: 'openai/gpt-5', name: 'OpenAI: GPT-5', created: 3, context_length: 400_000, supported_parameters: ['response_format'], pricing: { prompt: '0.00000125', completion: '0.00001' } })!,
  normalizeModel({ id: 'anthropic/claude-sonnet-5', name: 'Anthropic: Claude Sonnet 5', created: 2, context_length: 1_000_000, pricing: { prompt: '0.000002', completion: '0.00001' } })!,
  normalizeModel({ id: 'perplexity/sonar-pro', name: 'Perplexity: Sonar Pro', created: 1, context_length: 200_000, pricing: { prompt: '0.000003', completion: '0.000015' } })!,
  normalizeModel({ id: 'meta-llama/llama-free', name: 'Meta: Llama (free)', created: 0, pricing: { prompt: '0', completion: '0' } })!,
];

function open() {
  fireEvent.click(screen.getByRole('button', { expanded: false }));
  return screen.getByRole('listbox');
}

describe('OpenRouterModelPicker', () => {
  it('shows the selected model with its price and opens a searchable list', () => {
    render(<OpenRouterModelPicker models={models} value="openai/gpt-5" onChange={() => {}} />);
    expect(screen.getByText('OpenAI: GPT-5')).toBeTruthy();
    expect(screen.getByText(/\$1\.25/)).toBeTruthy();
    const list = open();
    expect(within(list).getAllByRole('option')).toHaveLength(4);
  });

  it('filters by id, name and vendor and reports the count', () => {
    render(<OpenRouterModelPicker models={models} onChange={() => {}} />);
    const list = open();
    fireEvent.change(screen.getByLabelText(/^Search:/), { target: { value: 'sonar' } });
    expect(within(list).getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('1 of 4')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^Search:/), { target: { value: 'nothing-here' } });
    expect(screen.getByText('No models match “nothing-here”.')).toBeTruthy();
  });

  it('selects with the keyboard and closes', () => {
    const onChange = vi.fn();
    render(<OpenRouterModelPicker models={models} onChange={onChange} />);
    open();
    const input = screen.getByLabelText(/^Search:/);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Default sort is by name: Anthropic, Meta, OpenAI, Perplexity → second is Meta.
    expect(onChange).toHaveBeenCalledWith('meta-llama/llama-free');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('sorts cheapest-first and marks free models', () => {
    render(<OpenRouterModelPicker models={models} onChange={() => {}} />);
    const list = open();
    fireEvent.click(screen.getByRole('button', { name: 'Cheapest' }));
    const ids = within(list).getAllByRole('option').map((el) => el.getAttribute('data-model-id'));
    expect(ids[0]).toBe('meta-llama/llama-free');
    expect(within(list).getAllByText('free').length).toBeGreaterThan(0);
  });

  it('offers an automatic entry that maps to an empty value and shows the server default', () => {
    const onChange = vi.fn();
    render(<OpenRouterModelPicker models={models} value="openai/gpt-5" onChange={onChange} allowAuto defaultModelId="perplexity/sonar-pro" labels={plLabels} />);
    const list = open();
    fireEvent.click(within(list).getByText('Automatycznie (domyślny z serwera)'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('applies a filter and an optional refresh button', () => {
    const onRefresh = vi.fn();
    render(<OpenRouterModelPicker models={models} onChange={() => {}} filter={(m) => m.supportsJsonMode} onRefresh={onRefresh} />);
    const list = open();
    expect(within(list).getAllByRole('option')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh prices' }));
    expect(onRefresh).toHaveBeenCalled();
  });
});
