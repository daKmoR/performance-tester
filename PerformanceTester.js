/* global Plotly */

/* We do not want to parallize test as this would distort the timing results */
/* eslint-disable no-await-in-loop */

class Stats {
  static standardDeviation(values) {
    const avg = this.average(values);
    const squareDiffs = values.map((value) => {
      const diff = value - avg;
      return diff * diff;
    });
    const avgSquareDiff = this.average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  static sum(data) {
    return data.reduce((total, num) => total + num);
  }

  static average(data) {
    return this.sum(data) / data.length;
  }

  static median(data) {
    const { length } = data;
    data.sort();
    if (length % 2 === 0) { // is even
      return (data[(length / 2) - 1] + data[length / 2]) / 2;
    }
    return data[(length - 1) / 2];
  }
}

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
    this.setOptions(options, {
      sequence: '1-10;11-20[2,5];20-100[1,30]',
      rootUrl: '../node_modules/@d4kmor/performance-tester',
      tests: [],
      includeInitTime: false,
    });
    this._running = null;

    if (this.rootNode) {
      this.rootNode.innerHTML = `
        <h1>Tester</h1>
        <button id="start">start</button>
        <button id="stop">stop</button>
        <div id="summery"></div>
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

      this.summeryNode = this.rootNode.querySelector('#summery');

      this.graphNode = this.rootNode.querySelector('#graph');

      this.graphSetup = false;
      this.graphTraceSetup = { 0: true };
    }
  }

  setOptions(options, defaults) {
    const optionsWithDefaults = Object.assign({}, defaults, options);
    this._running = null;

    Object.assign(this, optionsWithDefaults);
  }

  add(test) {
    const testToAdd = test;
    testToAdd.trace = testToAdd.trace || this.tests.length;
    this.tests.push(testToAdd);
    this._onTestsChanged();
  }

  _onTestsChanged() {
    this.showSummary();
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
      this.tests[i].rawResults = await this.executeTest(this.tests[i], this.patchRuns);
    }
    this.tests = this.constructor.calculateResults(this.tests);
    this.showSummary();
  }

  showSummary() {
    if (this.summeryNode) {
      this.constructor.renderSummary(this.summeryNode, this.tests);
    }
  }

  static renderSummary(node, tests) {
    // eslint-disable-next-line no-param-reassign
    node.innerHTML = `
      <table>
        <tr>
          <th>Test Name</th>
          <th>Percentage Time</th>
          <th>Median</th>
          <th>Average</th>
          <th>Standard Deviation</th>
        </tr>
        ${tests.map(test => `
          <tr>
            <td>${test.name}</td>
            <td>${test.result ? `${test.result.timePercentage.toFixed(2)}%` : '-'}</td>
            <td>${test.result ? `${test.result.timeMedian.toFixed(2)}ms` : '-'}</td>
            <td>${test.result ? `${test.result.timeAvg.toFixed(2)}ms` : '-'}</td>
            <td>${test.result ? `${test.result.timeStandardDeviation.toFixed(2)}` : '-'}</td>
          </tr>
        `).join('')}
      </table>
    `;
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
    this._currentRawResults = null;
    for (let i = 0; i < repeats; i += 1) {
      const result = await this.executeTestRun(test, multiplyHtml);
      results.push(result);
      this._currentRawResults = results;
      if (this._running === false) {
        return results;
      }
    }
    return results;
  }

  async executeTestRun(test, multiplyHtml = 1) {
    await this.setupIframe();

    let start;
    if (this.includeInitTime === true) {
      start = performance.now();
    }

    test.initHtml = test.initHtml || ''; // eslint-disable-line no-param-reassign
    await this.testInit(test.initHtml);

    if (this.includeInitTime === false) {
      start = performance.now();
    }

    await this.testWrite(test.testHtml, multiplyHtml);

    const end = performance.now();
    const duration = end - start;

    const result = { start, end, duration };
    this.addSingleTestToGraph(result, {
      multiplyHtml,
      trace: test.trace,
      test,
    });

    // bugs out webcomponents polyfill in IE11
    // this.removeIframe();

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

  removeIframe() {
    document.body.removeChild(this.iframe);
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
          var event = document.createEvent('Event');
          event.initEvent('PerformanceTesterInitDone', true, true);
          document.dispatchEvent(event);
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
    if (this.sequence.indexOf('-') === -1) {
      const graphY = this._currentRawResults ? this._currentRawResults.length + 1 : 1;
      this.graphAddNewPoint(options.trace, graphY, result.duration, options.test.name);
    } else {
      this.graphAddNewPoint(
        options.trace,
        options.multiplyHtml,
        result.duration,
        options.test.name,
      );
    }
  }

  graphAddNewPoint(trace, x, y, name = '') {
    if (typeof Plotly === 'undefined') { return; }
    if (!this.graphSetup) {
      Plotly.newPlot(this.graphNode, [{
        x: [x],
        y: [y],
        mode: 'lines+markers',
        type: 'scatter',
        name,
      }], {});
      this.graphSetup = true;
    } else if (!this.graphTraceSetup[trace]) {
      Plotly.addTraces(this.graphNode, {
        x: [x],
        y: [y],
        mode: 'lines+markers',
        type: 'scatter',
        name,
      });
      this.graphTraceSetup[trace] = true;
    } else {
      Plotly.extendTraces(this.graphNode, {
        x: [[x]],
        y: [[y]],
      }, [trace]);
    }
  }

  static calculateResult(test) {
    const instanceData = [];
    const rawData = [];

    Object.keys(test.rawResults).forEach((instances) => {
      const rawResults = test.rawResults[instances];
      rawResults.forEach((rawResult) => {
        instanceData.push(rawResult.duration / instances);
        rawData.push(rawResult.duration);
      });
    });

    return {
      count: rawData.length,
      timeSum: Stats.sum(instanceData),
      timeAvg: Stats.average(instanceData),
      timeMedian: Stats.median(instanceData),
      timeStandardDeviation: Stats.standardDeviation(instanceData),
    };
  }

  static calculateResults(tests) {
    const testsWithResults = tests;
    let referenceMedian = null;
    tests.forEach((test, index) => {
      testsWithResults[index].result = this.calculateResult(test);
      if (test.referenceElement) {
        if (referenceMedian !== null) {
          throw new Error('There can only be one test with .referenceElement = true!');
        }
        referenceMedian = testsWithResults[index].result.timeMedian;
      }
    });

    testsWithResults.sort((a, b) => a.result.timeMedian - b.result.timeMedian);
    referenceMedian = referenceMedian || testsWithResults[0].result.timeMedian;

    testsWithResults.forEach((test, index) => {
      const timePercentage = (100 / referenceMedian) * test.result.timeMedian;
      testsWithResults[index].result.timePercentage = timePercentage;
    });

    return testsWithResults;
  }
}
