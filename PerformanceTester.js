class PerformanceTester {
  static timeout(time) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }

  constructor(rootNode) {
    this.running = false;
    this.tests = [];
    rootNode.innerHTML = `
      <h1>Tester</h1>
      <button id="start">start</button>
      <button id="stop">stop</button>
      <div id="graph"></div>
    `;

    this.startButton = rootNode.querySelector('#start');
    this.startButton.addEventListener('click', () => {
      this.start();
    });
    this.stopButton = rootNode.querySelector('#stop');
    this.stopButton.addEventListener('click', () => {
      this.stop();
    });
    this.graphNode = rootNode.querySelector('#graph');

    this.graphSetup = false;
    this.graphTraceSetup = { 0: true };
  }

  addSingleTestToGraph(result, options) {
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
      let data = {
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

  add(test) {
    // if (!data.sequence) {
    //   this.sequence = ['3x1', '3x3', '3x5'];
    // }
    test.trace = this.tests.length;
    // test.runs = [
    //   { repeats: 2, multiplyHtml: 10, },
    //   { repeats: 2, multiplyHtml: 20, }
    // ];
    this.tests.push(test);
  }

  start() {
    this.running = true;
    this.executeSuite();
  }

  stop() {
    this.running = false;
  }

  setupIframe() {
    this.iframe = document.createElement('iframe');
    document.body.appendChild(this.iframe);

    return new Promise((resolve) => {
      this.iframe.addEventListener('load', () => {
        this.iframeWin = this.iframe.contentWindow || this.iframe;
        this.iframeDoc = this.iframe.contentDocument || this.iframeWin.document;
        resolve();
      });
    });
  }
  
  async executeSuite() {
    this.patchRuns = [
      { repeats: 2, multiplyHtml: 10, },
      { repeats: 2, multiplyHtml: 20, }
    ];

    for (let i = 0; i < this.tests.length; i += 1) {
      this.tests[i].results = await this.executePatch(this.tests[i], this.patchRuns);
      console.log(this.tests[i].results);
    }
  }

  async executePatch(test, runs) {
    const results = {};
    for (let i = 0; i < runs.length; i += 1) {
      let result = await this.executeTest(test, runs[i]);
      results[runs[i].multiplyHtml] = result;
    }
    return results;
  }

  async executeTest(test, options) {
    const results = [];
    for (let i = 0; i < options.repeats; i += 1) {
      let result = await this.executeSingleTest(test, options);
      results.push(result);
      if (this.running === false) {
        return results;
      }
    }
    return results;
  }

  async executeSingleTest(test, options) {
    await this.setupIframe();
    
    this.iframeDoc.open();
    this.iframeDoc.write(test.initHtml);

    await this.constructor.timeout(100);

    let start = performance.now();

    this.iframeDoc.write(test.testHtml.repeat(options.multiplyHtml));

    let end = performance.now();
    let duration = end - start;
    // console.log(test.duration);

    this.iframeDoc.close();

    let result = { start, end, duration };
    this.addSingleTestToGraph(result, { 
      multiplyHtml: options.multiplyHtml, 
      trace: test.trace,
      test
    });

    return result;
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