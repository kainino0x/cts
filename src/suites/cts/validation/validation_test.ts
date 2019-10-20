import { ParamSpecIterable, pvariant } from '../../../framework/index.js';
import { GPUTest } from '../gpu_test.js';

export class ValidationTest extends GPUTest {
  async getErrorBuffer(): Promise<GPUBuffer> {
    this.device.pushErrorScope('validation');
    const errorBuffer = this.device.createBuffer({
      size: 1024,
      usage: 0xffff, // Invalid GPUBufferUsage
    });
    await this.device.popErrorScope();
    return errorBuffer;
  }

  async expectValidationError(fn: Function, shouldError: boolean = true): Promise<void> {
    // If no error is expected, we let the scope surrounding the test catch it.
    if (shouldError === false) {
      fn();
      return;
    }
    return this.asyncExpectation(async () => {
      this.device.pushErrorScope('validation');

      fn();

      const gpuValidationError = await this.device.popErrorScope();
      if (!gpuValidationError) {
        this.fail('Validation error was expected.');
      } else if (gpuValidationError instanceof GPUValidationError) {
        this.debug(`Captured validation error - ${gpuValidationError.message}`);
      }
    });
  }
}

export function pvalid({
  valid,
  invalid,
}: {
  valid: ParamSpecIterable;
  invalid: ParamSpecIterable;
}): ParamSpecIterable {
  return pvariant('_valid', [[true, valid], [false, invalid]]);
}
