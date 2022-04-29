import { SkipTestCase } from '../../common/framework/fixture.js';
import { getGPU } from '../../common/util/navigator_gpu.js';
import { assert, raceWithRejectOnTimeout, assertReject } from '../../common/util/util.js';
import { kLimitInfo, kLimits } from '../capability_info.js';

export interface DeviceProvider {
  acquire(): GPUDevice;
  expectDeviceLost(reason: GPUDeviceLostReason): void;
}

class TestFailedButDeviceReusable extends Error {}
class FeaturesNotSupported extends Error {}
export class TestOOMedShouldAttemptGC extends Error {}

const kDevicePoolSize = 20;

export class DevicePool {
  private holders: 'uninitialized' | 'failed' | DeviceHolderPool = 'uninitialized';

  /** Request a device from the pool. */
  async reserve(descriptor?: UncanonicalizedDeviceDescriptor): Promise<DeviceProvider> {
    let errorMessage = '';
    if (this.holders === 'uninitialized') {
      this.holders = new DeviceHolderPool(kDevicePoolSize);
      try {
        await this.holders.getOrCreate(undefined);
      } catch (ex) {
        this.holders = 'failed';
        if (ex instanceof Error) {
          errorMessage = ` with ${ex.name} "${ex.message}"`;
        }
      }
    }

    assert(
      this.holders !== 'failed',
      `WebGPU device failed to initialize${errorMessage}; not retrying`
    );

    const holder = await this.holders.getOrCreate(descriptor);

    assert(holder.state === 'free', 'Device was in use on DevicePool.acquire');
    holder.state = 'reserved';
    return holder;
  }

  // When a test is done using a device, it's released back into the pool.
  // This waits for error scopes, checks their results, and checks for various error conditions.
  async release(holder: DeviceProvider): Promise<void> {
    assert(this.holders instanceof DeviceHolderPool, 'DevicePool got into a bad state');
    assert(holder instanceof DeviceHolder, 'DeviceProvider should always be a DeviceHolder');

    assert(holder.state !== 'free', 'trying to release a device while already released');

    try {
      await holder.ensureRelease();

      // (Hopefully if the device was lost, it has been reported by the time endErrorScopes()
      // has finished (or timed out). If not, it could cause a finite number of extra test
      // failures following this one (but should recover eventually).)
      assert(
        holder.lostInfo === undefined,
        `Device was unexpectedly lost. Reason: ${holder.lostInfo?.reason}, Message: ${holder.lostInfo?.message}`
      );
    } catch (ex) {
      // Any error that isn't explicitly TestFailedButDeviceReusable forces a new device to be
      // created for the next test.
      if (!(ex instanceof TestFailedButDeviceReusable)) {
        this.holders.deleteByDevice(holder.device);
        if ('destroy' in holder.device) {
          holder.device.destroy();
        }
      }
      // In the try block, we may throw an error if the device is lost in order to force device
      // reinitialization, however, if the device lost was expected we want to suppress the error
      // The device lost is expected when `holder.expectedLostReason` is equal to
      // `holder.lostInfo.reason`.
      const expectedDeviceLost =
        holder.expectedLostReason !== undefined &&
        holder.lostInfo !== undefined &&
        holder.expectedLostReason === holder.lostInfo.reason;
      if (!expectedDeviceLost) {
        throw ex;
      }
    } finally {
      // Mark the holder as free. (This only has an effect if the pool still has the holder.)
      // This could be done at the top but is done here to guard against async-races during release.
      holder.state = 'free';
    }
  }
}

/**
 * Pool of DeviceHolders that can be accessed by descriptor.
 * There can be more than one holder for a given descriptor, for concurrent test execution.
 */
class DeviceHolderPool {
  /** Keys that are known to be unsupported and can be rejected quickly. */
  private readonly poolSize: number
  private unsupported: Set<string> = new Set();
  private holders: { readonly key: string; readonly holder: DeviceHolder }[] = [];

  constructor(poolSize: number) {
    this.poolSize = poolSize;
  }

  /** Deletes an item from the map by GPUDevice value. */
  deleteByDevice(device: GPUDevice): void {
    for (const [i, { holder }] of this.holders.entries()) {
      if (holder.device === device) {
        this.holders.splice(i, 1);
        return;
      }
    }
  }

