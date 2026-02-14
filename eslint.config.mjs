import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // strict includes recommended + stricter type-safety rules
  // stylistic adds consistency rules (prefer-for-of, consistent-type-definitions, etc.)
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // Project-wide rules for TS files
  {
    files: ['**/*.ts'],
    rules: {
      // Core ESLint rules
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-useless-constructor': 'off',
      'no-dupe-class-members': 'off',
      yoda: ['error', 'never', { exceptRange: true }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-throw-literal': 'error',
      curly: ['error', 'all'],
      'no-else-return': ['error', { allowElseIf: false }],

      // TypeScript rules — relax a few strict defaults for this codebase
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_$',
          varsIgnorePattern: '^_$',
          caughtErrorsIgnorePattern: '^_$',
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/unified-signatures': 'warn',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      // isolatedDeclarations requires explicit types on public class properties
      '@typescript-eslint/no-inferrable-types': ['error', { ignoreProperties: true }],
    },
  },

  // Test file globals
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },

  // Prettier must be last to override formatting rules
  prettierConfig,
);
