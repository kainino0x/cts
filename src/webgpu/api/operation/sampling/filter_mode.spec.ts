export const description = `
Tests the behavior of different filtering modes in minFilter/magFilter/mipmapFilter.

TODO:
- Test exact sampling results with small tolerance. Tests should differentiate between different
  values for all three filter modes to make sure none are missed or incorrect in implementations.
- (Likely unnecessary with the above.) Test exactly the expected number of samples are used.
  Test this by setting up a rendering and asserting how many different shades result.
`;

import { makeTestGroup } from '../../../../common/framework/test_group.js';
import { assert } from '../../../../common/util/util.js';
import { GPUTest } from '../../../gpu_test.js';

const kRTSize = 16;
const xMiddle = kRTSize / 2; // we check the pixel value in the middle of the render target
const kColorAttachmentFormat = 'bgra8unorm';
const colors = [
  new Uint8Array([0xff, 0x00, 0x00, 0xff]), // miplevel = 0
  new Uint8Array([0x00, 0xff, 0x00, 0xff]), // miplevel = 1
  new Uint8Array([0x00, 0x00, 0xff, 0xff]), // miplevel = 2
];

class SamplerFilterModeSlantedPlaneTest extends GPUTest {
  private pipeline: GPURenderPipeline | undefined;
  async init(): Promise<void> {
    await super.init();

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({
          code: `
            struct Outputs {
              @builtin(position) Position : vec4<f32>,
              @location(0) fragUV : vec2<f32>,
            };

            @vertex fn main(
              @builtin(vertex_index) VertexIndex : u32) -> Outputs {
              var position : array<vec3<f32>, 6> = array<vec3<f32>, 6>(
                vec3<f32>(-0.5, 0.5, -0.5),
                vec3<f32>(0.5, 0.5, -0.5),
                vec3<f32>(-0.5, 0.5, 0.5),
                vec3<f32>(-0.5, 0.5, 0.5),
                vec3<f32>(0.5, 0.5, -0.5),
                vec3<f32>(0.5, 0.5, 0.5));
              // uv is pre-scaled to mimic repeating tiled texture
              var uv : array<vec2<f32>, 6> = array<vec2<f32>, 6>(
                vec2<f32>(0.0, 0.0),
                vec2<f32>(1.0, 0.0),
                vec2<f32>(0.0, 50.0),
                vec2<f32>(0.0, 50.0),
                vec2<f32>(1.0, 0.0),
                vec2<f32>(1.0, 50.0));
              // draw a slanted plane in a specific way
              let matrix : mat4x4<f32> = mat4x4<f32>(
                vec4<f32>(-1.7320507764816284, 1.8322050568049563e-16, -6.176817699518044e-17, -6.170640314703498e-17),
                vec4<f32>(-2.1211504944260596e-16, -1.496108889579773, 0.5043753981590271, 0.5038710236549377),
                vec4<f32>(0.0, -43.63650894165039, -43.232173919677734, -43.18894577026367),
                vec4<f32>(0.0, 21.693578720092773, 21.789791107177734, 21.86800193786621));

              var output : Outputs;
              output.fragUV = uv[VertexIndex];
              output.Position = matrix * vec4<f32>(position[VertexIndex], 1.0);
              return output;
            }
            `,
        }),
        entryPoint: 'main',
      },
      fragment: {
        module: this.device.createShaderModule({
          code: `
            @group(0) @binding(0) var sampler0 : sampler;
            @group(0) @binding(1) var texture0 : texture_2d<f32>;

            @fragment fn main(
              @builtin(position) FragCoord : vec4<f32>,
              @location(0) fragUV: vec2<f32>)
              -> @location(0) vec4<f32> {
                return textureSample(texture0, sampler0, fragUV);
            }
            `,
        }),
        entryPoint: 'main',
        targets: [{ format: kColorAttachmentFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  // return the render target texture object
  drawSlantedPlane(textureView: GPUTextureView, sampler: GPUSampler): GPUTexture {
    // make sure it's already initialized
    assert(this.pipeline !== undefined);

    const bindGroup = this.device.createBindGroup({
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: textureView },
      ],
      layout: this.pipeline.getBindGroupLayout(0),
    });

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.bottom = '0px';
    canvas.style.right = '0px';
    canvas.style.width = '160px';
    canvas.style.height = '160px';
    canvas.style.border = '1px solid red';
    canvas.width = kRTSize;
    canvas.height = kRTSize;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('webgpu')!;
    ctx.configure({
      device: this.device,
      format: kColorAttachmentFormat,
      usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
      alphaMode: 'opaque',
    });
    const colorAttachment = ctx.getCurrentTexture();
    //const colorAttachment = this.device.createTexture({
    //  format: kColorAttachmentFormat,
    //  size: { width: kRTSize, height: kRTSize, depthOrArrayLayers: 1 },
    //  usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
    //});
    const colorAttachmentView = colorAttachment.createView();

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: colorAttachmentView,
          storeOp: 'store',
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
    pass.end();
    this.device.queue.submit([encoder.finish()]);

    return colorAttachment;
  }
}

export const g = makeTestGroup(SamplerFilterModeSlantedPlaneTest);

g.test('mipmapFilter')
  .desc('Test that mipmapFilter affects drawing the slanted plane with different filter modes.')
  .params(u =>
    u //
      .combine('mipmapFilter', ['linear', 'nearest'] as const)
      .combineWithParams([
        {
          _results: [
            { coord: { x: xMiddle, y: 2 }, expected: colors[2] },
            { coord: { x: xMiddle, y: 6 }, expected: [colors[0], colors[1]] },
          ],
        },
      ])
  )
  .fn(async t => {
    const { mipmapFilter } = t.params;

    const texture = t.createTexture2DWithMipmaps(colors);
    const textureView = texture.createView();

    const sampler = t.device.createSampler({
      mipmapFilter,
    });

    const colorAttachment = t.drawSlantedPlane(textureView, sampler);

    for (const entry of t.params._results) {
      if (entry.expected instanceof Uint8Array) {
        // equal exactly one color
        t.expectSinglePixelIn2DTexture(colorAttachment, kColorAttachmentFormat, entry.coord, {
          exp: entry.expected,
        });
      } else {
        // a lerp between two colors
        t.expectSinglePixelBetweenTwoValuesIn2DTexture(
          colorAttachment,
          kColorAttachmentFormat,
          entry.coord,
          {
            exp: entry.expected as [Uint8Array, Uint8Array],
          }
        );
      }
    }
  });
