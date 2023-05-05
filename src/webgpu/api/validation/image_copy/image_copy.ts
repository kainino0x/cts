import { assert } from '../../../../common/util/util.js';
import {
  SizedTextureFormat,
  DepthStencilFormat,
  depthStencilFormatCopyableAspects,
  kTextureFormatInfo,
} from '../../../format_info.js';
import { align } from '../../../util/math.js';
import { ImageCopyType } from '../../../util/texture/layout.js';
import { ValidationTest } from '../validation_test.js';

export class ImageCopyTest extends ValidationTest {
  testRun(
    textureCopyView: GPUImageCopyTexture,
    textureDataLayout: GPUImageDataLayout,
    size: GPUExtent3D,
    {
      method,
      dataSize,
      success,
      submit = false,
    }: {
      method: ImageCopyType;
      dataSize: number;
      success: boolean;
      /** If submit is true, the validation error is expected to come from the submit and encoding
       * should succeed. */
      submit?: boolean;
    }
  ): void {
    switch (method) {
      case 'WriteTexture': {
        const data = new Uint8Array(dataSize);

        this.expectValidationError(() => {
          this.device.queue.writeTexture(textureCopyView, data, textureDataLayout, size);
        }, !success);

        break;
      }
      case 'CopyB2T': {
        const buffer = this.device.createBuffer({
          size: dataSize,
          usage: GPUBufferUsage.COPY_SRC,
        });
        this.trackForCleanup(buffer);

        const encoder = this.device.createCommandEncoder();
        encoder.copyBufferToTexture({ buffer, ...textureDataLayout }, textureCopyView, size);

        if (submit) {
          const cmd = encoder.finish();
          this.expectValidationError(() => {
            this.device.queue.submit([cmd]);
          }, !success);
        } else {
          this.expectValidationError(() => {
            encoder.finish();
          }, !success);
        }

        break;
      }
      case 'CopyT2B': {
        const buffer = this.device.createBuffer({
          size: dataSize,
          usage: GPUBufferUsage.COPY_DST,
        });
        this.trackForCleanup(buffer);

        const encoder = this.device.createCommandEncoder();
        encoder.copyTextureToBuffer(textureCopyView, { buffer, ...textureDataLayout }, size);

        if (submit) {
          const cmd = encoder.finish();
          this.expectValidationError(() => {
            this.device.queue.submit([cmd]);
          }, !success);
        } else {
          this.expectValidationError(() => {
            encoder.finish();
          }, !success);
        }

        break;
      }
    }
  }

  /**
   * Creates a texture when all that is needed is an aligned texture given the format and desired
   * dimensions/origin. The resultant texture guarantees that a copy with the same size and origin
   * should be possible.
   */
  createAlignedTexture(
    format: SizedTextureFormat,
    size: Required<GPUExtent3DDict> = {
      width: 1,
      height: 1,
      depthOrArrayLayers: 1,
    },
    origin: Required<GPUOrigin3DDict> = { x: 0, y: 0, z: 0 },
    dimension: Required<GPUTextureDimension> = '2d'
  ): GPUTexture {
    const info = kTextureFormatInfo[format];
    const alignedSize = {
      width: align(Math.max(1, size.width + origin.x), info.blockWidth),
      height: align(Math.max(1, size.height + origin.y), info.blockHeight),
      depthOrArrayLayers: Math.max(1, size.depthOrArrayLayers + origin.z),
    };
    return this.device.createTexture({
      size: alignedSize,
      dimension,
      format,
      usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
    });
  }