  /**
   * Gets a DeviceHolder from the map if it exists; otherwise, calls create() to create one,
   * inserts it, and returns it.
   *
   * The provided `uncanonicalizedDescriptor` is canonicalized and used as the map key.
   * (Note `undefined` is canonicalized as `undefined`, not filled out with the default values.)
   *
   * Throws SkipTestCase if devices with this descriptor are unsupported.
   */
  async getOrCreate(
    uncanonicalizedDescriptor: UncanonicalizedDeviceDescriptor | undefined
  ): Promise<DeviceHolder> {
    const [descriptor, key] = canonicalizeDescriptor(uncanonicalizedDescriptor);
    // Quick-reject descriptors that are known to be unsupported already.
    if (this.unsupported.has(key)) {
      throw new SkipTestCase(
        `GPUDeviceDescriptor previously failed: ${JSON.stringify(descriptor)}`
      );
    }

    // Search for an existing, currently-free device with the same descriptor.
    for (const [i, { key, holder }] of this.holders.entries()) {
      if (holder.state === 'free') {
        // Move it to the end of the Map (most-recently-used).
        this.holders.splice(i, 1);
        this.holders.push({ key, holder });
        return holder;
      }
    }

    // No existing item was found; add a new one.
    let value;
    try {
      value = await DeviceHolder.create(descriptor);
    } catch (ex) {
      if (ex instanceof FeaturesNotSupported) {
        this.unsupported.add(key);
        throw new SkipTestCase(
          `GPUDeviceDescriptor not supported: ${JSON.stringify(descriptor)}\n${ex?.message ?? ''}`
        );
      }

      throw ex;
    }
    this.insertAndCleanUp(key, value);
    return value;
  }

  /** Insert an entry, and remove the least-recently-used item if there are too many. */
  private insertAndCleanUp(key: string, holder: DeviceHolder) {
    this.holders.push({ key, holder });

    // TODO: Extras should be cleaned up on release() instead of here. That way we don't evict
    // things that are in use.
    if (this.holders.length > this.poolSize) {
      // Delete the first (least recently used) item in the list.
      this.holders.shift();
    }
  }
}

export type UncanonicalizedDeviceDescriptor = {
  requiredFeatures?: Iterable<GPUFeatureName>;
  requiredLimits?: Record<string, GPUSize32>;
  /** @deprecated this field cannot be used */
  nonGuaranteedFeatures?: undefined;
  /** @deprecated this field cannot be used */
  nonGuaranteedLimits?: undefined;
  /** @deprecated this field cannot be used */
  extensions?: undefined;
  /** @deprecated this field cannot be used */
  features?: undefined;
};
type CanonicalDeviceDescriptor = Omit<
  Required<GPUDeviceDescriptor>,
  'label' | 'nonGuaranteedFeatures' | 'nonGuaranteedLimits'
>;
/**
 * Make a stringified map-key from a GPUDeviceDescriptor.
 * Tries to make sure all defaults are resolved, first - but it's okay if some are missed
 * (it just means some GPUDevice objects won't get deduplicated).
 *
 * This does **not** canonicalize `undefined` (the "default" descriptor) into a fully-qualified
 * GPUDeviceDescriptor. This is just because `undefined` is a common case and we want to use it
 * as a sanity check that WebGPU is working.
 */
function canonicalizeDescriptor(
  desc: UncanonicalizedDeviceDescriptor | undefined
): [CanonicalDeviceDescriptor | undefined, string] {
  if (desc === undefined) {
    return [undefined, ''];
  }

  const featuresCanonicalized = desc.requiredFeatures
    ? Array.from(new Set(desc.requiredFeatures)).sort()
    : [];

  /** Canonicalized version of the requested limits: in canonical order, with only values which are
   * specified _and_ non-default. */
  const limitsCanonicalized: Record<string, number> = {};
  if (desc.requiredLimits) {
    for (const limit of kLimits) {
      const requestedValue = desc.requiredLimits[limit];
      const defaultValue = kLimitInfo[limit].default;
      // Skip adding a limit to limitsCanonicalized if it is the same as the default.
      if (requestedValue !== undefined && requestedValue !== defaultValue) {
        limitsCanonicalized[limit] = requestedValue;
      }
    }
  }

  // Type ensures every field is carried through.
  const descriptorCanonicalized: CanonicalDeviceDescriptor = {
    requiredFeatures: featuresCanonicalized,
    requiredLimits: limitsCanonicalized,
    defaultQueue: {},
  };
  return [descriptorCanonicalized, JSON.stringify(descriptorCanonicalized)];
}

