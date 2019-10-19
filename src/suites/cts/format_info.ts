import { poptions } from '../../framework/index.js';

export interface TextureFormatInfo {
  renderable: boolean;
  // Add fields as needed
}

interface TextureFormats {
  [k: string]: TextureFormatInfo;
}

// prettier-ignore
export const textureFormatInfo: TextureFormats = {
  // Try to keep these manually-formatted in a readable grid.
  'r8unorm':                { renderable:  true },
  'r8snorm':                { renderable: false },
  'r8uint':                 { renderable:  true },
  'r8sint':                 { renderable:  true },
  'r16uint':                { renderable:  true },
  'r16sint':                { renderable:  true },
  'r16float':               { renderable:  true },
  'rg8unorm':               { renderable:  true },
  'rg8snorm':               { renderable: false },
  'rg8uint':                { renderable:  true },
  'rg8sint':                { renderable:  true },
  'r32uint':                { renderable:  true },
  'r32sint':                { renderable:  true },
  'r32float':               { renderable:  true },
  'rg16uint':               { renderable:  true },
  'rg16sint':               { renderable:  true },
  'rg16float':              { renderable:  true },
  'rgba8unorm':             { renderable:  true },
  'rgba8unorm-srgb':        { renderable:  true },
  'rgba8snorm':             { renderable: false },
  'rgba8uint':              { renderable:  true },
  'rgba8sint':              { renderable:  true },
  'bgra8unorm':             { renderable:  true },
  'bgra8unorm-srgb':        { renderable:  true },
  'rgb10a2unorm':           { renderable:  true },
  'rg11b10float':           { renderable: false },
  'rg32uint':               { renderable:  true },
  'rg32sint':               { renderable:  true },
  'rg32float':              { renderable:  true },
  'rgba16uint':             { renderable:  true },
  'rgba16sint':             { renderable:  true },
  'rgba16float':            { renderable:  true },
  'rgba32uint':             { renderable:  true },
  'rgba32sint':             { renderable:  true },
  'rgba32float':            { renderable:  true },
  'depth32float':           { renderable:  true },
  'depth24plus':            { renderable:  true },
  'depth24plus-stencil8':   { renderable:  true },
};
export const textureFormats = Object.keys(textureFormatInfo) as GPUTextureFormat[];
export const textureFormatParams = Array.from(poptions('format', textureFormats));
