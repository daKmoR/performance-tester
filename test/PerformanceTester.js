describe('Performance Tester', () => {
  it('can override default options as parameters', () => {
    const perf = new PerformanceTester();
    expect(perf.rootUrl).to.equal('../node_modules/@d4kmor/performance-tester');
    const perf2 = new PerformanceTester({rootUrl: 'foo'});
    expect(perf2.rootUrl).to.equal('foo');
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
