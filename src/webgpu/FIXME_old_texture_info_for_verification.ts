// FIXME delete this file
/* eslint-disable no-sparse-arrays */

import { keysOf, makeTable } from '../common/util/data_tables.js';
import { objectEquals } from '../common/util/util.js';

import { kTextureFormatInfo as kTextureFormatInfo2 } from './format_info.js';

// Note that we repeat the header multiple times in order to make it easier to read.
const kRegularTextureFormatInfo = /* prettier-ignore */ makeTable(
                           ['renderable', 'multisample', 'resolve', 'color', 'depth', 'stencil', 'storage', 'copySrc', 'copyDst',         'sampleType', 'bytesPerBlock', 'blockWidth', 'blockHeight', 'renderTargetPixelByteCost', 'renderTargetComponentAlignment',                  'feature',       'baseFormat'] as const,
                           [            ,              ,          ,    true,   false,     false,          ,      true,      true,                     ,                ,            1,             1,                   undefined,                        undefined,                           ,          undefined] as const, {
  // 8-bit formats
  'r8unorm':               [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               1,             ,              ,                           1,                                1],
  'r8snorm':               [       false,         false,     false,        ,        ,          ,     false,          ,          ,              'float',               1],
  'r8uint':                [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'uint',               1,             ,              ,                           1,                                1],
  'r8sint':                [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'sint',               1,             ,              ,                           1,                                1],
  // 16-bit formats
  'r16uint':               [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'uint',               2,             ,              ,                           2,                                2],
  'r16sint':               [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'sint',               2,             ,              ,                           2,                                2],
  'r16float':              [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               2,             ,              ,                           2,                                2],
  'rg8unorm':              [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               2,             ,              ,                           2,                                1],
  'rg8snorm':              [       false,         false,     false,        ,        ,          ,     false,          ,          ,              'float',               2],
  'rg8uint':               [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'uint',               2,             ,              ,                           2,                                1],
  'rg8sint':               [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'sint',               2,             ,              ,                           2,                                1],
  // 32-bit formats
  'r32uint':               [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'uint',               4,             ,              ,                           4,                                4],
  'r32sint':               [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'sint',               4,             ,              ,                           4,                                4],
  'r32float':              [        true,          true,     false,        ,        ,          ,      true,          ,          , 'unfilterable-float',               4,             ,              ,                           4,                                4],
  'rg16uint':              [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'uint',               4,             ,              ,                           4,                                2],
  'rg16sint':              [        true,          true,     false,        ,        ,          ,     false,          ,          ,               'sint',               4,             ,              ,                           4,                                2],
  'rg16float':             [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           4,                                2],
  'rgba8unorm':            [        true,          true,      true,        ,        ,          ,      true,          ,          ,              'float',               4,             ,              ,                           8,                                1,                           ,       'rgba8unorm'],
  'rgba8unorm-srgb':       [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           8,                                1,                           ,       'rgba8unorm'],
  'rgba8snorm':            [       false,         false,     false,        ,        ,          ,      true,          ,          ,              'float',               4],
  'rgba8uint':             [        true,          true,     false,        ,        ,          ,      true,          ,          ,               'uint',               4,             ,              ,                           4,                                1],
  'rgba8sint':             [        true,          true,     false,        ,        ,          ,      true,          ,          ,               'sint',               4,             ,              ,                           4,                                1],
  'bgra8unorm':            [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           8,                                1,                           ,       'bgra8unorm'],
  'bgra8unorm-srgb':       [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           8,                                1,                           ,       'bgra8unorm'],
  // Packed 32-bit formats
  'rgb10a2unorm':          [        true,          true,      true,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           8,                                4],
  'rg11b10ufloat':         [       false,         false,     false,        ,        ,          ,     false,          ,          ,              'float',               4,             ,              ,                           8,                                4],
  'rgb9e5ufloat':          [       false,         false,     false,        ,        ,          ,     false,          ,          ,              'float',               4],
  // 64-bit formats
  'rg32uint':              [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'uint',               8,             ,              ,                           8,                                4],
  'rg32sint':              [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'sint',               8,             ,              ,                           8,                                4],
  'rg32float':             [        true,         false,     false,        ,        ,          ,      true,          ,          , 'unfilterable-float',               8,             ,              ,                           8,                                4],
  'rgba16uint':            [        true,          true,     false,        ,        ,          ,      true,          ,          ,               'uint',               8,             ,              ,                           8,                                2],
  'rgba16sint':            [        true,          true,     false,        ,        ,          ,      true,          ,          ,               'sint',               8,             ,              ,                           8,                                2],
  'rgba16float':           [        true,          true,      true,        ,        ,          ,      true,          ,          ,              'float',               8,             ,              ,                           8,                                2],
  // 128-bit formats
  'rgba32uint':            [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'uint',              16,             ,              ,                          16,                                4],
  'rgba32sint':            [        true,         false,     false,        ,        ,          ,      true,          ,          ,               'sint',              16,             ,              ,                          16,                                4],
  'rgba32float':           [        true,         false,     false,        ,        ,          ,      true,          ,          , 'unfilterable-float',              16,             ,              ,                          16,                                4],
} as const);
/* prettier-ignore */
const kTexFmtInfoHeader =  ['renderable', 'multisample', 'resolve', 'color', 'depth', 'stencil', 'storage', 'copySrc', 'copyDst',         'sampleType', 'bytesPerBlock', 'blockWidth', 'blockHeight', 'renderTargetPixelByteCost', 'renderTargetComponentAlignment',                  'feature',       'baseFormat'] as const;
const kSizedDepthStencilFormatInfo = /* prettier-ignore */ makeTable(kTexFmtInfoHeader,
                           [        true,          true,     false,   false,        ,          ,     false,          ,          ,                     ,                ,            1,             1,                   undefined,                        undefined,                           ,          undefined] as const, {
  'depth32float':          [            ,              ,          ,        ,    true,     false,          ,      true,     false,              'depth',               4],
  'depth16unorm':          [            ,              ,          ,        ,    true,     false,          ,      true,      true,              'depth',               2],
  'stencil8':              [            ,              ,          ,        ,   false,      true,          ,      true,      true,               'uint',               1],
} as const);

