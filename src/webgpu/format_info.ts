import { assert, unreachable } from '../common/util/util.js';

/** Per-GPUTextureFormat-per-aspect info. */
interface TextureFormatAspectInfo {
  /** Whether the aspect can be used as `COPY_SRC`. */
  copySrc: boolean;
  /** Whether the aspect can be used as `COPY_DST`. */
  copyDst: boolean;
  /** Whether the aspect can be used as `STORAGE`. */
  storage: boolean;
  /** The "texel block copy footprint" of one texel block; `undefined` if the aspect is unsized. */
  bytes: number | undefined;
}
/** Per GPUTextureFormat-per-aspect info for color aspects. */
interface TextureFormatColorAspectInfo extends TextureFormatAspectInfo {
  bytes: number;
  /** "Best" sample type of the format. "float" also implies "unfilterable-float". */
  type: 'float' | 'uint' | 'sint' | 'unfilterable-float';
}
/** Per GPUTextureFormat-per-aspect info for depth aspects. */
interface TextureFormatDepthAspectInfo extends TextureFormatAspectInfo {
  /** "depth" also implies "unfilterable-float". */
  type: 'depth';
}
/** Per GPUTextureFormat-per-aspect info for stencil aspects. */
interface TextureFormatStencilAspectInfo extends TextureFormatAspectInfo {
  bytes: 1;
  type: 'uint';
}

/**
 * Per-GPUTextureFormat info.
 * This is not actually the type of values in kTextureFormatInfo; that type is fully const
 * so that it can be narrowed very precisely at usage sites by the compiler.
 * This type exists only a type check on the inferred type of kTextureFormatInfo.
 * Documentation is also written here, but not actually visible to the IDE.
 */
type TextureFormatInfo_TypeCheck = {
  /** Texel block width. */
  blockWidth: number;
  /** Texel block height. */
  blockHeight: number;
  /** Whether the format can be used in a multisample texture. */
  multisample: boolean;
  /** The base format for srgb formats. Specified on both srgb and equivalent non-srgb formats. */
  baseFormat: GPUTextureFormat | undefined;
  /** Optional feature required to use this format, or `undefined` if none. */
  feature: GPUFeatureName | undefined;
} & (
  | {
      /** Color aspect info. */
      color: TextureFormatColorAspectInfo;
      /** Defined if the format is a color format that can be used as `RENDER_ATTACHMENT`. */
      colorRender:
        | undefined
        | {
            /** Whether the format is blendable. */
            blend: boolean;
            /** Whether the format can be a multisample resolve target. */
            resolve: boolean;
            /** The "render target pixel byte cost" of the format. */
            byteCost: number;
            /** The "render target component alignment" of the format. */
            alignment: number;
          };
    }
  | (
      | {
          /** Depth aspect info. */
          depth: TextureFormatDepthAspectInfo;
          /** Stencil aspect info. */
          stencil: undefined | TextureFormatStencilAspectInfo;
          multisample: true;
        }
      | {
          /** Stencil aspect info. */
          stencil: TextureFormatStencilAspectInfo;
          multisample: true;
        }
    )
);

/** Defaults applied to all tables automatically. Used only inside `tableWithDefaults`. */
const kUniversalDefaults = {
  blockWidth: undefined,
  blockHeight: undefined,
  color: undefined,
  depth: undefined,
  stencil: undefined,
  colorRender: undefined,
  multisample: undefined,
  feature: undefined,
  baseFormat: undefined,
} as const;
/**
 * Takes `table` and applies `defaults` to every row, i.e. for each row,
 * `{ ... kUniversalDefaults, ...defaults, ...row }`.
 * This only operates at the first level; it doesn't support defaults in nested objects.
 */
function tableWithDefaults<Defaults extends {}, Table extends { readonly [K: string]: {} }>({
  defaults,
  table,
}: {
  defaults: Defaults;
  table: Table;
}): {
  readonly [F in keyof Table]: {
    readonly [K in keyof typeof kUniversalDefaults]: K extends keyof Table[F]
      ? Table[F][K]
      : K extends keyof Defaults
      ? Defaults[K]
      : typeof kUniversalDefaults[K];
  };
} {
  return Object.fromEntries(
    Object.entries(table).map(([k, row]) => [k, { ...kUniversalDefaults, ...defaults, ...row }])
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  ) as any;
}

