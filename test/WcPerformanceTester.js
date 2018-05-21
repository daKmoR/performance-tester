import WcPerformanceTester from '../WcPerformanceTester.js';

/* eslint-env mocha */
/* global expect */
describe('Webcomponent Performance Tester', () => {
  it('has a default reference element that gets added to tests', () => {
    const perf = new WcPerformanceTester();
    expect(perf.useDefaultReferenceElement).to.equal(true);
    const perf2 = new WcPerformanceTester({ useDefaultReferenceElement: false });
    expect(perf2.useDefaultReferenceElement).to.equal(false);
  });
});