// Multi aspect sample type are now set to their first aspect
const kUnsizedDepthStencilFormatInfo = /* prettier-ignore */ makeTable(kTexFmtInfoHeader,
                           [        true,          true,     false,   false,        ,          ,     false,     false,     false,                     ,       undefined,            1,             1,                            ,                                 ,                           ,          undefined] as const, {
  'depth24plus':           [            ,              ,          ,        ,    true,     false,          ,          ,          ,              'depth'],
  'depth24plus-stencil8':  [            ,              ,          ,        ,    true,      true,          ,          ,          ,              'depth'],
  // MAINTENANCE_TODO: These should really be sized formats; see below MAINTENANCE_TODO about multi-aspect formats.
  'depth32float-stencil8': [            ,              ,          ,        ,    true,      true,          ,          ,          ,              'depth',                ,             ,              ,                            ,                                 ,    'depth32float-stencil8'],
} as const);

// Separated compressed formats by type
const kBCTextureFormatInfo = /* prettier-ignore */ makeTable(kTexFmtInfoHeader,
                           [       false,         false,     false,    true,   false,     false,     false,      true,      true,                     ,                ,            4,             4,                            ,                                 ,                           ,          undefined] as const, {
  // Block Compression (BC) formats
  'bc1-rgba-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc1-rgba-unorm'],
  'bc1-rgba-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc1-rgba-unorm'],
  'bc2-rgba-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc2-rgba-unorm'],
  'bc2-rgba-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc2-rgba-unorm'],
  'bc3-rgba-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc3-rgba-unorm'],
  'bc3-rgba-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc3-rgba-unorm'],
  'bc4-r-unorm':           [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc4-r-snorm':           [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc5-rg-unorm':          [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc5-rg-snorm':          [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc6h-rgb-ufloat':       [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc6h-rgb-float':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc'],
  'bc7-rgba-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc7-rgba-unorm'],
  'bc7-rgba-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 ,   'texture-compression-bc',   'bc7-rgba-unorm'],
} as const);
const kETC2TextureFormatInfo = /* prettier-ignore */ makeTable(kTexFmtInfoHeader,
                           [       false,         false,     false,    true,   false,     false,     false,      true,      true,                     ,                ,            4,             4,                            ,                                 ,                           ,          undefined] as const, {
  // Ericsson Compression (ETC2) formats
  'etc2-rgb8unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2',   'etc2-rgb8unorm'],
  'etc2-rgb8unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2',   'etc2-rgb8unorm'],
  'etc2-rgb8a1unorm':      [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2', 'etc2-rgb8a1unorm'],
  'etc2-rgb8a1unorm-srgb': [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2', 'etc2-rgb8a1unorm'],
  'etc2-rgba8unorm':       [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-etc2',  'etc2-rgba8unorm'],
  'etc2-rgba8unorm-srgb':  [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-etc2',  'etc2-rgba8unorm'],
  'eac-r11unorm':          [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2'],
  'eac-r11snorm':          [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',               8,            4,             4,                            ,                                 , 'texture-compression-etc2'],
  'eac-rg11unorm':         [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-etc2'],
  'eac-rg11snorm':         [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-etc2'],
} as const);
const kASTCTextureFormatInfo = /* prettier-ignore */ makeTable(kTexFmtInfoHeader,
                           [       false,         false,     false,    true,   false,     false,     false,      true,      true,                     ,                ,             ,              ,                            ,                                 ,                           ,          undefined] as const, {
  // Adaptable Scalable Compression (ASTC) formats
  'astc-4x4-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-astc',   'astc-4x4-unorm'],
  'astc-4x4-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            4,             4,                            ,                                 , 'texture-compression-astc',   'astc-4x4-unorm'],
  'astc-5x4-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            5,             4,                            ,                                 , 'texture-compression-astc',   'astc-5x4-unorm'],
  'astc-5x4-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            5,             4,                            ,                                 , 'texture-compression-astc',   'astc-5x4-unorm'],
  'astc-5x5-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            5,             5,                            ,                                 , 'texture-compression-astc',   'astc-5x5-unorm'],
  'astc-5x5-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            5,             5,                            ,                                 , 'texture-compression-astc',   'astc-5x5-unorm'],
  'astc-6x5-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            6,             5,                            ,                                 , 'texture-compression-astc',   'astc-6x5-unorm'],
  'astc-6x5-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            6,             5,                            ,                                 , 'texture-compression-astc',   'astc-6x5-unorm'],
  'astc-6x6-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            6,             6,                            ,                                 , 'texture-compression-astc',   'astc-6x6-unorm'],
  'astc-6x6-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            6,             6,                            ,                                 , 'texture-compression-astc',   'astc-6x6-unorm'],
  'astc-8x5-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             5,                            ,                                 , 'texture-compression-astc',   'astc-8x5-unorm'],
  'astc-8x5-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             5,                            ,                                 , 'texture-compression-astc',   'astc-8x5-unorm'],
  'astc-8x6-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             6,                            ,                                 , 'texture-compression-astc',   'astc-8x6-unorm'],
  'astc-8x6-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             6,                            ,                                 , 'texture-compression-astc',   'astc-8x6-unorm'],
  'astc-8x8-unorm':        [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             8,                            ,                                 , 'texture-compression-astc',   'astc-8x8-unorm'],
  'astc-8x8-unorm-srgb':   [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,            8,             8,                            ,                                 , 'texture-compression-astc',   'astc-8x8-unorm'],
  'astc-10x5-unorm':       [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             5,                            ,                                 , 'texture-compression-astc',  'astc-10x5-unorm'],
  'astc-10x5-unorm-srgb':  [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             5,                            ,                                 , 'texture-compression-astc',  'astc-10x5-unorm'],
  'astc-10x6-unorm':       [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             6,                            ,                                 , 'texture-compression-astc',  'astc-10x6-unorm'],
  'astc-10x6-unorm-srgb':  [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             6,                            ,                                 , 'texture-compression-astc',  'astc-10x6-unorm'],
  'astc-10x8-unorm':       [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             8,                            ,                                 , 'texture-compression-astc',  'astc-10x8-unorm'],
  'astc-10x8-unorm-srgb':  [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,             8,                            ,                                 , 'texture-compression-astc',  'astc-10x8-unorm'],
  'astc-10x10-unorm':      [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,            10,                            ,                                 , 'texture-compression-astc', 'astc-10x10-unorm'],
  'astc-10x10-unorm-srgb': [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           10,            10,                            ,                                 , 'texture-compression-astc', 'astc-10x10-unorm'],
  'astc-12x10-unorm':      [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           12,            10,                            ,                                 , 'texture-compression-astc', 'astc-12x10-unorm'],
  'astc-12x10-unorm-srgb': [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           12,            10,                            ,                                 , 'texture-compression-astc', 'astc-12x10-unorm'],
  'astc-12x12-unorm':      [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           12,            12,                            ,                                 , 'texture-compression-astc', 'astc-12x12-unorm'],
  'astc-12x12-unorm-srgb': [            ,              ,          ,        ,        ,          ,          ,          ,          ,              'float',              16,           12,            12,                            ,                                 , 'texture-compression-astc', 'astc-12x12-unorm'],
} as const);

// Definitions for use locally. To access the table entries, use `kTextureFormatInfo`.

// MAINTENANCE_TODO: Consider generating the exports below programmatically by filtering the big list, instead
// of using these local constants? Requires some type magic though.
/* prettier-ignore */ const   kCompressedTextureFormatInfo = { ...kBCTextureFormatInfo, ...kETC2TextureFormatInfo, ...kASTCTextureFormatInfo } as const;
/* prettier-ignore */ const        kColorTextureFormatInfo = { ...kRegularTextureFormatInfo, ...kCompressedTextureFormatInfo } as const;
/* prettier-ignore */ const    kEncodableTextureFormatInfo = { ...kRegularTextureFormatInfo, ...kSizedDepthStencilFormatInfo } as const;
/* prettier-ignore */ const        kSizedTextureFormatInfo = { ...kRegularTextureFormatInfo, ...kSizedDepthStencilFormatInfo, ...kCompressedTextureFormatInfo } as const;
/* prettier-ignore */ const        kDepthStencilFormatInfo = { ...kSizedDepthStencilFormatInfo, ...kUnsizedDepthStencilFormatInfo } as const;
/* prettier-ignore */ const kUncompressedTextureFormatInfo = { ...kRegularTextureFormatInfo, ...kSizedDepthStencilFormatInfo, ...kUnsizedDepthStencilFormatInfo } as const;
/* prettier-ignore */ const          kAllTextureFormatInfo = { ...kUncompressedTextureFormatInfo, ...kCompressedTextureFormatInfo } as const;

/** A "regular" texture format (uncompressed, sized, single-plane color formats). */
/* prettier-ignore */ export type      RegularTextureFormat = keyof typeof kRegularTextureFormatInfo;
/** A sized depth/stencil texture format. */
/* prettier-ignore */ export type   SizedDepthStencilFormat = keyof typeof kSizedDepthStencilFormatInfo;
/** An unsized depth/stencil texture format. */
/* prettier-ignore */ export type UnsizedDepthStencilFormat = keyof typeof kUnsizedDepthStencilFormatInfo;
/** A compressed (block) texture format. */
/* prettier-ignore */ export type   CompressedTextureFormat = keyof typeof kCompressedTextureFormatInfo;

/** A color texture format (regular | compressed). */
/* prettier-ignore */ export type        ColorTextureFormat = keyof typeof kColorTextureFormatInfo;
/** An encodable texture format (regular | sized depth/stencil). */
/* prettier-ignore */ export type    EncodableTextureFormat = keyof typeof kEncodableTextureFormatInfo;
/** A sized texture format (regular | sized depth/stencil | compressed). */
/* prettier-ignore */ export type        SizedTextureFormat = keyof typeof kSizedTextureFormatInfo;
/** A depth/stencil format (sized | unsized). */
/* prettier-ignore */ export type        DepthStencilFormat = keyof typeof kDepthStencilFormatInfo;
/** An uncompressed (block size 1x1) format (regular | depth/stencil). */
/* prettier-ignore */ export type UncompressedTextureFormat = keyof typeof kUncompressedTextureFormatInfo;

/* prettier-ignore */ export const      kRegularTextureFormats: readonly      RegularTextureFormat[] = keysOf(     kRegularTextureFormatInfo);
/* prettier-ignore */ export const   kSizedDepthStencilFormats: readonly   SizedDepthStencilFormat[] = keysOf(  kSizedDepthStencilFormatInfo);
/* prettier-ignore */ export const kUnsizedDepthStencilFormats: readonly UnsizedDepthStencilFormat[] = keysOf(kUnsizedDepthStencilFormatInfo);
/* prettier-ignore */ export const   kCompressedTextureFormats: readonly   CompressedTextureFormat[] = keysOf(  kCompressedTextureFormatInfo);

/* prettier-ignore */ export const        kColorTextureFormats: readonly        ColorTextureFormat[] = keysOf(       kColorTextureFormatInfo);
/* prettier-ignore */ export const    kEncodableTextureFormats: readonly    EncodableTextureFormat[] = keysOf(   kEncodableTextureFormatInfo);
/* prettier-ignore */ export const        kSizedTextureFormats: readonly        SizedTextureFormat[] = keysOf(       kSizedTextureFormatInfo);
/* prettier-ignore */ export const        kDepthStencilFormats: readonly        DepthStencilFormat[] = keysOf(       kDepthStencilFormatInfo);
/* prettier-ignore */ export const kUncompressedTextureFormats: readonly UncompressedTextureFormat[] = keysOf(kUncompressedTextureFormatInfo);
/* prettier-ignore */ export const          kAllTextureFormats: readonly          GPUTextureFormat[] = keysOf(         kAllTextureFormatInfo);

/** Per-GPUTextureFormat info. */
// Exists just for documentation. Otherwise could be inferred by `makeTable`.
// MAINTENANCE_TODO: Refactor this to separate per-aspect data for multi-aspect formats. In particular:
// - bytesPerBlock only makes sense on a per-aspect basis. But this table can't express that.
//   So we put depth32float-stencil8 to be an unsized format for now.
export type TextureFormatInfo = {
  /** Whether the format can be used as `RENDER_ATTACHMENT`. */
  renderable: boolean;
  /** Whether the format can be used in a multisample texture. */
  multisample: boolean;
  /** Whether the texture with the format can be used as a resolve target. */
  resolve: boolean;
  /** Whether the format has a color aspect. */
  color: boolean;
  /** Whether the format has a depth aspect. */
  depth: boolean;
  /** Whether the format has a stencil aspect. */
  stencil: boolean;
  /** Whether the format can be used as `STORAGE`. */
  storage: boolean;
  /** Whether the format can be used as `COPY_SRC`. */
  copySrc: boolean;
  /** Whether the format can be used as `COPY_DST`. */
  copyDst: boolean;
  /** Byte size of one texel block, or `undefined` if the format is unsized. */
  bytesPerBlock: number | undefined;
  /** Width, in texels, of one texel block. */
  blockWidth: number;
  /** Height, in texels, of one texel block. */
  blockHeight: number;
  /** The raw, unaligned, byte cost towards the color attachment bytes per sample.
   *  (See https://www.w3.org/TR/webgpu/#abstract-opdef-calculating-color-attachment-bytes-per-sample). */
  renderTargetPixelByteCost: number | undefined;
  /** The alignment used for the format when computing the color attachment bytes per sample. */
  renderTargetComponentAlignment: number | undefined;
  /** Optional feature required to use this format, or `undefined` if none. */
  feature: GPUFeatureName | undefined;
  // Add fields as needed
};
/** Per-GPUTextureFormat info. */
export const kTextureFormatInfo: {
  readonly [k in GPUTextureFormat]: TextureFormatInfo &
    // TextureFormatInfo exists just for documentation (and verification of the table data types).
    // The next line constrains the types so that accessing kTextureFormatInfo with
    // a subtype of GPUTextureFormat actually returns nicely a constrained info type
    // (e.g. with `bytesPerBlock: number` instead of `bytesPerBlock: number | undefined`).
    typeof kAllTextureFormatInfo[k];
} = kAllTextureFormatInfo;
/** List of all GPUTextureFormat values. */
/* prettier-ignore */ export const kTextureFormats: readonly GPUTextureFormat[] = keysOf(kAllTextureFormatInfo);

export const info2asinfo1 = Object.fromEntries(
  Object.entries<any>(kTextureFormatInfo2).map(([format, info]) => [
    format,
    {
      renderable: info.renderable,
      multisample: info.multisample,
      resolve: !!info.colorRender?.resolve,
      color: !!info.color,
      depth: !!info.depth,
      stencil: !!info.stencil,
      storage: !!info.color?.storage,
      copySrc: info.copySrc,
      copyDst: info.copyDst,
      sampleType: info.sampleType,
      bytesPerBlock: info.bytesPerBlock,
      blockWidth: info.blockWidth,
      blockHeight: info.blockHeight,
      renderTargetPixelByteCost: info.renderTargetPixelByteCost,
      renderTargetComponentAlignment: info.renderTargetComponentAlignment,
      feature: info.feature,
      baseFormat: info.baseFormat,
    },
  ])
);

// Can diff the following with a JSON diff tool
//console.log('info1:');
//console.log(JSON.stringify(kTextureFormatInfo, undefined, 2));
//console.log('info2:');
//console.log(JSON.stringify(info2asinfo1, undefined, 2));

console.log('equals?', objectEquals(kTextureFormatInfo, info2asinfo1));
