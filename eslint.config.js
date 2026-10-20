// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*'],
  },
  {
    // Each feature module is used only through its index.ts.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*/*'],
              message: 'Import a module through its public API: @/modules/<name>.',
            },
            { group: ['node:*'], message: 'Node built-ins are for tests and tools only.' },
          ],
        },
      ],
    },
  },
  {
    files: ['tools/**/*.mjs'],
    languageOptions: { globals: { Buffer: 'readonly', process: 'readonly', console: 'readonly' } },
  },
  {
    // Node's types are loaded for tests; keep Node-only APIs out of the app itself.
    files: ['src/**/*.{ts,tsx}', 'modules/*/src/**/*.ts', 'modules/*/index.ts'],
    ignores: ['**/__tests__/**', '**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'Buffer', message: 'Buffer is Node-only. Use Uint8Array.' },
        { name: 'process', message: 'process is Node-only.' },
      ],
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', 'jest.setup.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*/*'],
              message: 'Import a module through its public API: @/modules/<name>.',
            },
          ],
        },
      ],
    },
  },
]);
