module.exports = {
  cacheDirectory: '<rootDir>/.jest-cache',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!**/node_modules/**'],
  coverageDirectory: '.coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/src/fixtures'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  extraGlobals: [],
  modulePathIgnorePatterns: ['<rootDir>/lib'],
  verbose: true,
  transform: {
    '^.+\\.[t|j]sx?$': 'babel-jest',
  },
};
