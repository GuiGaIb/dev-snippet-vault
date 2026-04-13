import { RuleConfigSeverity, type UserConfig } from '@commitlint/types';

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-case': [
      RuleConfigSeverity.Error,
      'always',
      {
        cases: ['kebab-case'],
        delimiters: ['/'],
      },
    ],
    'scope-empty': [RuleConfigSeverity.Error, 'never'],
    'header-max-length': [RuleConfigSeverity.Error, 'always', 72],
    'type-enum': [
      RuleConfigSeverity.Error,
      'always',
      [
        'chore', // Chores, non-functional changes
        'feat', // Features
        'fix', // Bug fixes
        'docs', // Documentation
        'style', // Code style, formatting, etc.
        'refactor', // Code refactoring, renaming, etc.
        'perf', // Performance improvements
        'test', // Testing, adding tests, refactoring tests, etc.
        'build', // Build system
        'ci', // CI/CD
      ],
    ],
  },
};

export default Configuration;
