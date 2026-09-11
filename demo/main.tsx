import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { OpenRouterModelPicker, useOpenRouterModels, plLabels } from '../src';
import '../src/styles.css';

function Demo() {
  const [model, setModel] = useState('');
  const [lang, setLang] = useState<'en' | 'pl'>('en');
  const { models, loading, refreshing, error, refresh, fetchedAt } = useOpenRouterModels();
  const selected = models.find((m) => m.id === model);

  return (
    <>
      <h1>OpenRouter Model Picker</h1>
      <p>
        Live list from <code>openrouter.ai/api/v1/models</code> (no API key needed).
        <label style={{ marginLeft: 12 }}>
          Labels:{' '}
          <select value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'pl')}>
            <option value="en">English</option>
            <option value="pl">Polski</option>
          </select>
        </label>
      </p>

      <OpenRouterModelPicker
        label="Model"
        models={models}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRefresh={refresh}
        fetchedAt={fetchedAt}
        value={model}
        onChange={setModel}
        allowAuto
        defaultModelId="perplexity/sonar-reasoning-pro"
        labels={lang === 'pl' ? plLabels : undefined}
      />

      <pre>{selected ? JSON.stringify(selected, null, 2) : 'Pick a model to see its normalized record…'}</pre>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Demo /></StrictMode>);
