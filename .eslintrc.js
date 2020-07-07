module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
      experimentalObjectRestSpread: true,
    },
  },
  env: {
    browser: true,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    propWrapperFunctions: ['forbidExtraProps'],
  },
  overrides: [
    // https://github.com/eslint/typescript-eslint-parser/issues/416
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      rules: {
        'no-undef': 'off',
        '@typescript-eslint/ban-ts-ignore': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_$',
            vars: 'all',
            args: 'after-used',
            ignoreRestSiblings: true,
          },
        ],
      },
    },
    {
      files: ['*.test.ts'],
      env: {
        jest: true,
        node: true,
      },
    },
    {
      files: ['*.js'],
      env: {
        node: true,
      },
    },
  ],
  plugins: ['@typescript-eslint/eslint-plugin'],
  rules: {
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    'no-unused-vars': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'prefer-promise-reject-errors': 'off',
    yoda: [2, 'never', { exceptRange: true }],
    'no-useless-constructor': 'off', // breaks on constructor overloading in classes
    'no-dupe-class-members': 'off', // breaks method overloading in classes
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_$',
        varsIgnorePattern: '^_$',
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/unified-signatures': 'warn',
    '@typescript-eslint/no-useless-constructor': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
