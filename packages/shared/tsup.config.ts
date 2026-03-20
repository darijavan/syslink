import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  platform: 'node',
  dts: true,
  bundle: true,
  outDir: 'dist',
  clean: true,
});
