import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
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
  collectCoverageFrom: ['**/*.(t|j)s', '!**/node_modules/**', '!**/dist/**'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@prodigy/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
  },
};

export default config;