/** "plain color formats", plus rgb9e5ufloat. */
export const kRegularTextureFormatInfo = tableWithDefaults({
  defaults: { blockWidth: 1, blockHeight: 1 },
  table: {
    // plain, 8 bits per component

    r8unorm: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 1 },
      colorRender: { blend: true, resolve: true, byteCost: 1, alignment: 1 },
      multisample: true,
    },
    r8snorm: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 1 },
      multisample: false,
    },
    r8uint: {
      color: { type: 'uint', copySrc: true, copyDst: true, storage: false, bytes: 1 },
      colorRender: { blend: false, resolve: false, byteCost: 1, alignment: 1 },
      multisample: true,
    },
    r8sint: {
      color: { type: 'sint', copySrc: true, copyDst: true, storage: false, bytes: 1 },
      colorRender: { blend: false, resolve: false, byteCost: 1, alignment: 1 },
      multisample: true,
    },

    rg8unorm: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 2 },
      colorRender: { blend: true, resolve: true, byteCost: 2, alignment: 1 },
      multisample: true,
    },
    rg8snorm: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 2 },
      multisample: false,
    },
    rg8uint: {
      color: { type: 'uint', copySrc: true, copyDst: true, storage: false, bytes: 2 },
      colorRender: { blend: false, resolve: false, byteCost: 2, alignment: 1 },
      multisample: true,
    },
    rg8sint: {
      color: { type: 'sint', copySrc: true, copyDst: true, storage: false, bytes: 2 },
      colorRender: { blend: false, resolve: false, byteCost: 2, alignment: 1 },
      multisample: true,
    },

    rgba8unorm: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: true, bytes: 4 },
      colorRender: { blend: true, resolve: true, byteCost: 8, alignment: 1 },
      multisample: true,
      baseFormat: 'rgba8unorm',
    },
    'rgba8unorm-srgb': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 4 },
      colorRender: { blend: true, resolve: true, byteCost: 8, alignment: 1 },
      multisample: true,
      baseFormat: 'rgba8unorm',
    },
    rgba8snorm: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: true, bytes: 4 },
      multisample: false,
    },
    rgba8uint: {
      color: { type: 'uint', copySrc: true, copyDst: true, storage: true, bytes: 4 },
      colorRender: { blend: false, resolve: false, byteCost: 4, alignment: 1 },
      multisample: true,
    },
    rgba8sint: {
      color: { type: 'sint', copySrc: true, copyDst: true, storage: true, bytes: 4 },
      colorRender: { blend: false, resolve: false, byteCost: 4, alignment: 1 },
      multisample: true,
    },
    bgra8unorm: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 4 },
      colorRender: { blend: true, resolve: true, byteCost: 8, alignment: 1 },
      multisample: true,
      baseFormat: 'bgra8unorm',
    },
    'bgra8unorm-srgb': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 4 },
      colorRender: { blend: true, resolve: true, byteCost: 8, alignment: 1 },
      multisample: true,
      baseFormat: 'bgra8unorm',
    },

    // plain, 16 bits per component

    r16uint: {
      color: { type: 'uint', copySrc: true, copyDst: true, storage: false, bytes: 2 },
      colorRender: { blend: false, resolve: false, byteCost: 2, alignment: 2 },
      multisample: true,
    },
    r16sint: {
      color: { type: 'sint', copySrc: true, copyDst: true, storage: false, bytes: 2 },
      colorRender: { blend: false, resolve: false, byteCost: 2, alignment: 2 },
      multisample: true,
    },
    r16float: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 2 },
      colorRender: { blend: true, resolve: true, byteCost: 2, alignment: 2 },
      multisample: true,
    },

    rg16uint: {
      color: { type: 'uint', copySrc: true, copyDst: true, storage: false, bytes: 4 },
      colorRender: { blend: false, resolve: false, byteCost: 4, alignment: 2 },
      multisample: true,
    },
    rg16sint: {
      color: { type: 'sint', copySrc: true, copyDst: true, storage: false, bytes: 4 },
      colorRender: { blend: false, resolve: false, byteCost: 4, alignment: 2 },
      multisample: true,
    },
    rg16float: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 4 },
      colorRender: { blend: true, resolve: true, byteCost: 4, alignment: 2 },
      multisample: true,
    },

    rgba16uint: {
      color: { type: 'uint', copySrc: true, copyDst: true, storage: true, bytes: 8 },
      colorRender: { blend: false, resolve: false, byteCost: 8, alignment: 2 },
      multisample: true,
    },
    rgba16sint: {
      color: { type: 'sint', copySrc: true, copyDst: true, storage: true, bytes: 8 },
      colorRender: { blend: false, resolve: false, byteCost: 8, alignment: 2 },
      multisample: true,
    },
    rgba16float: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: true, bytes: 8 },
      colorRender: { blend: true, resolve: true, byteCost: 8, alignment: 2 },
      multisample: true,
    },

    // plain, 32 bits per component

    r32uint: {
      color: { type: 'uint', copySrc: true, copyDst: true, storage: true, bytes: 4 },
      colorRender: { blend: false, resolve: false, byteCost: 4, alignment: 4 },
      multisample: false,
    },
    r32sint: {
      color: { type: 'sint', copySrc: true, copyDst: true, storage: true, bytes: 4 },
      colorRender: { blend: false, resolve: false, byteCost: 4, alignment: 4 },
      multisample: false,
    },
    r32float: {
      color: { type: 'unfilterable-float', copySrc: true, copyDst: true, storage: true, bytes: 4 },
      colorRender: { blend: false, resolve: false, byteCost: 4, alignment: 4 },
      multisample: true,
    },

    rg32uint: {
      color: { type: 'uint', copySrc: true, copyDst: true, storage: true, bytes: 8 },
      colorRender: { blend: false, resolve: false, byteCost: 8, alignment: 4 },
      multisample: false,
    },
    rg32sint: {
      color: { type: 'sint', copySrc: true, copyDst: true, storage: true, bytes: 8 },
      colorRender: { blend: false, resolve: false, byteCost: 8, alignment: 4 },
      multisample: false,
    },
    rg32float: {
      color: { type: 'unfilterable-float', copySrc: true, copyDst: true, storage: true, bytes: 8 },
      colorRender: { blend: false, resolve: false, byteCost: 8, alignment: 4 },
      multisample: false,
    },

    rgba32uint: {
      color: { type: 'uint', copySrc: true, copyDst: true, storage: true, bytes: 16 },
      colorRender: { blend: false, resolve: false, byteCost: 16, alignment: 4 },
      multisample: false,
    },
    rgba32sint: {
      color: { type: 'sint', copySrc: true, copyDst: true, storage: true, bytes: 16 },
      colorRender: { blend: false, resolve: false, byteCost: 16, alignment: 4 },
      multisample: false,
    },
    rgba32float: {
      color: { type: 'unfilterable-float', copySrc: true, copyDst: true, storage: true, bytes: 16 },
      colorRender: { blend: false, resolve: false, byteCost: 16, alignment: 4 },
      multisample: false,
    },

    // plain, mixed component width, 32 bits per texel

    rgb10a2unorm: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 4 },
      colorRender: { blend: true, resolve: true, byteCost: 8, alignment: 4 },
      multisample: true,
    },
    rg11b10ufloat: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 4 },
      multisample: false,
    },

    // packed

    rgb9e5ufloat: {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 4 },
      multisample: false,
    },
  },
} as const);

