/**
 * AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
 **/ import { unreachable } from '../../../../../common/util/util.js';
import { GPUTest } from '../../../../gpu_test.js';

export class ProgrammableStateTest extends GPUTest {
  encoder = null;

  get bindGroupLayout() {
    if (!this.commonBindGroupLayout) {
      this.commonBindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
            buffer: { type: 'storage' },
          },
        ],
      });
    }
    return this.commonBindGroupLayout;
  }

  createBindGroup(buffer) {
    return this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer } }],
    });
  }

  // Create a compute pipeline that performs an operation on data from two bind groups,
  // then writes the result to a third bind group.
  createBindingStatePipeline(encoderType, groups, algorithm = 'a.value - b.value') {
    switch (encoderType) {
      case 'compute pass': {
        const wgsl = `struct Data {
            value : i32;
          };

          [[group(${groups.a}), binding(0)]] var<storage> a : Data;
          [[group(${groups.b}), binding(0)]] var<storage> b : Data;
          [[group(${groups.out}), binding(0)]] var<storage, read_write> out : Data;

          [[stage(compute), workgroup_size(1)]] fn main() {
            out.value = ${algorithm};
            return;
          }
        `;

        return this.device.createComputePipeline({
          layout: this.device.createPipelineLayout({
            bindGroupLayouts: [this.bindGroupLayout, this.bindGroupLayout, this.bindGroupLayout],
          }),

          compute: {
            module: this.device.createShaderModule({
              code: wgsl,
            }),

            entryPoint: 'main',
          },
        });
      }
      case 'render pass':
      case 'render bundle': {
        const wgslShaders = {
          vertex: `
            [[stage(vertex)]] fn vert_main() -> [[builtin(position)]] vec4<f32> {
              return vec4<f32>(0.5, 0.5, 0.0, 1.0);
            }
          `,

          fragment: `
            struct Data {
              value : i32;
            };

            [[group(${groups.a}), binding(0)]] var<storage> a : Data;
            [[group(${groups.b}), binding(0)]] var<storage> b : Data;
            [[group(${groups.out}), binding(0)]] var<storage, read_write> out : Data;

            [[stage(fragment)]] fn frag_main() -> [[location(0)]] vec4<f32> {
              out.value = ${algorithm};
              return vec4<f32>(1.0, 0.0, 0.0, 1.0);
            }
          `,
        };

        return this.device.createRenderPipeline({
          layout: this.device.createPipelineLayout({
            bindGroupLayouts: [this.bindGroupLayout, this.bindGroupLayout, this.bindGroupLayout],
          }),

          vertex: {
            module: this.device.createShaderModule({
              code: wgslShaders.vertex,
            }),

            entryPoint: 'vert_main',
          },

          fragment: {
            module: this.device.createShaderModule({
              code: wgslShaders.fragment,
            }),

            entryPoint: 'frag_main',
            targets: [{ format: 'rgba8unorm' }],
          },

          primitive: { topology: 'point-list' },
        });
      }
      default:
        unreachable();
    }
  }

  setPipeline(pass, pipeline) {
    if (pass instanceof GPUComputePassEncoder) {
      pass.setPipeline(pipeline);
    } else if (pass instanceof GPURenderPassEncoder || pass instanceof GPURenderBundleEncoder) {
      pass.setPipeline(pipeline);
    }
  }

  dispatchOrDraw(pass) {
    if (pass instanceof GPUComputePassEncoder) {
      pass.dispatch(1);
    } else if (pass instanceof GPURenderPassEncoder) {
      pass.draw(1);
    } else if (pass instanceof GPURenderBundleEncoder) {
      pass.draw(1);
    }
  }
}