function supportsFeature(
  adapter: GPUAdapter,
  descriptor: CanonicalDeviceDescriptor | undefined
): boolean {
  if (descriptor === undefined) {
    return true;
  }

  for (const feature of descriptor.requiredFeatures) {
    if (!adapter.features.has(feature)) {
      return false;
    }
  }

  return true;
}

/**
 * DeviceHolder has three states:
 * - 'free': Free to be used for a new test.
 * - 'reserved': Reserved by a running test, but has not had error scopes created yet.
 * - 'acquired': Reserved by a running test, and has had error scopes created.
 */
type DeviceHolderState = 'free' | 'reserved' | 'acquired';

/**
 * Holds a GPUDevice and tracks its state (free/reserved/acquired) and handles device loss.
 */
class DeviceHolder implements DeviceProvider {
  readonly device: GPUDevice;
  state: DeviceHolderState = 'free';
  // initially undefined; becomes set when the device is lost
  lostInfo?: GPUDeviceLostInfo;
  // Set if the device is expected to be lost.
  expectedLostReason?: GPUDeviceLostReason;

  // Gets a device and creates a DeviceHolder.
  // If the device is lost, DeviceHolder.lost gets set.
  static async create(descriptor: CanonicalDeviceDescriptor | undefined): Promise<DeviceHolder> {
    const gpu = getGPU();
    const adapter = await gpu.requestAdapter();
    assert(adapter !== null, 'requestAdapter returned null');
    if (!supportsFeature(adapter, descriptor)) {
      throw new FeaturesNotSupported('One or more features are not supported');
    }
    const device = await adapter.requestDevice(descriptor);
    assert(device !== null, 'requestDevice returned null');

    return new DeviceHolder(device);
  }

  private constructor(device: GPUDevice) {
    this.device = device;
    this.device.lost.then(ev => {
      this.lostInfo = ev;
    });
  }

  acquire(): GPUDevice {
    assert(this.state === 'reserved');
    this.state = 'acquired';
    this.device.pushErrorScope('out-of-memory');
    this.device.pushErrorScope('validation');
    return this.device;
  }

  expectDeviceLost(reason: GPUDeviceLostReason) {
    this.expectedLostReason = reason;
  }

  async ensureRelease(): Promise<void> {
    const kPopErrorScopeTimeoutMS = 5000;

    assert(this.state !== 'free');
    try {
      if (this.state === 'acquired') {
        // Time out if popErrorScope never completes. This could happen due to a browser bug - e.g.,
        // as of this writing, on Chrome GPU process crash, popErrorScope just hangs.
        await raceWithRejectOnTimeout(
          this.release(),
          kPopErrorScopeTimeoutMS,
          'finalization popErrorScope timed out'
        );
      }
    } finally {
      this.state = 'free';
    }
  }

  private async release(): Promise<void> {
    // End the whole-test error scopes. Check that there are no extra error scopes, and that no
    // otherwise-uncaptured errors occurred during the test.
    let gpuValidationError: GPUValidationError | GPUOutOfMemoryError | null;
    let gpuOutOfMemoryError: GPUValidationError | GPUOutOfMemoryError | null;

    // Submit to the queue to attempt to force a GPU flush.
    this.device.queue.submit([]);

    try {
      // May reject if the device was lost.
      gpuValidationError = await this.device.popErrorScope();
      gpuOutOfMemoryError = await this.device.popErrorScope();
    } catch (ex) {
      assert(
        this.lostInfo !== undefined,
        'popErrorScope failed; should only happen if device has been lost'
      );
      throw ex;
    }

    // Attempt to wait for the queue to be idle.
    if (this.device.queue.onSubmittedWorkDone) {
      await this.device.queue.onSubmittedWorkDone();
    }

    await assertReject(
      this.device.popErrorScope(),
      'There was an extra error scope on the stack after a test'
    );

    if (gpuValidationError !== null) {
      assert(gpuValidationError instanceof GPUValidationError);
      // Allow the device to be reused.
      throw new TestFailedButDeviceReusable(
        `Unexpected validation error occurred: ${gpuValidationError.message}`
      );
    }
    if (gpuOutOfMemoryError !== null) {
      assert(gpuOutOfMemoryError instanceof GPUOutOfMemoryError);
      // Don't allow the device to be reused; unexpected OOM could break the device.
      throw new TestOOMedShouldAttemptGC('Unexpected out-of-memory error occurred');
    }
  }
}