// MAINTENANCE_TODO: Distinguishing "sized" and "unsized" depth stencil formats doesn't make sense
// because one aspect can be sized and one can be unsized. This should be cleaned up, but is kept
// this way during a migration phase.
const kSizedDepthStencilFormatInfo = tableWithDefaults({
  defaults: { blockWidth: 1, blockHeight: 1, multisample: true },
  table: {
    stencil8: {
      stencil: { type: 'uint', copySrc: true, copyDst: true, storage: false, bytes: 1 },
    },
    depth16unorm: {
      depth: { type: 'depth', copySrc: true, copyDst: true, storage: false, bytes: 2 },
    },
    depth32float: {
      depth: { type: 'depth', copySrc: true, copyDst: false, storage: false, bytes: 4 },
    },
  },
} as const);
const kUnsizedDepthStencilFormatInfo = tableWithDefaults({
  defaults: { blockWidth: 1, blockHeight: 1, multisample: true },
  table: {
    depth24plus: {
      depth: { type: 'depth', copySrc: false, copyDst: false, storage: false, bytes: undefined },
    },
    'depth24plus-stencil8': {
      depth: { type: 'depth', copySrc: false, copyDst: false, storage: false, bytes: undefined },
      stencil: { type: 'uint', copySrc: true, copyDst: true, storage: false, bytes: 1 },
    },
    'depth32float-stencil8': {
      depth: { type: 'depth', copySrc: true, copyDst: false, storage: false, bytes: 4 },
      stencil: { type: 'uint', copySrc: true, copyDst: true, storage: false, bytes: 1 },
      feature: 'depth32float-stencil8',
    },
  },
} as const);

