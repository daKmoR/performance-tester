describe('Performance Tester', () => {
  it('can override default options as arguments', () => {
    const perf = new PerformanceTester();
    expect(perf.rootUrl).to.equal('../node_modules/@d4kmor/performance-tester');
    const perf2 = new PerformanceTester({rootUrl: 'foo'});
    expect(perf2.rootUrl).to.equal('foo');
  });

  it('can repeat a single test run multiple times', async () => {
    const perf = new PerformanceTester();
    const result = await perf.executeTestRuns({
      testHtml: '<div>foo</div>'
    });
    expect(result.length).to.equal(1);

    const result2 = await perf.executeTestRuns({
      testHtml: '<div>foo</div>'
    }, { repeats: 2 });
    expect(result2.length).to.equal(2);
  });

  describe('Single Test Run', () => {
    it('creates an async iframe', (done) => {
      const perf = new PerformanceTester();
      const iFrameWait = perf.setupIframe();
      iFrameWait.then(() => {
        expect(perf.iframe).to.be.instanceof(HTMLIFrameElement);
        expect(perf.iframeDoc.constructor.name).to.equal('HTMLDocument');
        done();
      });
    });

    it('writes async test.initHtml to iframe', async () => {
      const perf = new PerformanceTester();
      await perf.setupIframe();
      await perf.testInit(`<script>document.foo = 'bar';</script>`);

      expect(perf.iframeDoc.head.querySelectorAll('script').length).to.equal(2);
      expect(perf.iframeDoc.foo).to.equal('bar');
    });

    it('writes async test.testHtml x times (multiplyHtml) to iframe.body.innerHTML', async () => {
      const perf = new PerformanceTester();
      await perf.setupIframe();
      await perf.testWrite(`<div>foo</div>`);

      expect(perf.iframeDoc.body.querySelectorAll('*').length).to.equal(1);
      expect(perf.iframeDoc.body.querySelector('div').innerText).to.equal('foo');

      await perf.testWrite(`<div>foo</div>`, 3);
      expect(perf.iframeDoc.body.querySelectorAll('*').length).to.equal(3);
      expect(perf.iframeDoc.body.querySelector('div').innerText).to.equal('foo');
    });

    it('executes all needed steps and returns a result', async () => {
      const perf = new PerformanceTester();
      const result = await perf.executeTestRun({
        testHtml: `<div>foo</div>`,
      });
      expect(result).to.have.keys(['start', 'end', 'duration']);
    });

  });

  describe('Sequence', () => {
    it('can be an exact number for how often the html should be multiplied e.g. 3', () => {
      const perf = new PerformanceTester({sequence: '3'});
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 1, multiplyHtml: 3, },
      ]);
    });

    it('can be a range for how often the html should be multiplied e.g. "1-3"', () => {
      const perf = new PerformanceTester({sequence: '1-3'});
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 1, multiplyHtml: 1, },
        { repeats: 1, multiplyHtml: 2, },
        { repeats: 1, multiplyHtml: 3, },
      ]);
    });

    it('can add a number for often a single test should be repeated e.g. 1[3] or 1-3[10]', () => {
      const perf = new PerformanceTester({sequence: '1[3]'});
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 3, multiplyHtml: 1, },
      ]);

      perf.sequence = '1-3[10]';
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 10, multiplyHtml: 1, },
        { repeats: 10, multiplyHtml: 2, },
        { repeats: 10, multiplyHtml: 3, },
      ]);
    });

    it('can add a number for how the distribution of a range should be e.g. "1-6[1,3]"', () => {
      const perf = new PerformanceTester({sequence: '1-6[1,3]'});
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 1, multiplyHtml: 2, },
        { repeats: 1, multiplyHtml: 4, },
        { repeats: 1, multiplyHtml: 6, },
      ]);
      perf.sequence = '1-6[1,2]';
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 1, multiplyHtml: 3, },
        { repeats: 1, multiplyHtml: 6, },
      ]);
    });

    it('can combine multiple "sets" by splitting them with ";" e.g. "1[5];3;8" or "1;1-6[1,2]"', () => {
      const perf = new PerformanceTester({sequence: '1[5];3;8'});
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 5, multiplyHtml: 1, },
        { repeats: 1, multiplyHtml: 3, },
        { repeats: 1, multiplyHtml: 8, },
      ]);
      perf.sequence = '1;1-6[1,2]';
      expect(perf.patchRuns).to.deep.equal([
        { repeats: 1, multiplyHtml: 1, },
        { repeats: 1, multiplyHtml: 3, },
        { repeats: 1, multiplyHtml: 6, },
      ]);
    });
  });
});
