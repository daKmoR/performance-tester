import PerformanceTester from '../PerformanceTester.js';

/* eslint-env mocha */
/* global expect */
describe('Performance Tester', () => {
  it('can add tests (and they get a default trance number)', () => {
    const perf = new PerformanceTester();
    perf.add({ testHtml: '<div>foo</div>' });
    expect(perf.tests.length).to.equal(1);
    expect(perf.tests[0].trace).to.equal(0);
  });

  it('can override default options as arguments', () => {
    const perf = new PerformanceTester();
    expect(perf.rootUrl).to.equal('../node_modules/@d4kmor/performance-tester');
    const perf2 = new PerformanceTester({ rootUrl: 'foo' });
    expect(perf2.rootUrl).to.equal('foo');
  });

  it('can execute a full suite with multiple tests', async () => {
    const perf = new PerformanceTester({ sequence: '1' });
    perf.add({ testHtml: '<div>foo</div>' });
    await perf.executeSuite();
    expect(Object.keys(perf.tests[0].results).length).to.equal(1);
    expect(perf.tests[0].results['1'][0]).to.have.keys(['start', 'end', 'duration']);
  });

  it('can execute a test (which my triggers multiple test-runs)', async () => {
    const perf = new PerformanceTester();
    const result = await perf.executeTest({
      testHtml: '<div>foo</div>',
    });
    expect(result['1'][0]).to.have.keys(['start', 'end', 'duration']);

    const result2 = await perf.executeTest({
      testHtml: '<div>foo</div>',
    }, [
      { repeats: 1, multiplyHtml: 1 },
      { repeats: 1, multiplyHtml: 2 },
    ]);
    expect(Object.keys(result2).length).to.equal(2);
    expect(result2['1'][0]).to.have.keys(['start', 'end', 'duration']);
    expect(result2['2'][0]).to.have.keys(['start', 'end', 'duration']);
  });

  it('can execute multiple test-runs', async () => {
    const perf = new PerformanceTester();
    const result = await perf.executeTestRuns({
      testHtml: '<div>foo</div>',
    });
    expect(result.length).to.equal(1);

    const result2 = await perf.executeTestRuns({
      testHtml: '<div>foo</div>',
    }, { repeats: 2 });
    expect(result2.length).to.equal(2);
  });

  it('calculates results like points, percentage & timer per instance & overall', () => {
    // let tests = [
    //   {
    //     "2":[{"duration":33.29},{"duration":32.09}],
    //     "4":[{"duration":64.90},{"duration":65.20}],
    //     "6":[{"duration":96.60},{"duration":96.70}],
    //     "8":[{"duration":128.99},{"duration":128.89}],
    //     "10":[{"duration":161.40},{"duration":159.29}]
    //   },
    //   {
    //     "2":[{"duration":48.59},{"duration":57.60}],
    //     "4":[{"duration":95.49},{"duration":84.69}],
    //     "6":[{"duration":86.29},{"duration":90.10}],
    //     "8":[{"duration":124.49},{"duration":137.99}],
    //     "10":[{"duration":136.30},{"duration":164.39}]
    //   }
    // ];
    let tests = [
      {
        name: 'Reference Element',
        rawResults: {
          "2":[{"duration":33.29},{"duration":32.09}],
          "6":[{"duration":96.60},{"duration":96.70}],
          "10":[{"duration":161.27},{"duration":159.29}]
        },
      }, {
        name: 'Random Element',
        rawResults: {
          "2":[{"duration":48.59},{"duration":57.60}],
          "6":[{"duration":86.29},{"duration":90.10}],
          "10":[{"duration":136.30},{"duration":164.39}]
        },
      },
    ];
    const result = PerformanceTester.calculateResults(tests);

    expect(result).to.deep.equal([
      {
        name: 'Reference Element',
        count: 18,

        timeSum: 32.18,
        timeAvg: 1,
        timeMedian: 32.18,
        timeStandardDeviation: 1,
      }
    ])
  });

  describe('Test-Run', () => {
    it('creates an async iframe', (done) => {
      const perf = new PerformanceTester();
      const iFrameWait = perf.setupIframe();
      iFrameWait.then(() => {
        expect(perf.iframe).to.be.instanceof(HTMLIFrameElement);
        expect(typeof perf.iframeDoc).to.equal('object');
        perf.removeIframe();
        done();
      });
    });

    it('writes async test.initHtml to iframe', async () => {
      const perf = new PerformanceTester();
      await perf.setupIframe();
      await perf.testInit('<script>document.foo = \'bar\';</script>');

      expect(perf.iframeDoc.head.querySelectorAll('script').length).to.equal(2);
      expect(perf.iframeDoc.foo).to.equal('bar');

      perf.removeIframe();
    });

    it('writes async test.testHtml x times (multiplyHtml) to iframe.body.innerHTML', async () => {
      const perf = new PerformanceTester();
      await perf.setupIframe();
      await perf.testWrite('<div>foo</div>');

      expect(perf.iframeDoc.body.querySelectorAll('*').length).to.equal(1);
      expect(perf.iframeDoc.body.querySelector('div').innerText).to.equal('foo');

      await perf.testWrite('<div>foo</div>', 3);
      expect(perf.iframeDoc.body.querySelectorAll('*').length).to.equal(3);
      expect(perf.iframeDoc.body.querySelector('div').innerText).to.equal('foo');

      perf.removeIframe();
    });

    it('executes all needed steps and returns a result', async () => {
      const perf = new PerformanceTester();
      const result = await perf.executeTestRun({
        testHtml: '<div>foo</div>',
      });
      expect(result).to.have.keys(['start', 'end', 'duration']);
    });
  });

  describe('Sequence', () => {
    it('can be an exact number for how often the html should be multiplied e.g. 3', () => {
      const perf = new PerformanceTester({ sequence: '3' });
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 1, multiplyHtml: 3 },
      ]);
    });

    it('can be a range for how often the html should be multiplied e.g. "1-3"', () => {
      const perf = new PerformanceTester({ sequence: '1-3' });
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 1, multiplyHtml: 1 },
        { repeats: 1, multiplyHtml: 2 },
        { repeats: 1, multiplyHtml: 3 },
      ]);
    });

    it('can add a number for often a single test should be repeated e.g. 1[3] or 1-3[10]', () => {
      const perf = new PerformanceTester({ sequence: '1[3]' });
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 3, multiplyHtml: 1 },
      ]);

      perf.sequence = '1-3[10]';
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 10, multiplyHtml: 1 },
        { repeats: 10, multiplyHtml: 2 },
        { repeats: 10, multiplyHtml: 3 },
      ]);
    });

    it('can add a number for how the distribution of a range should be e.g. "1-6[1,3]"', () => {
      const perf = new PerformanceTester({ sequence: '1-6[1,3]' });
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 1, multiplyHtml: 2 },
        { repeats: 1, multiplyHtml: 4 },
        { repeats: 1, multiplyHtml: 6 },
      ]);
      perf.sequence = '1-6[1,2]';
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 1, multiplyHtml: 3 },
        { repeats: 1, multiplyHtml: 6 },
      ]);
    });

    it('can combine multiple "sets" by splitting them with ";" e.g. "1[5];3;8" or "1;1-6[1,2]"', () => {
      const perf = new PerformanceTester({ sequence: '1[5];3;8' });
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 5, multiplyHtml: 1 },
        { repeats: 1, multiplyHtml: 3 },
        { repeats: 1, multiplyHtml: 8 },
      ]);
      perf.sequence = '1;1-6[1,2]';
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 1, multiplyHtml: 1 },
        { repeats: 1, multiplyHtml: 3 },
        { repeats: 1, multiplyHtml: 6 },
      ]);
    });
  });
});
