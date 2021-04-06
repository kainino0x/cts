// Utilities

export function align(n: number, alignment: number): number {
  return Math.ceil(n / alignment) * alignment;
}

export function assert(condition: boolean, msg: () => string): asserts condition {
  if (!condition) {
    throw new Error(msg());
  }
}

/** Partially forces a type to resolve type definitions, to make it readable/debuggable. */
export type ResolveType<T> = T extends infer O ? O : never;

// Type Descriptors (how the user specifies the type layout)

type TypeDescriptor = TypeDescriptor_Scalar | TypeDescriptor_Struct | TypeDescriptor_Array;

type TypeDescriptor_Scalar = TypeDescriptor_Number | TypeDescriptor_BigInt;
type TypeDescriptor_Number = 'i8' | 'u8' | 'i16' | 'u16' | 'i32' | 'u32' | 'f32' | 'f64';
type TypeDescriptor_BigInt = 'i64' | 'u64';

interface TypeDescriptor_Struct {
  readonly [x: string]: DescStructMemberWithOffset | DescStructMemberWithAlignment;
}
interface DescStructMember {
  readonly type: TypeDescriptor;
}
interface DescStructMemberWithOffset extends DescStructMember {
  readonly offset: number;
}
interface DescStructMemberWithAlignment extends DescStructMember {
  readonly align: number; // TODO: make optional, with defaulting behaviors
}

type TypeDescriptor_Array = readonly [TypeDescriptor, ArrayInfo];
interface ArrayInfo {
  readonly length: number | 'unsized';
  readonly stride: number; // TODO: make optional, with defaulting behaviors
}

// Type Layouts (concrete layout generated from the type descriptor)

type TypeLayout = TypeLayout_Scalar | TypeLayout_Struct | TypeLayout_Array;

type TypeLayout_Scalar = TypeLayout_Number | TypeLayout_BigInt;
type TypeLayout_Number = {
  readonly minByteSize: number;
  readonly minByteAlign: number;
  readonly unsized: false;
  readonly type: TypeDescriptor_Number;
};
type TypeLayout_BigInt = {
  readonly minByteSize: number;
  readonly minByteAlign: number;
  readonly unsized: false;
  readonly type: TypeDescriptor_BigInt;
};

type TypeLayout_Struct = {
  readonly minByteSize: number;
  readonly minByteAlign: number;
  readonly unsized: boolean;
  readonly members: readonly LayoutStruct_Member[];
};
type LayoutStruct_Member = {
  readonly name: string;
  readonly byteOffset: number;
  readonly type: TypeLayout;
};

type TypeLayout_Array = {
  readonly minByteSize: number;
  readonly minByteAlign: number;
  readonly unsized: boolean;
  readonly arrayLength: number | 'unsized';
  readonly byteStride: number;
  readonly elementType: TypeLayout;
};

