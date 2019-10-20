import { ParamArgument, ParamSpecIterable } from './index.js';

type Variant = [ParamArgument, ParamSpecIterable];

export function* pvariant(key: string, variants: Variant[]): ParamSpecIterable {
  for (const [value, params] of variants) {
    for (const p of params) {
      if (p.hasOwnProperty(key)) {
        throw new Error('pvariant entry has a key that collides with the pvariant key');
      }
      yield { [key]: value, ...p };
    }
  }
}