const kBCTextureFormatInfo = tableWithDefaults({
  defaults: {
    blockWidth: 4,
    blockHeight: 4,
    multisample: false,
    feature: 'texture-compression-bc',
  },
  table: {
    'bc1-rgba-unorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 8 },
      baseFormat: 'bc1-rgba-unorm',
    },
    'bc1-rgba-unorm-srgb': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 8 },
      baseFormat: 'bc1-rgba-unorm',
    },

    'bc2-rgba-unorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'bc2-rgba-unorm',
    },
    'bc2-rgba-unorm-srgb': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'bc2-rgba-unorm',
    },

    'bc3-rgba-unorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'bc3-rgba-unorm',
    },
    'bc3-rgba-unorm-srgb': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'bc3-rgba-unorm',
    },

    'bc4-r-unorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 8 },
    },
    'bc4-r-snorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 8 },
    },

    'bc5-rg-unorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
    },
    'bc5-rg-snorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
    },

    'bc6h-rgb-ufloat': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
    },
    'bc6h-rgb-float': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
    },

    'bc7-rgba-unorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'bc7-rgba-unorm',
    },
    'bc7-rgba-unorm-srgb': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'bc7-rgba-unorm',
    },
  },
} as const);

const kETC2TextureFormatInfo = tableWithDefaults({
  defaults: {
    blockWidth: 4,
    blockHeight: 4,
    multisample: false,
    feature: 'texture-compression-etc2',
  },
  table: {
    'etc2-rgb8unorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 8 },
      baseFormat: 'etc2-rgb8unorm',
    },
    'etc2-rgb8unorm-srgb': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 8 },
      baseFormat: 'etc2-rgb8unorm',
    },

    'etc2-rgb8a1unorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 8 },
      baseFormat: 'etc2-rgb8a1unorm',
    },
    'etc2-rgb8a1unorm-srgb': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 8 },
      baseFormat: 'etc2-rgb8a1unorm',
    },

    'etc2-rgba8unorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'etc2-rgba8unorm',
    },
    'etc2-rgba8unorm-srgb': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'etc2-rgba8unorm',
    },

    'eac-r11unorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 8 },
    },
    'eac-r11snorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 8 },
    },

    'eac-rg11unorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
    },
    'eac-rg11snorm': {
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
    },
  },
} as const);

