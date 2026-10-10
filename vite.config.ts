import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

// `typescript` is the TS 6 API package (@typescript/typescript6), which ships no lib.*.d.ts files.
// API Extractor (rollupTypes) needs a compiler folder with them, so point it at the real TS 6 package
// that the shim depends on, resolved from the shim itself rather than relying on npm hoisting.
const requireFromTs = createRequire(createRequire(import.meta.url).resolve('typescript'));
const tsCompilerFolder = dirname(requireFromTs.resolve('@typescript/old/package.json'));

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.*', 'src/test-setup.ts'],
      rollupTypes: true,
      // TS 6+ defaults rootDir to the tsconfig folder; keep declarations flat in dist/.
      compilerOptions: { rootDir: resolve(__dirname, 'src') },
      rollupOptions: { typescriptCompilerFolder: tsCompilerFolder },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
  },
});
