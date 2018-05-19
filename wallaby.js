module.exports = () => {
  return {
    files: [
      'src/*.js',
      {pattern: 'node_modules/chai/chai.js', instrument: false},
    ],
    tests: [
      'test/*Spec.js'
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