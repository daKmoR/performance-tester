class WcPerformanceTester extends PerformanceTester {
  add(test) {
    test.initHtml += `
      <link rel="import" href="./performance-end.html">
    `;
    super.add(test);
  }

  testInit(test, options) {
    return new Promise((resolve) => {
      this.iframeDoc.open();

      this.iframeDoc.addEventListener('WebComponentsReady', function() {
        resolve();
      });
      this.iframeDoc.write(test.initHtml);

      this.iframeDoc.close();
    });
  }

  testWrite(test, options) {
    return new Promise((resolve) => {
      this.iframeDoc.addEventListener('PerformanceTesterEnd', function() {
        resolve();
      });

      this.iframeDoc.body.innerHTML = test.testHtml.repeat(options.multiplyHtml) + `
        <performance-end></performance-end>
      `;
    });
  }
}
