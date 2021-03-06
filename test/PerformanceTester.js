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
    expect(Object.keys(perf.tests[0].rawResults).length).to.equal(1);
    expect(perf.tests[0].rawResults['1'][0]).to.have.keys(['start', 'end', 'duration']);
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
    const tests = [
      {
        name: 'Reference Element',
        referenceElement: true,
        rawResults: {
          2: [{ duration: 33.06 }, { duration: 32.47 }, { duration: 33.12 }],
          6: [{ duration: 97.20 }, { duration: 97.78 }, { duration: 96.62 }],
          10: [{ duration: 158.24 }, { duration: 154.0 }, { duration: 157.42 }],
        },
      }, {
        name: 'Random Element',
        rawResults: {
          2: [{ duration: 48.50 }, { duration: 57.64 }, { duration: 48.90 }],
          6: [{ duration: 86.24 }, { duration: 90.28 }, { duration: 90.66 }],
          10: [{ duration: 136.30 }, { duration: 162.12 }, { duration: 141.22 }],
        },
      },
    ];
    const result = PerformanceTester.calculateResults(tests);

    const res1 = result[0].result;
    expect(result[0].name).to.equal('Random Element');
    expect(res1.timeAvg).to.equal(18.446);
    expect(res1.timeSum).to.equal(166.014);
    expect(res1.timeMedian).to.equal(15.11);
    expect(res1.timeStandardDeviation).to.be.closeTo(5.4, 0.1);
    expect(res1.timePercentage).is.be.closeTo(93, 1);
    expect(res1.count).to.equal(9);

    const res2 = result[1].result;
    expect(result[1].name).to.equal('Reference Element');
    expect(res2.timeAvg).to.equal(16.099);
    expect(res2.timeSum).to.equal(144.891);
    expect(res2.timeMedian).to.equal(16.2);
    expect(res2.timeStandardDeviation).to.be.closeTo(0.3, 0.1);
    expect(res2.timePercentage).to.equal(100);
    expect(res2.count).to.equal(9);
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
      expect(perf._runs).to.deep.equal([
        { repeats: 1, multiplyHtml: 3 },
      ]);
    });

    it('can be a range for how often the html should be multiplied e.g. "1-3"', () => {
      const perf = new PerformanceTester({ sequence: '1-3' });
      expect(perf._runs).to.deep.equal([
        { repeats: 1, multiplyHtml: 1 },
        { repeats: 1, multiplyHtml: 2 },
        { repeats: 1, multiplyHtml: 3 },
      ]);
    });

    it('can add a number for often a single test should be repeated e.g. 1[3] or 1-3[10]', () => {
      const perf = new PerformanceTester({ sequence: '1[3]' });
      expect(perf._runs).to.deep.equal([
        { repeats: 3, multiplyHtml: 1 },
      ]);

      perf.sequence = '1-3[10]';
      expect(perf._runs).to.deep.equal([
        { repeats: 10, multiplyHtml: 1 },
        { repeats: 10, multiplyHtml: 2 },
        { repeats: 10, multiplyHtml: 3 },
      ]);
    });

    it('can add a number for how the distribution of a range should be e.g. "1-6[1,3]"', () => {
      const perf = new PerformanceTester({ sequence: '1-6[1,3]' });
      expect(perf._runs).to.deep.equal([
        { repeats: 1, multiplyHtml: 2 },
        { repeats: 1, multiplyHtml: 4 },
        { repeats: 1, multiplyHtml: 6 },
      ]);
      perf.sequence = '1-6[1,2]';
      expect(perf._runs).to.deep.equal([
        { repeats: 1, multiplyHtml: 3 },
        { repeats: 1, multiplyHtml: 6 },
      ]);
    });

    it('can combine multiple "sets" by splitting them with ";" e.g. "1[5];3;8" or "1;1-6[1,2]"', () => {
      const perf = new PerformanceTester({ sequence: '1[5];3;8' });
      expect(perf._runs).to.deep.equal([
        { repeats: 5, multiplyHtml: 1 },
        { repeats: 1, multiplyHtml: 3 },
        { repeats: 1, multiplyHtml: 8 },
      ]);
      perf.sequence = '1;1-6[1,2]';
      expect(perf._runs).to.deep.equal([
        { repeats: 1, multiplyHtml: 1 },
        { repeats: 1, multiplyHtml: 3 },
        { repeats: 1, multiplyHtml: 6 },
      ]);
    });
  });
});
