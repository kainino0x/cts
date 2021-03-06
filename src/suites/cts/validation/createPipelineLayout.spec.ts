export const description = `
createPipelineLayout validation tests.
`;

import { TestGroup, poptions } from '../../../framework/index.js';

import { ValidationTest } from './validation_test.js';

function clone(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayoutDescriptor {
  return JSON.parse(JSON.stringify(descriptor));
}

export const g = new TestGroup(ValidationTest);

g.test('number of dynamic buffers exceeds the maximum value', async t => {
  const { type, maxDynamicBufferCount } = t.params;

  const maxDynamicBufferBindings: GPUBindGroupLayoutBinding[] = [];
  for (let i = 0; i < maxDynamicBufferCount; i++) {
    maxDynamicBufferBindings.push({
      binding: i,
      visibility: GPUShaderStage.COMPUTE,
      type,
      hasDynamicOffset: true,
    });
  }

  const maxDynamicBufferBindGroupLayout = t.device.createBindGroupLayout({
    bindings: maxDynamicBufferBindings,
  });

  const goodDescriptor: GPUBindGroupLayoutDescriptor = {
    bindings: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        type,
        hasDynamicOffset: false,
      },
    ],
  };

  const goodPipelineLayoutDescriptor = {
    bindGroupLayouts: [
      maxDynamicBufferBindGroupLayout,
      t.device.createBindGroupLayout(goodDescriptor),
    ],
  };

  // Control case
  t.device.createPipelineLayout(goodPipelineLayoutDescriptor);

  // Check dynamic buffers exceed maximum in pipeline layout.
  const badDescriptor = clone(goodDescriptor);
  badDescriptor.bindings![0].hasDynamicOffset = true;

  const badPipelineLayoutDescriptor = {
    bindGroupLayouts: [
      maxDynamicBufferBindGroupLayout,
      t.device.createBindGroupLayout(badDescriptor),
    ],
  };

  await t.expectValidationError(() => {
    t.device.createPipelineLayout(badPipelineLayoutDescriptor);
  });
}).params([
  { type: 'storage-buffer', maxDynamicBufferCount: 4 },
  { type: 'uniform-buffer', maxDynamicBufferCount: 8 },
]);

g.test('number of bind group layouts exceeds the maximum value', async t => {
  const { type } = t.params;

  const bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor = {
    bindings: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        type,
      },
    ],
  };

  // 4 is the maximum number of bind group layouts.
  const maxBindGroupLayouts = [1, 2, 3, 4].map(() =>
    t.device.createBindGroupLayout(bindGroupLayoutDescriptor)
  );

  const goodPipelineLayoutDescriptor = {
    bindGroupLayouts: maxBindGroupLayouts,
  };

  // Control case
  t.device.createPipelineLayout(goodPipelineLayoutDescriptor);

  // Check bind group layouts exceed maximum in pipeline layout.
  const badPipelineLayoutDescriptor = {
    bindGroupLayouts: [
      ...maxBindGroupLayouts,
      t.device.createBindGroupLayout(bindGroupLayoutDescriptor),
    ],
  };

  await t.expectValidationError(() => {
    t.device.createPipelineLayout(badPipelineLayoutDescriptor);
  });
}).params(poptions('type', ['storage-buffer', 'uniform-buffer']));
