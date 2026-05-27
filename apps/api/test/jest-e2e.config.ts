import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { decoratorMetadata: true },
        },
      },
    ],
  },
  testEnvironment: 'node',
  testTimeout: 60000,
  moduleNameMapper: {
    '^@prodigy/shared-types$': '<rootDir>/../../../packages/shared-types/src/index.ts',
  },
};

export default config;
