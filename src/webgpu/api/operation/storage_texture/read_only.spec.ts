export const description = `
Tests for the behavior of read-only storage textures.

TODO:
- Test the use of read-only storage textures in vertex and fragment shaders
- Test 1D and 3D textures
- Test mipmap level > 0
- Test bgra8unorm with 'bgra8unorm-storage'
- Test resource usage transitions with read-only storage textures
`;

import { makeTestGroup } from '../../../../common/framework/test_group.js';
import { unreachable, assert } from '../../../../common/util/util.js';
import { Float16Array } from '../../../../external/petamoriken/float16/float16.js';
import {
  ColorTextureFormat,
  kColorTextureFormats,
  kTextureFormatInfo,
} from '../../../format_info.js';
import { GPUTest } from '../../../gpu_test.js';

function ComponentCount(format: ColorTextureFormat): number {
  switch (format) {
    case 'r32float':
    case 'r32sint':
    case 'r32uint':
      return 1;
    case 'rg32float':
    case 'rg32sint':
    case 'rg32uint':
      return 2;
    case 'rgba32float':
    case 'rgba32sint':
    case 'rgba32uint':
    case 'rgba8sint':
    case 'rgba8uint':
    case 'rgba8snorm':
    case 'rgba8unorm':
    case 'rgba16float':
    case 'rgba16sint':
    case 'rgba16uint':
      return 4;
    default:
      unreachable();
      return 0;
  }
}

class F extends GPUTest {
  InitTextureAndGetExpectedOutputBufferData(
    storageTexture: GPUTexture,
    format: ColorTextureFormat
  ): ArrayBuffer {
    const bytesPerBlock = kTextureFormatInfo[format].color.bytes;
    assert(bytesPerBlock !== undefined);

    const width = storageTexture.width;
    const height = storageTexture.height;
    const depthOrArrayLayers = storageTexture.depthOrArrayLayers;

    const texelData = new ArrayBuffer(bytesPerBlock * width * height * depthOrArrayLayers);
    const texelTypedDataView = this.GetTypedArrayBufferViewForTexelData(texelData, format);
    const componentCount = ComponentCount(format);
    const outputBufferData = new ArrayBuffer(4 * 4 * width * height * depthOrArrayLayers);
    const outputBufferTypedData = this.GetTypedArrayBufferForOutputBufferData(
      outputBufferData,
      format
    );

    const SetData = (
      texelValue: number,
      outputValue: number,
      texelDataIndex: number,
      component: number
    ) => {
      const texelComponentIndex = texelDataIndex * componentCount + component;
      texelTypedDataView[texelComponentIndex] = texelValue;
      const outputTexelComponentIndex = texelDataIndex * 4 + component;
      outputBufferTypedData[outputTexelComponentIndex] = outputValue;
    };
    for (let z = 0; z < depthOrArrayLayers; ++z) {
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          const texelDataIndex = z * width * height + y * width + x;
          outputBufferTypedData[4 * texelDataIndex] = 0;
          outputBufferTypedData[4 * texelDataIndex + 1] = 0;
          outputBufferTypedData[4 * texelDataIndex + 2] = 0;
          outputBufferTypedData[4 * texelDataIndex + 3] = 1;
          for (let component = 0; component < componentCount; ++component) {
            switch (format) {
              case 'r32uint':
              case 'rg32uint':
              case 'rgba16uint':
              case 'rgba32uint': {
                const texelValue = 4 * texelDataIndex + component + 1;
                SetData(texelValue, texelValue, texelDataIndex, component);
                break;
              }
              case 'rgba8uint': {
                const texelValue = (4 * texelDataIndex + component + 1) % 256;
                SetData(texelValue, texelValue, texelDataIndex, component);
                break;
              }
              case 'rgba8unorm': {
                const texelValue = (4 * texelDataIndex + component + 1) % 256;
                const outputValue = texelValue / 255.0;
                SetData(texelValue, outputValue, texelDataIndex, component);
                break;
              }
              case 'r32sint':
              case 'rg32sint':
              case 'rgba16sint':
              case 'rgba32sint': {
                const texelValue =
                  (texelDataIndex & 1 ? 1 : -1) * (4 * texelDataIndex + component + 1);
                SetData(texelValue, texelValue, texelDataIndex, component);
                break;
              }
              case 'rgba8sint': {
                const texelValue = ((4 * texelDataIndex + component + 1) % 256) - 128;
                SetData(texelValue, texelValue, texelDataIndex, component);
                break;
              }
              case 'rgba8snorm': {
                const texelValue = ((4 * texelDataIndex + component + 1) % 256) - 128;
                const outputValue = Math.max(texelValue / 127.0, -1.0);
                SetData(texelValue, outputValue, texelDataIndex, component);
                break;
              }
              case 'r32float':
              case 'rg32float':
              case 'rgba32float': {
                const texelValue = (4 * texelDataIndex + component + 1) / 10.0;
                SetData(texelValue, texelValue, texelDataIndex, component);
                break;
              }
              case 'rgba16float': {
                const texelValue = (4 * texelDataIndex + component + 1) / 10.0;
                const f16Array = new Float16Array(1);
                f16Array[0] = texelValue;
                SetData(texelValue, f16Array[0], texelDataIndex, component);
                break;
              }
              default:
                unreachable();
                break;
            }
          }
        }
      }
    }
    this.queue.writeTexture(
      {
        texture: storageTexture,
      },
      texelData,
      {
        bytesPerRow: bytesPerBlock * width,
        rowsPerImage: height,
      },
      [width, height, depthOrArrayLayers]
    );

    return outputBufferData;
  }

  GetTypedArrayBufferForOutputBufferData(arrayBuffer: ArrayBuffer, format: ColorTextureFormat) {
    switch (kTextureFormatInfo[format].color.type) {
      case 'uint':
        return new Uint32Array(arrayBuffer);
      case 'sint':
        return new Int32Array(arrayBuffer);
      case 'float':
      case 'unfilterable-float':
        return new Float32Array(arrayBuffer);
    }
  }

  GetTypedArrayBufferViewForTexelData(arrayBuffer: ArrayBuffer, format: ColorTextureFormat) {
    switch (format) {
      case 'r32uint':
      case 'rg32uint':
      case 'rgba32uint':
        return new Uint32Array(arrayBuffer);
      case 'rgba8uint':
      case 'rgba8unorm':
        return new Uint8Array(arrayBuffer);
      case 'rgba16uint':
        return new Uint16Array(arrayBuffer);
      case 'r32sint':
      case 'rg32sint':
      case 'rgba32sint':
        return new Int32Array(arrayBuffer);
      case 'rgba8sint':
      case 'rgba8snorm':
        return new Int8Array(arrayBuffer);
      case 'rgba16sint':
        return new Int16Array(arrayBuffer);
      case 'r32float':
      case 'rg32float':
      case 'rgba32float':
        return new Float32Array(arrayBuffer);
      case 'rgba16float':
        return new Float16Array(arrayBuffer);
      default:
        unreachable();
        return new Uint8Array(arrayBuffer);
    }
  }

  GetOutputBufferWGSLType(format: ColorTextureFormat) {
    switch (kTextureFormatInfo[format].color.type) {
      case 'uint':
        return 'vec4u';
      case 'sint':
        return 'vec4i';
      case 'float':
      case 'unfilterable-float':
        return 'vec4f';
      default:
        unreachable();
        return '';
    }
  }

  DoTransform(storageTexture: GPUTexture, format: ColorTextureFormat, outputBuffer: GPUBuffer) {
    const declaration =
      storageTexture.depthOrArrayLayers > 1 ? 'texture_storage_2d_array' : 'texture_storage_2d';
    const textureDeclaration = `
    @group(0) @binding(0) var readOnlyTexture: ${declaration}<${format}, read>;
    `;

    const textureLoadCoord =
      storageTexture.depthOrArrayLayers > 1
        ? `vec2u(invocationID.x, invocationID.y), invocationID.z`
        : `vec2u(invocationID.x, invocationID.y)`;
    const computeShader = `
    ${textureDeclaration}
    @group(0) @binding(1)
    var<storage,read_write> outputBuffer : array<${this.GetOutputBufferWGSLType(format)}>;
    @compute
    @workgroup_size(${storageTexture.width}, ${storageTexture.height}, ${
      storageTexture.depthOrArrayLayers
    })
    fn main(
      @builtin(local_invocation_id) invocationID: vec3u,
      @builtin(local_invocation_index) invocationIndex: u32) {
      let initialValue = textureLoad(readOnlyTexture, ${textureLoadCoord});
      outputBuffer[invocationIndex] = initialValue;
    }`;
    const computePipeline = this.device.createComputePipeline({
      compute: {
        module: this.device.createShaderModule({
          code: computeShader,
        }),
      },
      layout: 'auto',
    });
    const bindGroup = this.device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: storageTexture.createView(),
        },
        {
          binding: 1,
          resource: {
            buffer: outputBuffer,
          },
        },
      ],
    });

    const commandEncoder = this.device.createCommandEncoder();
    const computePassEncoder = commandEncoder.beginComputePass();
    computePassEncoder.setPipeline(computePipeline);
    computePassEncoder.setBindGroup(0, bindGroup);
    computePassEncoder.dispatchWorkgroups(1);
    computePassEncoder.end();
    this.queue.submit([commandEncoder.finish()]);
  }
}

