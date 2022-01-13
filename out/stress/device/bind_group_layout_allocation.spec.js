/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/export const description = `
Stress tests for allocation of GPUBindGroupLayout objects through GPUDevice.
`;import { makeTestGroup } from '../../common/framework/test_group.js';
import { GPUTest } from '../../webgpu/gpu_test.js';

export const g = makeTestGroup(GPUTest);

g.test('coexisting').
desc(`Tests allocation of many coexisting GPUBindGroupLayout objects.`).
unimplemented();

g.test('continuous').
desc(
`Tests allocation and implicit GC of many GPUBindGroupLayout objects over time.
Objects are sequentially created and dropped for GC over a very large number of
iterations.`).

unimplemented();
//# sourceMappingURL=bind_group_layout_allocation.spec.js.map