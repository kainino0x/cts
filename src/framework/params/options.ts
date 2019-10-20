import { ParamArgument, ParamSpecIterable, ParamSpecIterator } from './index.js';

export function poptions(key: string, values: ParamArgument[]): ParamSpecIterable {
  return new POptions(key, values);
}

export function pbool(key: string): ParamSpecIterable {
  return new POptions(key, [false, true]);
}

class POptions implements ParamSpecIterable {
  private key: string;
  private values: ParamArgument[];

  constructor(key: string, values: ParamArgument[]) {
    this.key = key;
    this.values = values;
  }

  *[Symbol.iterator](): ParamSpecIterator {
    for (const value of this.values) {
      yield { [this.key]: value };
    }
  }
}
