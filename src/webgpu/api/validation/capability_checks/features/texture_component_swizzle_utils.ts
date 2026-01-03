declare global {
  type GPUComponentSwizzle = 'r' | 'g' | 'b' | 'a' | '0' | '1';

  // Note this is a four-character string that only includes `"r"`, `"g"`, `"b"`, `"a"`, `"0"`, or `"1"`.
  type GPUTextureComponentSwizzle = string;
}

// Note: There are 4 settings with 6 options which is 1296 combinations. So we don't check them all. Just a few below.
export const kSwizzleTests = [
  'rgba',
  '0000',
  '1111',
  'rrrr',
  'gggg',
  'bbbb',
  'aaaa',
  'abgr',
  'gbar',
  'barg',
  'argb',
  '0gba',
  'r0ba',
  'rg0a',
  'rgb0',
  '1gba',
  'r1ba',
  'rg1a',
  'rgb1',
] as const;
export type SwizzleSpec = (typeof kSwizzleTests)[number];

// Returns true if swizzle is identity
export function isIdentitySwizzle(swizzle: GPUTextureComponentSwizzle | undefined): boolean {
  return swizzle === undefined || swizzle === 'rgba';
}
