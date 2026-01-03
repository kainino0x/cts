/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/import { Logger } from '../common/internal/logging/logger.js';import { TestQuerySingleCase } from '../common/internal/query/query.js';
import { objectEquals } from '../common/util/util.js';

import { UnitTest } from './unit_test.js';

export class TestGroupTest extends UnitTest {
  async run(g) {
    const logger = new Logger({ overrideDebugMode: true });
    for (const t of g.iterate()) {
      for (const rc of t.iterate(null)) {
        const query = new TestQuerySingleCase('xx', ['yy'], rc.id.test, rc.id.params);
        const [rec] = logger.record(query.toString());
        await rc.run(rec, query, []);
      }
    }
    return logger.results;
  }

  expectCases(g, cases) {
    const gcases = [];
    for (const t of g.iterate()) {
      gcases.push(...Array.from(t.iterate(null), (c) => c.id));
    }
    this.expect(
      objectEquals(gcases, cases),
      `expected
  ${JSON.stringify(cases)}
got
  ${JSON.stringify(gcases)}`
    );
  }
}
//# sourceMappingURL=test_group_test.js.map