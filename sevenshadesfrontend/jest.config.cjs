module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: {
    '^@bible-strong/avatar-web$': '<rootDir>/node_modules/@bible-strong/avatar-web/dist/index.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg|ico|woff2?|ttf|eot)$': '<rootDir>/test/fileMock.cjs',
  },
  clearMocks: true,
};
