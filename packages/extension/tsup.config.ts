import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  platform: 'node',
  // "vscode" is provided by the extension host at runtime — never bundle it
  external: ['vscode'],
  bundle: true,
  outDir: 'dist',
  clean: true,
});