// TODO: provide different defaulting rules (C(?), WGSL, GLSL std140/std430/scalar)
function layOutType(desc: TypeDescriptor): TypeLayout {
  if (typeof desc === 'string') {
    const arrayType = kTypedArrayTypes[desc];
    return {
      minByteSize: arrayType.BYTES_PER_ELEMENT,
      minByteAlign: arrayType.BYTES_PER_ELEMENT,
      unsized: false,
      type: desc,
    };
  } else if (desc instanceof Array) {
    const info = desc[1];
    const byteStride = info.stride;
    const elementType = layOutType(desc[0]);

    assert(!elementType.unsized, () => 'Array element types must be sized');
    assert(
      elementType.minByteSize <= byteStride,
      () =>
        `Array element of size ${elementType.minByteSize} must fit within array stride ${byteStride}`
    );
    assert(
      byteStride % elementType.minByteAlign === 0,
      () =>
        `Array stride ${byteStride} must be a multiple of element alignment ${elementType.minByteAlign}`
    );

    const unsized = info.length === 'unsized';
    const minByteSize = info.length === 'unsized' ? 0 : info.length * elementType.minByteSize;
    return {
      minByteSize,
      minByteAlign: elementType.minByteAlign,
      unsized,
      byteStride,
      arrayLength: info.length,
      elementType,
    };
  } else {
    let minByteSize = 0;
    let minByteAlign = 1;
    let byteSize: number | 'unsized' = 0;
    const members: LayoutStruct_Member[] = [];

    let prevName: string | undefined;
    for (const [name, v] of Object.entries(desc)) {
      if ('offset' in v) {
        assert(
          v.offset >= byteSize,
          () =>
            `Found member ${name} with explicit offset ${v.offset} that is less than the end offset ${byteSize} of previous member ${prevName}`
        );
        byteSize = v.offset;
      } else {
        assert(byteSize !== 'unsized', () => `Unsized struct member ${prevName} must be last, but found subsequent member ${name}`);
        byteSize = align(byteSize, v.align);
        minByteAlign = Math.max(minByteAlign, v.align);
      }

      const byteOffset = byteSize;
      const type = layOutType(v.type);
      assert(
        byteSize % type.minByteAlign === 0,
        () => `Member ${name} has offset ${byteOffset} but min alignment ${type.minByteAlign}`
      );
      members.push({ name, byteOffset, type: type });

      if (type.unsized) {
        byteSize = 'unsized';
      } else {
        byteSize += type.minByteSize;
        minByteSize = Math.max(minByteSize, byteSize);
      }
      minByteAlign = Math.max(minByteAlign, type.minByteAlign);
      prevName = name;
    }

    return { minByteSize, minByteAlign, unsized: byteSize === 'unsized', members };
  }
}

// Structured Accessor Classes

// At the root, number/bigint must be wrapped in an object to make them settable.
type RootAccessor<T extends TypeDescriptor> = T extends TypeDescriptor_Number
  ? { value: number }
  : T extends TypeDescriptor_BigInt
  ? { value: bigint }
  : InnerAccessor<T>;

// If not at the top level, they're already in an object/array member so can be accessed directly.
type InnerAccessor<T extends TypeDescriptor> = T extends TypeDescriptor_Number
  ? number
  : T extends TypeDescriptor_BigInt
  ? bigint
  : T extends TypeDescriptor_Array
  ? Accessor_Array<T>
  : T extends TypeDescriptor_Struct
  ? Accessor_Struct<T>
  : 'ERROR: TypeDescriptor was not a TypeDescriptor';

interface GenericMember<T extends TypeDescriptor> {
  readonly type: T;
}

type Accessor_Struct<T extends TypeDescriptor_Struct> = {
  [K in keyof T]: T[K] extends GenericMember<infer TMember>
    ? InnerAccessor<TMember>
    : 'ERROR: Struct Member was not a GenericMember<T>';
};

type Accessor_Array<T extends TypeDescriptor_Array> = {
  [k: number]: T extends readonly [infer TElement, any]
    ? TElement extends TypeDescriptor
      ? InnerAccessor<TElement>
      : 'ERROR: Element type was not a TypeDescriptor'
    : 'ERROR: ArrayDescriptor was not an ArrayDescriptor';
};

const kTypedArrayTypes = {
  i8: Int8Array,
  u8: Uint8Array,
  i16: Int16Array,
  u16: Uint16Array,
  i32: Int32Array,
  u32: Uint32Array,
  f32: Float32Array,
  f64: Float64Array,
  i64: BigInt64Array,
  u64: BigUint64Array,
};

interface AllTypedArrays {
  i8: Int8Array;
  u8: Uint8Array;
  i16: Int16Array;
  u16: Uint16Array;
  i32: Int32Array;
  u32: Uint32Array;
  f32: Float32Array;
  f64: Float64Array;
  i64: BigInt64Array;
  u64: BigUint64Array;
}

