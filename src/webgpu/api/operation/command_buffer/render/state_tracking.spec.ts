export const description = `
Ensure state is set correctly. Tries to stress state caching (setting different states multiple
times in different orders) for setIndexBuffer and setVertexBuffer.
Equivalent tests for setBindGroup and setPipeline are in programmable/state_tracking.spec.ts.
Equivalent tests for viewport/scissor/blend/reference are in render/dynamic_state.spec.ts

TODO: plan and implement
- Test that drawing after having set vertex buffer slots not used by the pipeline.
- Test that setting / not setting the index buffer does not impact a non-indexed draw.
`;

import { makeTestGroup } from '../../../../../common/framework/test_group.js';
import { GPUTest } from '../../../../gpu_test.js';

class VertexAndIndexStateTrackingTest extends GPUTest {
  GetRenderPipelineForTest(arrayStride: number): GPURenderPipeline {
    return this.device.createRenderPipeline({
      vertex: {
        module: this.device.createShaderModule({
          code: `
        struct Inputs {
          [[location(0)]] vertexPosition : f32;
          [[location(1)]] vertexColor : vec4<f32>;
        };
        struct Outputs {
          [[builtin(position)]] position : vec4<f32>;
          [[location(0)]] color : vec4<f32>;
        };
        [[stage(vertex)]]
        fn main(input : Inputs)-> Outputs {
          var outputs : Outputs;
          outputs.position =
            vec4<f32>(input.vertexPosition, 0.5, 0.0, 1.0);
          outputs.color = input.vertexColor;
          return outputs;
        }`,
        }),
        entryPoint: 'main',
        buffers: [
          {
            arrayStride,
            attributes: [
              {
                format: 'float32',
                offset: 0,
                shaderLocation: 0,
              },
              {
                format: 'unorm8x4',
                offset: 4,
                shaderLocation: 1,
              },
            ],
          },
        ],
      },
      fragment: {
        module: this.device.createShaderModule({
          code: `
        struct Input {
          [[location(0)]] color : vec4<f32>;
        };
        [[stage(fragment)]]
        fn main(input : Input) -> [[location(0)]] vec4<f32> {
          return input.color;
        }`,
        }),
        entryPoint: 'main',
        targets: [{ format: 'rgba8unorm' }],
      },
      primitive: {
        topology: 'point-list',
      },
    });
  }

  kVertexAttributeSize = 8;
}

export const g = makeTestGroup(VertexAndIndexStateTrackingTest);

