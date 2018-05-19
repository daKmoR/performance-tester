class WcPerformanceTester extends PerformanceTester {
  add(test) {
    test.initHtml += `
      <link rel="import" href="${this.rootUrl}/performance-end.html">
    `;
    super.add(test);
  }

  testInit(initHtml) {
    return new Promise((resolve) => {
      this.iframeDoc.open();

      this.iframeDoc.addEventListener('WebComponentsReady', function() {
        resolve();
      });
      this.iframeDoc.write(initHtml);

      this.iframeDoc.close();
    });
  }

  testWrite(testHtml, multiplyHtml) {
    return new Promise((resolve) => {
      this.iframeDoc.addEventListener('PerformanceTesterEnd', function() {
        resolve();
      });

      this.iframeDoc.body.innerHTML = testHtml.repeat(multiplyHtml) + `
        <performance-end></performance-end>
      `;
    });
  }
}