  testBuffer(
    buffer: GPUBuffer,
    texture: GPUTexture,
    textureDataLayout: GPUImageDataLayout,
    size: GPUExtent3D,
    {
      method,
      dataSize,
      success,
      submit = true,
    }: {
      method: ImageCopyType;
      dataSize: number;
      success: boolean;
      /** If submit is true, the validation error is expected to come from the submit and encoding
       * should succeed. */
      submit?: boolean;
    }
  ): void {
    switch (method) {
      case 'WriteTexture': {
        const data = new Uint8Array(dataSize);

        this.expectValidationError(() => {
          this.device.queue.writeTexture({ texture }, data, textureDataLayout, size);
        }, !success);

        break;
      }
      case 'CopyB2T': {
        const { encoder, validateFinish, validateFinishAndSubmit } = this.createEncoder('non-pass');
        encoder.copyBufferToTexture({ buffer, ...textureDataLayout }, { texture }, size);

        if (submit) {
          // validation error is expected to come from the submit and encoding should succeed
          validateFinishAndSubmit(true, success);
        } else {
          // validation error is expected to come from the encoding
          validateFinish(success);
        }

        break;
      }
      case 'CopyT2B': {
        const { encoder, validateFinish, validateFinishAndSubmit } = this.createEncoder('non-pass');
        encoder.copyTextureToBuffer({ texture }, { buffer, ...textureDataLayout }, size);

        if (submit) {
          // validation error is expected to come from the submit and encoding should succeed
          validateFinishAndSubmit(true, success);
        } else {
          // validation error is expected to come from the encoding
          validateFinish(success);
        }

        break;
      }
    }
  }
}

// For testing divisibility by a number we test all the values returned by this function:
function valuesToTestDivisibilityBy(number: number): Iterable<number> {
  const values = [];
  for (let i = 0; i <= 2 * number; ++i) {
    values.push(i);
  }
  values.push(3 * number);
  return values;
}

interface WithFormatAspect {
  format: SizedTextureFormat;
  aspect: 'color' | 'depth' | 'stencil';
}

interface WithFormatAndCoordinate extends WithFormatAspect {
  coordinateToTest: keyof GPUOrigin3DDict | keyof GPUExtent3DDict;
}

interface WithFormatAspectMethod extends WithFormatAspect {
  method: ImageCopyType;
}

// This is a helper function used for expanding test parameters for offset alignment, by spec
export function texelBlockAlignmentTestExpanderForOffset({ format, aspect }: WithFormatAspect) {
  if (aspect === 'depth' || aspect === 'stencil') {
    return valuesToTestDivisibilityBy(4);
  }

  return valuesToTestDivisibilityBy(kTextureFormatInfo[format].color!.bytes);
}

// This is a helper function used for expanding test parameters for texel block alignment tests on rowsPerImage
export function texelBlockAlignmentTestExpanderForRowsPerImage({ format }: WithFormatAspect) {
  return valuesToTestDivisibilityBy(kTextureFormatInfo[format].blockHeight);
}

// This is a helper function used for expanding test parameters for texel block alignment tests on origin and size
export function texelBlockAlignmentTestExpanderForValueToCoordinate({
  format,
  coordinateToTest,
}: WithFormatAndCoordinate) {
  switch (coordinateToTest) {
    case 'x':
    case 'width':
      return valuesToTestDivisibilityBy(kTextureFormatInfo[format].blockWidth);

    case 'y':
    case 'height':
      return valuesToTestDivisibilityBy(kTextureFormatInfo[format].blockHeight);

    case 'z':
    case 'depthOrArrayLayers':
      return valuesToTestDivisibilityBy(1);
  }
}

// This is a helper function used for filtering test parameters
export function formatCopyableWithMethod({
  format,
  aspect,
  method,
}: WithFormatAspectMethod): boolean {
  const info = kTextureFormatInfo[format];
  const aspectInfo = info[aspect];
  assert(!!aspectInfo);

  switch (method) {
    case 'CopyT2B':
      return aspectInfo.copySrc;
    case 'CopyB2T':
    case 'WriteTexture':
      return aspectInfo.copyDst;
  }
}

// This is a helper function used for filtering test parameters
export function getACopyableAspectWithMethod({
  format,
  method,
}: WithFormatAspectMethod): GPUTextureAspect {
  const info = kTextureFormatInfo[format];
  if (info.depth || info.stencil) {
    const supportedAspects: readonly GPUTextureAspect[] = depthStencilFormatCopyableAspects(
      method,
      format as DepthStencilFormat
    );
    return supportedAspects[0];
  }
  return 'all' as GPUTextureAspect;
}
