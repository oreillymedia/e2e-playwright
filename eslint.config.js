const js = require('@eslint/js');
const playwright = require('eslint-plugin-playwright');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'tests/__snapshots__/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/Usage/b2b-ucv-reader-usage.spec.js'],
    languageOptions: { sourceType: 'module' },
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.spec.js'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Allowed: legitimate e2e patterns against unstable third-party UIs
      'playwright/no-force-option': 'off',
      'playwright/no-networkidle': 'off',
      'playwright/no-wait-for-timeout': 'off',
      'playwright/no-useless-not': 'off',
      'playwright/consistent-spacing-between-blocks': 'off',
      // Keep as warnings — usually fine but worth surfacing
      'playwright/no-conditional-in-test': 'warn',
      'playwright/no-conditional-expect': 'warn',
      'playwright/expect-expect': 'warn',
      'playwright/no-skipped-test': 'warn',
    },
  },
];