function allTypedArrays(ab: ArrayBuffer): AllTypedArrays {
  // Round TypedArray sizes down so that any size ArrayBuffer is valid here.
  return {
    i8: new Int8Array(ab),
    u8: new Uint8Array(ab),
    i16: new Int16Array(ab, 0, Math.floor(ab.byteLength / Int16Array.BYTES_PER_ELEMENT)),
    u16: new Uint16Array(ab, 0, Math.floor(ab.byteLength / Uint16Array.BYTES_PER_ELEMENT)),
    i32: new Int32Array(ab, 0, Math.floor(ab.byteLength / Int32Array.BYTES_PER_ELEMENT)),
    u32: new Uint32Array(ab, 0, Math.floor(ab.byteLength / Uint32Array.BYTES_PER_ELEMENT)),
    f32: new Float32Array(ab, 0, Math.floor(ab.byteLength / Float32Array.BYTES_PER_ELEMENT)),
    f64: new Float64Array(ab, 0, Math.floor(ab.byteLength / Float64Array.BYTES_PER_ELEMENT)),
    i64: new BigInt64Array(ab, 0, Math.floor(ab.byteLength / BigInt64Array.BYTES_PER_ELEMENT)),
    u64: new BigUint64Array(ab, 0, Math.floor(ab.byteLength / BigUint64Array.BYTES_PER_ELEMENT)),
  };
}

function makeRootAccessor(data: AllTypedArrays, baseOffset: number, layout: TypeLayout): object {
  if ('members' in layout || 'elementType' in layout) {
    return makeInnerAccessor(data, baseOffset, layout);
  } else {
    return makeScalarAccessor(data, baseOffset, layout);
  }
}

function makeScalarAccessor(
  data: AllTypedArrays,
  byteOffset: number,
  layout: TypeLayout_Scalar
): { value: number | bigint } {
  const typedArray = data[layout.type];
  assert(
    byteOffset % typedArray.BYTES_PER_ELEMENT === 0,
    () =>
      `final offset ${byteOffset} of a scalar accessor must be a multiple of its alignment ${typedArray.BYTES_PER_ELEMENT}`
  );
  assert(
    byteOffset < typedArray.byteLength,
    () =>
      `final offset ${byteOffset} of a scalar accessor must be within the ArrayBuffer of size ${typedArray.byteLength} bytes`
  );
  const typedOffset = byteOffset / typedArray.BYTES_PER_ELEMENT;
  return {
    get value(): number | bigint {
      return typedArray[typedOffset];
    },
    set value(val: number | bigint) {
      typedArray[typedOffset] = val;
    },
  };
}

function appendPropertyToObject(
  o: object,
  k: number | string,
  data: AllTypedArrays,
  offset: number,
  layout: TypeLayout
): void {
  if (!('members' in layout || 'elementType' in layout)) {
    const accessor = makeScalarAccessor(data, offset, layout);
    Object.defineProperty(o, k, {
      enumerable: true,
      get() {
        return accessor.value;
      },
      set(value: number) {
        accessor.value = value;
      },
    });
  } else {
    const accessor = makeInnerAccessor(data, offset, layout);
    Object.defineProperty(o, k, {
      enumerable: true,
      get() {
        return accessor;
      },
    });
  }
}

