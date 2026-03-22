// @ts-check
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

/**
 * Root ESLint flat config — applies to all TypeScript source files in every package.
 *
 * Rules:
 *  - @typescript-eslint/recommended: enforces TypeScript best practices
 *  - eslint-config-prettier: disables style rules that conflict with Prettier
 *
 * Add package-specific overrides in the array below when needed.
 */
export default [
  {
    // Files to lint
    files: ['packages/*/src/**/*.ts'],

    plugins: {
      '@typescript-eslint': tseslint,
    },

    languageOptions: {
      parser: tsparser,
      parserOptions: {
        // Enable type-aware linting (requires tsconfig.json per package)
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      // Spread in the recommended rule set
      ...tseslint.configs['recommended'].rules,

      // Disallow floating promises — important for async VS Code API calls
      '@typescript-eslint/no-floating-promises': 'error',

      // Explicit return types are encouraged but not enforced (too noisy for small helpers)
      '@typescript-eslint/explicit-function-return-type': 'off',

      // Allow underscored identifiers for intentionally-unused parameters
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Disable all formatting rules that Prettier owns
  prettier,

  {
    // Ignore build output and dependencies
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
];
