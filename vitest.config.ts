import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    exclude: [
      'node_modules/**',
      '.next/**',
      '_workspace/**',
      'vscode-extension/**',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
