import PerformanceTester from './PerformanceTester.js';

export default class WcPerformanceTester extends PerformanceTester {
  add(test) {
    const testToAdd = test;
    testToAdd.initHtml += `
      <link rel="import" href="${this.rootUrl}/performance-end.html">
    `;
    super.add(testToAdd);
  }

  testInit(initHtml) {
    return new Promise((resolve) => {
      this.iframeDoc.open();

      this.iframeDoc.addEventListener('WebComponentsReady', () => {
        resolve();
      });
      this.iframeDoc.write(initHtml);

      this.iframeDoc.close();
    });
  }

  testWrite(testHtml, multiplyHtml) {
    return new Promise((resolve) => {
      this.iframeDoc.addEventListener('PerformanceTesterEnd', () => {
        resolve();
      });

      this.iframeDoc.body.innerHTML = `${testHtml.repeat(multiplyHtml)}
        <performance-end></performance-end>
      `;
    });
  }
}