export const g = makeTestGroup(F);

g.test('basic')
  .desc(
    `The basic functionality tests for read-only storage textures. In the test we read data from
    the read-only storage texture, write the data into an output storage buffer, and check if the
    data in the output storage buffer is exactly what we expect.`
  )
  .params(u =>
    u
      .combine('format', kColorTextureFormats)
      .filter(p => kTextureFormatInfo[p.format].color?.storage === true)
      .combine('depthOrArrayLayers', [1, 2] as const)
  )
  .fn(t => {
    const { format, depthOrArrayLayers } = t.params;

    const kWidth = 8;
    const height = 8;
    const textureSize = [kWidth, height, depthOrArrayLayers] as const;
    const storageTexture = t.device.createTexture({
      format,
      size: textureSize,
      usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING,
    });
    t.trackForCleanup(storageTexture);

    const expectedData = t.InitTextureAndGetExpectedOutputBufferData(storageTexture, format);

    const outputBuffer = t.device.createBuffer({
      size: 4 * 4 * kWidth * height * depthOrArrayLayers,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
    });
    t.trackForCleanup(outputBuffer);

    t.DoTransform(storageTexture, format, outputBuffer);

    switch (kTextureFormatInfo[format].color.type) {
      case 'uint':
        t.expectGPUBufferValuesEqual(outputBuffer, new Uint32Array(expectedData));
        break;
      case 'sint':
        t.expectGPUBufferValuesEqual(outputBuffer, new Int32Array(expectedData));
        break;
      case 'float':
      case 'unfilterable-float':
        t.expectGPUBufferValuesEqual(outputBuffer, new Float32Array(expectedData));
        break;
      default:
        unreachable();
        break;
    }
  });
