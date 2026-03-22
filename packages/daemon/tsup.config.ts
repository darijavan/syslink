import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  platform: 'node',
  bundle: true,
  outDir: 'dist',
  clean: true,
});
