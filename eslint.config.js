import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '.wrangler/**',
      'node_modules/**',
      'docs/sources/**',
      'docs/sources-private/**',
      'tests/fixtures/**',
    ],
  },

  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
      'eqeqeq': ['error', 'smart'],
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },

  // Browser code
  {
    files: ['js/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Cloudflare Pages Functions (Worker runtime)
  {
    files: ['functions/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.worker,
        crypto: 'readonly',
        AbortSignal: 'readonly',
      },
    },
  },

  // Node test + tooling scripts
  {
    files: ['tests/**/*.{js,mjs}', 'scripts/**/*.{js,mjs}', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
