import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Local playground: `npm run dev` serves ./demo against the live OpenRouter list. */
export default defineConfig({
  root: 'demo',
  plugins: [react()],
});
