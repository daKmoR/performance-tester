import PerformanceTester from './PerformanceTester.js';

export default class WcPerformanceTester extends PerformanceTester {
  constructor(options) {
    super(options);
    this.setOptions(options, {
      useDefaultReferenceElement: true,
    });
    if (this.useDefaultReferenceElement) {
      this.addDefaultReferenceElement();
    }
  }

  addDefaultReferenceElement() {
    this.add({
      name: 'Reference Element',
      referenceElement: true,
      initHtml: `
        <script src="../node_modules/@webcomponents/webcomponentsjs/webcomponents-lite.js"></${'script'}>
        <link rel="import" href="../reference-element.html">
      `,
      testHtml: `
        <reference-element></reference-element>
      `,
    });
  }

  removeReferenceElement() {
    this.tests.shift();
  }

  add(test) {
    const testToAdd = test;
    testToAdd.trace = testToAdd.trace || this.tests.length;
    testToAdd.initHtml += `
      <link rel="import" href="${this.rootUrl}/performance-end.html">
    `;
    if (test.referenceElement) {
      if (this.tests[0] && this.tests[0].referenceElement) {
        testToAdd.trace = this.tests[0].trace;
        this.tests.shift();
        this.tests.unshift(testToAdd);
      } else {
        testToAdd.trace = testToAdd.trace || this.tests.length;
        this.tests.unshift(testToAdd);
      }
    } else {
      this.tests.push(testToAdd);
    }
    this._onTestsChanged();
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
