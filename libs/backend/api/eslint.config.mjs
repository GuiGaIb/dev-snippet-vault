import baseConfig from '../../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
];
