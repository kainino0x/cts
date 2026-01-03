/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/export const description = `
Test for shader uniformity code snippet generation.
`;import { makeTestGroup } from '../common/framework/test_group.js';
import { specToCode } from '../webgpu/shader/validation/uniformity/snippet.js';

import { UnitTest } from './unit_test.js';

class F extends UnitTest {
  test(spec, expect) {
    const got = specToCode(spec);
    this.expect(
      expect === got,
      `
expected: ${expect}
got:      ${got}`
    );
  }
}

export const g = makeTestGroup(F);

g.test('strings').fn((t) => {
  t.test(
    'loop-end',
    `  loop {
  }
`
  ),
  t.test(
    'loop-cond-break-op',
    `  loop {
    if <cond> {break;}
    <op>
  }
`
  ),
  t.test(
    'for-unif-always-return-op',
    `  for (;<uniform_cond>;) {
    return;
    <op>
  }
`
  ),
  t.test(
    'loop-op-continuing-cond-break',
    `  loop {
    <op>
    continuing {
      break if <cond>;
    }
  }
`
  ),
  t.test(
    // This is the case suggested in https://github.com/gpuweb/cts/pull/4477#issuecomment-3408419425
    'loop-always-return-continuing-cond-break-end-op',
    `  loop {
    return;
    continuing {
      break if <cond>;
    }
  }
  <op>
`
  );
});
//# sourceMappingURL=uniformity_snippet.spec.js.map