g.test('set_index_buffer_without_changing_buffer')
  .desc(
    `
  Test that setting index buffer states (index format, offset, size) multiple times in different
  orders still keeps the correctness of each draw call.
`
  )
  .fn(async t => {
    // Initialize the index buffer with 5 uint16 indices (0, 1, 2, 3, 4).
    const indexBuffer = t.makeBufferWithContents(
      new Uint16Array([0, 1, 2, 3, 4]),
      GPUBufferUsage.INDEX
    );

    // Initialize the vertex buffer with required vertex attributes (position: f32, color: f32x4)
    // Note that the maximum index in the test is 0x10000.
    const kVertexAttributesCount = 0x10000 + 1;
    const vertexBuffer = t.device.createBuffer({
      usage: GPUBufferUsage.VERTEX,
      size: t.kVertexAttributeSize * kVertexAttributesCount,
      mappedAtCreation: true,
    });
    t.trackForCleanup(vertexBuffer);
    const vertexAttributes = vertexBuffer.getMappedRange();
    const kPositions = [-0.8, -0.4, 0.0, 0.4, 0.8, -0.4];
    const kColors = [
      new Uint8Array([255, 0, 0, 255]),
      new Uint8Array([255, 255, 255, 255]),
      new Uint8Array([0, 0, 255, 255]),
      new Uint8Array([255, 0, 255, 255]),
      new Uint8Array([0, 255, 255, 255]),
      new Uint8Array([0, 255, 0, 255]),
    ];
    // Set vertex attributes at index {0..4} in Uint16.
    // Note that the vertex attribute at index 1 will not be used.
    for (let i = 0; i < kPositions.length - 1; ++i) {
      const baseOffset = t.kVertexAttributeSize * i;
      const vertexPosition = new Float32Array(vertexAttributes, baseOffset, 1);
      vertexPosition[0] = kPositions[i];
      const vertexColor = new Uint8Array(vertexAttributes, baseOffset + 4, 4);
      vertexColor.set(kColors[i]);
    }
    // Set vertex attributes at index 0x10000.
    const lastOffset = t.kVertexAttributeSize * (kVertexAttributesCount - 1);
    const lastVertexPosition = new Float32Array(vertexAttributes, lastOffset, 1);
    lastVertexPosition[0] = kPositions[kPositions.length - 1];
    const lastVertexColor = new Uint8Array(vertexAttributes, lastOffset + 4, 4);
    lastVertexColor.set(kColors[kColors.length - 1]);

    vertexBuffer.unmap();

    const renderPipeline = t.GetRenderPipelineForTest(t.kVertexAttributeSize);

    const outputTexture = t.device.createTexture({
      format: 'rgba8unorm',
      size: [kPositions.length - 1, 1, 1],
      usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const encoder = t.device.createCommandEncoder();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: outputTexture.createView(),
          loadValue: [0, 0, 0, 1],
          storeOp: 'store',
        },
      ],
    });
    renderPass.setPipeline(renderPipeline);
    renderPass.setVertexBuffer(0, vertexBuffer);

    // 1st draw: indexFormat = 'uint32', offset = 0, size = 4 (index value: 0x10000)
    renderPass.setIndexBuffer(indexBuffer, 'uint32', 0, 4);
    renderPass.drawIndexed(1);

    // 2nd draw: indexFormat = 'uint16', offset = 0, size = 4 (index value: 0)
    renderPass.setIndexBuffer(indexBuffer, 'uint16', 0, 4);
    renderPass.drawIndexed(1);

    // 3rd draw: indexFormat = 'uint16', offset = 4, size = 2 (index value: 2)
    renderPass.setIndexBuffer(indexBuffer, 'uint16', 0, 2);
    renderPass.setIndexBuffer(indexBuffer, 'uint16', 4, 2);
    renderPass.drawIndexed(1);

    // 4th draw: indexformat = 'uint16', offset = 6, size = 4 (index values: 3, 4)
    renderPass.setIndexBuffer(indexBuffer, 'uint16', 6, 2);
    renderPass.setIndexBuffer(indexBuffer, 'uint16', 6, 4);
    renderPass.drawIndexed(2);

    renderPass.endPass();
    t.queue.submit([encoder.finish()]);

    for (let i = 0; i < kPositions.length - 1; ++i) {
      const expectedColor = i === 1 ? kColors[kPositions.length - 1] : kColors[i];
      t.expectSinglePixelIn2DTexture(
        outputTexture,
        'rgba8unorm',
        { x: i, y: 0 },
        { exp: expectedColor }
      );
    }
  });

g.test('set_vertex_buffer_without_changing_buffer')
  .desc(
    `
  Test that setting vertex buffer states (offset, size) multiple times in different orders still
  keeps the correctness of each draw call.
  - Tries several different sequences of setVertexBuffer+draw commands, each of which draws vertices
    in all 4 output pixels, and check they were drawn correctly.
`
  )
  .fn(async t => {
    const kPositions = [-0.875, -0.625, -0.375, -0.125, 0.125, 0.375, 0.625, 0.875];
    const kColors = [
      new Uint8Array([255, 0, 0, 255]),
      new Uint8Array([0, 255, 0, 255]),
      new Uint8Array([0, 0, 255, 255]),
      new Uint8Array([51, 0, 0, 255]),
      new Uint8Array([0, 51, 0, 255]),
      new Uint8Array([0, 0, 51, 255]),
      new Uint8Array([255, 0, 255, 255]),
      new Uint8Array([255, 255, 0, 255]),
    ];

    // Initialize the vertex buffer with required vertex attributes (position: f32, color: f32x4)
    const kVertexAttributesCount = 8;
    const vertexBuffer = t.device.createBuffer({
      usage: GPUBufferUsage.VERTEX,
      size: t.kVertexAttributeSize * kVertexAttributesCount,
      mappedAtCreation: true,
    });
    t.trackForCleanup(vertexBuffer);
    const vertexAttributes = vertexBuffer.getMappedRange();
    for (let i = 0; i < kPositions.length; ++i) {
      const baseOffset = t.kVertexAttributeSize * i;
      const vertexPosition = new Float32Array(vertexAttributes, baseOffset, 1);
      vertexPosition[0] = kPositions[i];
      const vertexColor = new Uint8Array(vertexAttributes, baseOffset + 4, 4);
      vertexColor.set(kColors[i]);
    }

    vertexBuffer.unmap();

    const renderPipeline = t.GetRenderPipelineForTest(t.kVertexAttributeSize);

    const outputTexture = t.device.createTexture({
      format: 'rgba8unorm',
      size: [kPositions.length, 1, 1],
      usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const encoder = t.device.createCommandEncoder();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: outputTexture.createView(),
          loadValue: [0, 0, 0, 1],
          storeOp: 'store',
        },
      ],
    });
    renderPass.setPipeline(renderPipeline);

    // Change 'size' in setVertexBuffer()
    renderPass.setVertexBuffer(0, vertexBuffer, 0, t.kVertexAttributeSize);
    renderPass.setVertexBuffer(0, vertexBuffer, 0, t.kVertexAttributeSize * 2);
    renderPass.draw(2);

    // Change 'offset' in setVertexBuffer()
    renderPass.setVertexBuffer(
      0,
      vertexBuffer,
      t.kVertexAttributeSize * 2,
      t.kVertexAttributeSize * 2
    );
    renderPass.draw(2);

    // Change 'size' again in setVertexBuffer()
    renderPass.setVertexBuffer(
      0,
      vertexBuffer,
      t.kVertexAttributeSize * 4,
      t.kVertexAttributeSize * 2
    );
    renderPass.setVertexBuffer(
      0,
      vertexBuffer,
      t.kVertexAttributeSize * 4,
      t.kVertexAttributeSize * 4
    );
    renderPass.draw(4);

    renderPass.endPass();
    t.queue.submit([encoder.finish()]);

    for (let i = 0; i < kPositions.length; ++i) {
      t.expectSinglePixelIn2DTexture(
        outputTexture,
        'rgba8unorm',
        { x: i, y: 0 },
        { exp: kColors[i] }
      );
    }
  });

