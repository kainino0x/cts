/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/

import { paramsEquals } from '../../framework/index.js';
import { Logger } from '../../framework/logger.js';
import { UnitTest } from './unit_test.js';
export class TestGroupTest extends UnitTest {
  async run(g) {
    const [rec, res] = new Logger().record({
      suite: '',
      path: ''
    });
    await Promise.all(Array.from(g.iterate(rec)).map(test => test.run()));
    return res;
  }

  enumerate(g) {
    const cases = [];
    const [rec] = new Logger().record({
      suite: '',
      path: ''
    });

    for (const test of g.iterate(rec)) {
      cases.push(test.id);
    }

    return cases;
  }

  expectCases(g, cases) {
    const gcases = this.enumerate(g);

    if (this.expect(gcases.length === cases.length)) {
      for (let i = 0; i < cases.length; ++i) {
        this.expect(gcases[i].test === cases[i].test);
        this.expect(paramsEquals(gcases[i].params, cases[i].params));
      }
    }
  }

}
//# sourceMappingURL=test_group_test.js.map