const kASTCTextureFormatInfo = tableWithDefaults({
  defaults: {
    multisample: false,
    feature: 'texture-compression-astc',
  },
  table: {
    'astc-4x4-unorm': {
      blockWidth: 4,
      blockHeight: 4,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-4x4-unorm',
    },
    'astc-4x4-unorm-srgb': {
      blockWidth: 4,
      blockHeight: 4,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-4x4-unorm',
    },

    'astc-5x4-unorm': {
      blockWidth: 5,
      blockHeight: 4,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-5x4-unorm',
    },
    'astc-5x4-unorm-srgb': {
      blockWidth: 5,
      blockHeight: 4,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-5x4-unorm',
    },

    'astc-5x5-unorm': {
      blockWidth: 5,
      blockHeight: 5,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-5x5-unorm',
    },
    'astc-5x5-unorm-srgb': {
      blockWidth: 5,
      blockHeight: 5,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-5x5-unorm',
    },

    'astc-6x5-unorm': {
      blockWidth: 6,
      blockHeight: 5,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-6x5-unorm',
    },
    'astc-6x5-unorm-srgb': {
      blockWidth: 6,
      blockHeight: 5,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-6x5-unorm',
    },

    'astc-6x6-unorm': {
      blockWidth: 6,
      blockHeight: 6,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-6x6-unorm',
    },
    'astc-6x6-unorm-srgb': {
      blockWidth: 6,
      blockHeight: 6,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-6x6-unorm',
    },

    'astc-8x5-unorm': {
      blockWidth: 8,
      blockHeight: 5,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-8x5-unorm',
    },
    'astc-8x5-unorm-srgb': {
      blockWidth: 8,
      blockHeight: 5,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-8x5-unorm',
    },

    'astc-8x6-unorm': {
      blockWidth: 8,
      blockHeight: 6,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-8x6-unorm',
    },
    'astc-8x6-unorm-srgb': {
      blockWidth: 8,
      blockHeight: 6,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-8x6-unorm',
    },

    'astc-8x8-unorm': {
      blockWidth: 8,
      blockHeight: 8,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-8x8-unorm',
    },
    'astc-8x8-unorm-srgb': {
      blockWidth: 8,
      blockHeight: 8,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-8x8-unorm',
    },

    'astc-10x5-unorm': {
      blockWidth: 10,
      blockHeight: 5,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-10x5-unorm',
    },
    'astc-10x5-unorm-srgb': {
      blockWidth: 10,
      blockHeight: 5,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-10x5-unorm',
    },

    'astc-10x6-unorm': {
      blockWidth: 10,
      blockHeight: 6,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-10x6-unorm',
    },
    'astc-10x6-unorm-srgb': {
      blockWidth: 10,
      blockHeight: 6,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-10x6-unorm',
    },

    'astc-10x8-unorm': {
      blockWidth: 10,
      blockHeight: 8,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-10x8-unorm',
    },
    'astc-10x8-unorm-srgb': {
      blockWidth: 10,
      blockHeight: 8,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-10x8-unorm',
    },

    'astc-10x10-unorm': {
      blockWidth: 10,
      blockHeight: 10,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-10x10-unorm',
    },
    'astc-10x10-unorm-srgb': {
      blockWidth: 10,
      blockHeight: 10,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-10x10-unorm',
    },

    'astc-12x10-unorm': {
      blockWidth: 12,
      blockHeight: 10,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-12x10-unorm',
    },
    'astc-12x10-unorm-srgb': {
      blockWidth: 12,
      blockHeight: 10,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-12x10-unorm',
    },

    'astc-12x12-unorm': {
      blockWidth: 12,
      blockHeight: 12,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-12x12-unorm',
    },
    'astc-12x12-unorm-srgb': {
      blockWidth: 12,
      blockHeight: 12,
      color: { type: 'float', copySrc: true, copyDst: true, storage: false, bytes: 16 },
      baseFormat: 'astc-12x12-unorm',
    },
  },
} as const);

/** Per-GPUTextureFormat info. */
export const kTextureFormatInfo = {
  ...kRegularTextureFormatInfo,
  ...kSizedDepthStencilFormatInfo,
  ...kUnsizedDepthStencilFormatInfo,
  ...kBCTextureFormatInfo,
  ...kETC2TextureFormatInfo,
  ...kASTCTextureFormatInfo,
} as const;
export type TextureFormatInfo<
  Format extends GPUTextureFormat = GPUTextureFormat
> = typeof kTextureFormatInfo[Format];

/** Dummy variable to verify the type of kTextureFormatInfo2. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const kTextureFormatInfo_TypeCheck: {
  readonly [F in GPUTextureFormat]: TextureFormatInfo_TypeCheck;
} = kTextureFormatInfo;

export type TextureSingleAspect = 'color' | 'depth' | 'stencil';

export function* aspectsForFormat({ format }: { format: GPUTextureFormat }) {
  const info = kTextureFormatInfo[format];
  if (info.color) yield { aspect: 'color', _viewAspect: 'all' } as const;
  if (info.depth) yield { aspect: 'depth', _viewAspect: 'depth-only' } as const;
  if (info.stencil) yield { aspect: 'stencil', _viewAspect: 'stencil-only' } as const;
}

export function guessAspectForFormat(
  format: GPUTextureFormat,
  aspect: TextureSingleAspect | undefined
) {
  const info = kTextureFormatInfo[format];
  if (aspect) {
    assert(!!info[aspect], 'format does not have the request aspect');
    return aspect;
  } else if (info.color) {
    return 'color';
  } else if (info.depth && !info.stencil) {
    return 'depth';
  } else if (info.stencil && !info.depth) {
    return 'stencil';
  } else {
    unreachable('aspect is required because format has multiple aspects');
  }
}

export const kAspectInfo = {
  color: { viewAspect: 'all' },
  depth: { viewAspect: 'depth-only' },
  stencil: { viewAspect: 'stencil-only' },
} as const;
