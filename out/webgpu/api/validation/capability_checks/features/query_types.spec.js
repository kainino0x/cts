/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/export const description = `
Tests for capability checking for features enabling optional query types.

TODO: pipeline statistics queries are removed from core; consider moving tests to another suite.
`;import { makeTestGroup } from '../../../../../common/framework/test_group.js';
import { ValidationTest } from '../../validation_test.js';

export const g = makeTestGroup(ValidationTest);

g.test('createQuerySet').
desc(
`
Tests that creating query set shouldn't be valid without the required feature enabled.
- createQuerySet
  - type {occlusion, pipeline-statistics, timestamp}
  - x= {pipeline statistics, timestamp} query {enable, disable}

TODO: This test should expect *synchronous* exceptions, not validation errors, per
<https://github.com/gpuweb/gpuweb/blob/main/design/ErrorConventions.md>.
As of this writing, the spec needs to be fixed as well.
  `).

params((u) =>
u.
combine('type', ['occlusion', 'pipeline-statistics', 'timestamp']).
combine('pipelineStatisticsQueryEnable', [false, true]).
combine('timestampQueryEnable', [false, true])).

fn(async t => {
  const { type, pipelineStatisticsQueryEnable, timestampQueryEnable } = t.params;

  const requiredFeatures = [];
  if (pipelineStatisticsQueryEnable) {
    requiredFeatures.push('pipeline-statistics-query');
  }
  if (timestampQueryEnable) {
    requiredFeatures.push('timestamp-query');
  }

  await t.selectDeviceOrSkipTestCase({ requiredFeatures });

  const count = 1;
  const pipelineStatistics =
  type === 'pipeline-statistics' ? ['clipper-invocations'] : [];
  const shouldError =
  type === 'pipeline-statistics' && !pipelineStatisticsQueryEnable ||
  type === 'timestamp' && !timestampQueryEnable;

  t.expectValidationError(() => {
    t.device.createQuerySet({ type, count, pipelineStatistics });
  }, shouldError);
});
//# sourceMappingURL=query_types.spec.js.map