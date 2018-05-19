/* global Plotly */

export default class PerformanceTester {
  static timeout(time) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }

  /**
   *  1-10;11-20[2,5];20-100[1,30]
   *
   *  will result in something like this
   *
   *    this.patchRuns = [
   *      { repeats: 2, multiplyHtml: 10, },
   *      { repeats: 2, multiplyHtml: 20, }
   *    ];
   */
  set sequence(sequence) {
    this.__sequence = sequence;

    const newPatchRuns = [];
    const parts = this.__sequence.split(';');
    parts.forEach((rawPart) => {
      let repeats = 1;
      let multiplySpread = -1;
      let part = rawPart;
      if (part.indexOf('[') !== -1) {
        const options = part.substring(part.indexOf('[') + 1, part.indexOf(']'));
        [repeats, multiplySpread] = options.split(',');
        repeats = parseInt(repeats, 10);
        multiplySpread = multiplySpread ? parseInt(multiplySpread, 10) : -1;
        part = part.substring(0, part.indexOf('['));
      }
      let [start, end] = part.split('-');
      start = parseInt(start, 10);
      end = end ? parseInt(end, 10) : start;

      multiplySpread = multiplySpread === -1 ? end : multiplySpread;
      const step = Math.floor(((end - start) + 1) / multiplySpread);
      let i = step > 1 ? (start - 1) + step : start;
      while (i <= end) {
        newPatchRuns.push({ repeats, multiplyHtml: i });
        i += step;
        if (step === 0) { break; }
      }
    });

    this.patchRuns = newPatchRuns;
  }

  get sequence() {
    return this.__sequence;
  }

  constructor(options) {
    const optionsWithDefaults = Object.assign({}, {
      sequence: '1-10;11-20[2,5];20-100[1,30]',
      rootUrl: '../node_modules/@d4kmor/performance-tester',
      tests: [],
    }, options);
    this._running = null;

    Object.assign(this, optionsWithDefaults);

    if (this.rootNode) {
      this.rootNode.innerHTML = `
        <h1>Tester</h1>
        <button id="start">start</button>
        <button id="stop">stop</button>
        <div id="graph"></div>
      `;

      this.startButton = this.rootNode.querySelector('#start');
      this.startButton.addEventListener('click', () => {
        this.start();
      });
      this.stopButton = this.rootNode.querySelector('#stop');
      this.stopButton.addEventListener('click', () => {
        this.stop();
      });
      this.graphNode = this.rootNode.querySelector('#graph');

      this.graphSetup = false;
      this.graphTraceSetup = { 0: true };
    }
  }

  add(test) {
    const testToAdd = test;
    testToAdd.trace = testToAdd.trace || this.tests.length;
    this.tests.push(testToAdd);
  }

  start() {
    this._running = true;
    this.executeSuite();
  }

  stop() {
    this._running = false;
  }

  async executeSuite() {
    for (let i = 0; i < this.tests.length; i += 1) {
      this.tests[i].results = await this.executeTest(this.tests[i], this.patchRuns);
    }
  }

  async executeTest(test, runs = [{ repeats: 1, multiplyHtml: 1 }]) {
    const results = {};
    for (let i = 0; i < runs.length; i += 1) {
      const result = await this.executeTestRuns(test, runs[i]);
      results[runs[i].multiplyHtml] = result;
    }
    return results;
  }

  async executeTestRuns(test, { repeats = 1, multiplyHtml = 1 } = { repeats: 1, multiplyHtml: 1 }) {
    const results = [];
    for (let i = 0; i < repeats; i += 1) {
      const result = await this.executeTestRun(test, multiplyHtml);
      results.push(result);
      if (this._running === false) {
        return results;
      }
    }
    return results;
  }

  async executeTestRun(test, multiplyHtml = 1) {
    await this.setupIframe();

    test.initHtml = test.initHtml || '';
    await this.testInit(test.initHtml);

    const start = performance.now();
    await this.testWrite(test.testHtml, multiplyHtml);

    const end = performance.now();
    const duration = end - start;

    const result = { start, end, duration };
    this.addSingleTestToGraph(result, {
      multiplyHtml,
      trace: test.trace,
      test,
    });

    return result;
  }

  setupIframe() {
    return new Promise((resolve) => {
      this.iframe = document.createElement('iframe');
      this.iframe.addEventListener('load', () => {
        this.iframeWin = this.iframe.contentWindow || this.iframe;
        this.iframeDoc = this.iframe.contentDocument || this.iframeWin.document;
        resolve();
      });
      document.body.appendChild(this.iframe);
    });
  }

  testInit(initHtml) {
    return new Promise((resolve) => {
      this.iframeDoc.open();

      this.iframeDoc.addEventListener('PerformanceTesterInitDone', () => {
        setTimeout(() => {
          resolve();
        }, 0);
      });
      this.iframeDoc.write(`${initHtml}
        <script>
          document.dispatchEvent(new CustomEvent('PerformanceTesterInitDone'));
        </${'script'}>
      `);

      this.iframeDoc.close();
    });
  }

  testWrite(testHtml, multiplyHtml = 1) {
    return new Promise((resolve) => {
      this.iframeDoc.body.innerHTML = testHtml.repeat(multiplyHtml);
      resolve();
    });
  }

  addSingleTestToGraph(result, options) {
    if (typeof Plotly === 'undefined') { return; }
    if (!this.graphSetup) {
      Plotly.newPlot(this.graphNode, [{
        x: [options.multiplyHtml],
        y: [result.duration],
        mode: 'lines+markers',
        type: 'scatter',
        name: options.test.name,
      }], {});
      this.graphSetup = true;
    } else {
      const data = {
        x: [[options.multiplyHtml]],
        y: [[result.duration]],
      };

      if (!this.graphTraceSetup[options.trace]) {
        data.name = options.test.name;
        Plotly.addTraces(this.graphNode, data);
        this.graphTraceSetup[options.trace] = true;
      } else {
        Plotly.extendTraces(this.graphNode, data, [options.trace]);
      }
    }
  }
  //   test.results = {
  //     10: [
  //       {
  //         time: 105,
  //         memory: {}
  //       },
  //       {
  //         time: 95,
  //         memory: {}
  //       }
  //     ]
  //   };
}