g.test('change_pipeline_before_and_after_vertex_buffer')
  .desc(
    `
  Test that changing the pipeline {before,after} the vertex buffers still keeps the correctness of
  each draw call (In D3D12, the vertex buffer stride is part of SetVertexBuffer instead of the
  pipeline.)
`
  )
  .fn(async t => {
    const kPositions = [-0.8, -0.4, 0.0, 0.4, 0.8, 0.9];
    const kColors = [
      new Uint8Array([255, 0, 0, 255]),
      new Uint8Array([255, 255, 255, 255]),
      new Uint8Array([0, 255, 0, 255]),
      new Uint8Array([0, 0, 255, 255]),
      new Uint8Array([255, 0, 255, 255]),
      new Uint8Array([0, 255, 255, 255]),
    ];

    // Initialize the vertex buffer with required vertex attributes (position: f32, color: f32x4)
    const vertexBuffer = t.device.createBuffer({
      usage: GPUBufferUsage.VERTEX,
      size: t.kVertexAttributeSize * kPositions.length,
      mappedAtCreation: true,
    });
    t.trackForCleanup(vertexBuffer);
    // Note that kPositions[1], kColors[1], kPositions[5] and kColors[5] are not used.
    const vertexAttributes = vertexBuffer.getMappedRange();
    for (let i = 0; i < kPositions.length; ++i) {
      const baseOffset = t.kVertexAttributeSize * i;
      const vertexPosition = new Float32Array(vertexAttributes, baseOffset, 1);
      vertexPosition[0] = kPositions[i];
      const vertexColor = new Uint8Array(vertexAttributes, baseOffset + 4, 4);
      vertexColor.set(kColors[i]);
    }
    vertexBuffer.unmap();

    // Create two render pipelines with different vertex attribute strides
    const renderPipeline1 = t.GetRenderPipelineForTest(t.kVertexAttributeSize);
    const renderPipeline2 = t.GetRenderPipelineForTest(t.kVertexAttributeSize * 2);

    const kPointsCount = kPositions.length - 1;
    const outputTexture = t.device.createTexture({
      format: 'rgba8unorm',
      size: [kPointsCount, 1, 1],
      usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const encoder = t.device.createCommandEncoder();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: outputTexture.createView(),
          loadValue: [0, 0, 0, 1],
          storeOp: 'store',
        },
      ],
    });

    // Update render pipeline before setVertexBuffer. The applied vertex attribute stride should be
    // 2 * kVertexAttributeSize.
    renderPass.setPipeline(renderPipeline1);
    renderPass.setPipeline(renderPipeline2);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.draw(2);

    // Update render pipeline after setVertexBuffer. The applied vertex attribute stride should be
    // kVertexAttributeSize.
    renderPass.setVertexBuffer(0, vertexBuffer, 3 * t.kVertexAttributeSize);
    renderPass.setPipeline(renderPipeline1);
    renderPass.draw(2);

    renderPass.endPass();

    t.queue.submit([encoder.finish()]);

    for (let i = 0; i < kPointsCount; ++i) {
      const expectedColor = i === 1 ? new Uint8Array([0, 0, 0, 255]) : kColors[i];
      t.expectSinglePixelIn2DTexture(
        outputTexture,
        'rgba8unorm',
        { x: i, y: 0 },
        { exp: expectedColor }
      );
    }
  });
