import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const recommended = [js.configs.recommended, tseslint.configs.recommended];

export default defineConfig(
  {
    ignores: [
      'coverage/**',
      'dist/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    files: ['src/**/*.ts'],
    extends: recommended,
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['tests/**/*.ts'],
    extends: recommended,
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['*.config.js', '*.config.ts'],
    extends: recommended,
    languageOptions: {
      globals: globals.node,
    },
  },
);
