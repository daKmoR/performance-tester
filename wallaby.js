module.exports = () => {
  return {
    files: [
      '*.js',
      {pattern: 'node_modules/chai/chai.js', instrument: false},
    ],
    tests: [
      'test/*.js'
    ],
    testFramework: 'mocha',
    debug: true,
    env: {
      kind: 'chrome'
    },
    bootstrap: function () {
      window.expect = chai.expect;
    }
  };
};