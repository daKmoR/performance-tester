module.exports = () => ({
  files: [
    '*.js',
    '!wallaby.js',
    { pattern: 'node_modules/chai/chai.js', instrument: false },
    { pattern: 'node_modules/sinon/pkg/sinon.js', instrument: false },
  ],
  tests: [
    'test/*.js',
  ],
  testFramework: 'mocha',
  debug: true,
  env: {
    kind: 'chrome',
  },
  bootstrap() {
    window.expect = window.chai.expect;
  },
});
