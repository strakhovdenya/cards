import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.{test,spec}.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'happy-dom',
          include: ['src/**/*.{test,spec}.tsx'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
