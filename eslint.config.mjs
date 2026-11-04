import globals from 'globals';

export default [
  {
    files: ['.build/**/*.mjs', '.build/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, Papa: 'readonly', html2canvas: 'readonly' },
    },
  },
  {
    files: ['sw.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...globals.serviceworker } },
  },
  {
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-dupe-keys': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-redeclare': 'error',
      'no-self-assign': 'error',
      'no-func-assign': 'error',
      'no-cond-assign': 'error',
      'no-unsafe-finally': 'error',
      'no-async-promise-executor': 'error',
      'no-loss-of-precision': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-compare-neg-zero': 'error',
    },
  },
];