function makeInnerAccessor(data: AllTypedArrays, baseOffset: number, layout: TypeLayout): object {
  if ('members' in layout) {
    const o = {};
    for (const member of layout.members) {
      appendPropertyToObject(o, member.name, data, baseOffset + member.byteOffset, member.type);
    }
    return o;
  } else if ('elementType' in layout) {
    if (layout.arrayLength === 'unsized') {
      const elementType = layout.elementType;

      const getAccessor = (target: any, index: number) => {
        let accessor = target[index];
        if (accessor === undefined) {
          accessor = target[index] = makeRootAccessor(
            data,
            baseOffset + index * layout.byteStride,
            elementType
          );
        }
        return accessor;
      };

      if ('members' in elementType || 'elementType' in elementType) {
        return new Proxy(
          { length: 'unsized' },
          {
            get(target: { [k: string]: any }, prop: string) {
              const index = parseInt(prop);
              if (!(index >= 0)) return target[prop];
              return getAccessor(target, index);
            },
          }
        );
      } else {
        return new Proxy(
          { length: 'unsized' },
          {
            get(target: { [k: string]: unknown }, prop: string): unknown {
              const index = parseInt(prop);
              if (!(index >= 0)) return target[prop];
              return getAccessor(target, index).value;
            },
            set(target, prop: string, value: number): boolean {
              const index = parseInt(prop);
              if (!(index >= 0)) return false;
              getAccessor(target, index).value = value;
              return true;
            },
          }
        );
      }
    } else {
      const o = {};
      for (let k = 0; k < layout.arrayLength; ++k) {
        appendPropertyToObject(o, k, data, baseOffset + k * layout.byteStride, layout.elementType);
      }
      return o;
    }
  } else {
    assert(false, 'makeInnerAccessor should not have recursed on a scalar type');
  }
}

export class StructuredAccessorFactory<T extends TypeDescriptor> {
  static arrayBuffer: symbol = Symbol('arrayBuffer');

  private desc: T;

  constructor(desc: T) {
    this.desc = desc;
  }

  create(buffer: ArrayBuffer, byteOffset: number = 0): ResolveType<RootAccessor<T>> {
    const layout = layOutType(this.desc);
    assert(
      layout.minByteSize <= buffer.byteLength - byteOffset,
      () =>
        `Accessor requires ${layout.minByteSize} bytes past ${byteOffset}, but ArrayBuffer is ${buffer.byteLength} bytes`
    );
    return makeRootAccessor(allTypedArrays(buffer), byteOffset, layout) as any;
  }
}

const ab = new ArrayBuffer(100);
const _0 = new StructuredAccessorFactory('i32').create(ab);
const _1 = new StructuredAccessorFactory(['i32', { length: 2, stride: 4 }]).create(ab);
const _2 = new StructuredAccessorFactory({}).create(ab);
const _3 = new StructuredAccessorFactory({
  x: { type: 'i32', offset: 0 },
}).create(ab);
const _4 = new StructuredAccessorFactory({
  x: { type: 'i32', offset: 0 },
  y: { type: 'i8', size: 1, align: 4 },
}).create(ab);
const _5 = new StructuredAccessorFactory({
  x: { type: ['i32', { length: 2, stride: 4 }], offset: 0 },
}).create(ab);
const _6 = new StructuredAccessorFactory({
  x: { type: ['i32', { length: 'unsized', stride: 4 }], offset: 0 },
}).create(ab, 16);
const _7 = new StructuredAccessorFactory({
  x: {
    type: [
      {
        w: { type: 'i32', offset: 0 },
      },
      { length: 'unsized', stride: 4 },
    ],
    offset: 0,
  },
}).create(ab, 32);

console.log('_0 == ' + JSON.stringify(_0));
console.log('_1 == ' + JSON.stringify(_1));
console.log('_2 == ' + JSON.stringify(_2));
console.log('_3 == ' + JSON.stringify(_3));
console.log('_4 == ' + JSON.stringify(_4));

console.log('_5 == ' + JSON.stringify(_5));
console.log(' setting _5.x[1]');
_5.x[1] = 123;
console.log(' _5 == ' + JSON.stringify(_5));

console.log('_6 == ' + JSON.stringify(_6));
console.log(' _6.x[1] == ' + _6.x[1]);
console.log(' setting _6.x[1]');
_6.x[1] = 456;
console.log(' _6 == ' + JSON.stringify(_6));

console.log('_7 == ' + JSON.stringify(_7));
console.log(' _7.x[1] == ' + JSON.stringify(_7.x[1]));
console.log(' setting _7.x[1].w');
_7.x[1].w = 789;
console.log(' _7 == ' + JSON.stringify(_7));
