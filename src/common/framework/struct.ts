// Utilities

function align(n: number, alignment: number): number {
  return Math.ceil(n / alignment) * alignment;
}

function assert(condition: boolean, msg: () => string): asserts condition {
  if (!condition) throw new Error(msg());
}

/** Forces a type to resolve its type definitions, to make it readable/debuggable. */
type ResolveType<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ResolveType<O[K]> }
    : never
  : T;

// Type Descriptors (how the user specifies the type layout)

type TypeDescriptor = TypeDescriptor_Scalar | TypeDescriptor_Struct | TypeDescriptor_Array;

type TypeDescriptor_Scalar = TypeDescriptor_Number | TypeDescriptor_BigInt;
type TypeDescriptor_Number = 'i8' | 'u8' | 'i16' | 'u16' | 'i32' | 'u32' | 'f32' | 'f64';
type TypeDescriptor_BigInt = 'i64' | 'u64';

interface TypeDescriptor_Struct {
  readonly struct: {
    readonly [k: string]: DescStructMember;
  };
}
// TODO: make DescStructMemberInfo optional, with defaulting behaviors
type DescStructMember = readonly [TypeDescriptor, DescStructMemberInfo];
type DescStructMemberInfo = { readonly offset: number } | { readonly align: number };

interface TypeDescriptor_Array {
  // TODO: make DescArrayInfo optional, with defaulting behaviors
  readonly array: readonly [TypeDescriptor, number | 'unsized', DescArrayInfo];
}
interface DescArrayInfo {
  readonly stride: number;
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
  } else if ('array' in desc) {
    const [elementDesc, arrayLength, { stride: byteStride }] = desc.array;
    const elementType = layOutType(elementDesc);

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

    const unsized = arrayLength === 'unsized';
    const minByteSize = arrayLength === 'unsized' ? 0 : arrayLength * elementType.minByteSize;
    return {
      minByteSize,
      minByteAlign: elementType.minByteAlign,
      unsized,
      byteStride,
      arrayLength: arrayLength,
      elementType,
    };
  } else if ('struct' in desc) {
    let minByteSize = 0;
    let minByteAlign = 1;
    let byteSize: number | 'unsized' = 0;
    const members: LayoutStruct_Member[] = [];

    let prevName: string | undefined;
    for (const [name, [typeDesc, info]] of Object.entries(desc.struct)) {
      if ('offset' in info) {
        assert(
          info.offset >= byteSize,
          () =>
            `Found member ${name} with explicit offset ${info.offset} that is less than the end offset ${byteSize} of previous member ${prevName}`
        );
        byteSize = info.offset;
      } else {
        assert(
          byteSize !== 'unsized',
          () =>
            `Unsized struct member ${prevName} must be last, but found subsequent member ${name}`
        );
        byteSize = align(byteSize, info.align);
        minByteAlign = Math.max(minByteAlign, info.align);
      }

      const byteOffset = byteSize;
      const type = layOutType(typeDesc);
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
  } else {
    assert(false, () => 'unreachable');
  }
}

// Inner accessor interfaces

type Accessor<T extends TypeDescriptor> = T extends TypeDescriptor_Number
  ? number
  : T extends TypeDescriptor_BigInt
  ? bigint
  : T extends TypeDescriptor_Array
  ? Accessor_Array<T>
  : T extends TypeDescriptor_Struct
  ? Accessor_Struct<T>
  : 'ERROR: TypeDescriptor was not a TypeDescriptor';

type InferHelper<T extends TBase, TBase> = T;
type Accessor_Struct<T extends TypeDescriptor_Struct> = {
  [K in keyof T['struct']]: T['struct'][K][0] extends InferHelper<infer TMember, TypeDescriptor>
    ? Accessor<TMember>
    : 'ERROR: Struct Member was not a GenericMember<T>';
};

type Accessor_Array<T extends TypeDescriptor_Array> = {
  [i: number]: T['array'][0] extends infer TElement
    ? TElement extends TypeDescriptor
      ? Accessor<TElement>
      : 'ERROR: Element type was not a TypeDescriptor'
    : 'ERROR: ArrayDescriptor was not an ArrayDescriptor';
};

function makeWrappedAccessor(data: AllTypedArrays, baseOffset: number, layout: TypeLayout): object {
  return makeAccessor_Struct(data, baseOffset, {
    minByteSize: layout.minByteSize,
    minByteAlign: layout.minByteAlign,
    unsized: layout.unsized,
    members: [{ name: 'value', byteOffset: 0, type: layout }],
  });
}

function makeAccessor(data: AllTypedArrays, baseOffset: number, layout: TypeLayout): object {
  if ('members' in layout) {
    return makeAccessor_Struct(data, baseOffset, layout);
  } else if ('elementType' in layout) {
    return makeAccessor_Array(data, baseOffset, layout);
  } else {
    assert(false, () => 'makeInnerAccessor should not have recursed on a scalar type');
  }
}

function makeAccessor_Struct(
  data: AllTypedArrays,
  baseOffset: number,
  layout: TypeLayout_Struct
): object {
  const o = {};
  for (const member of layout.members) {
    appendAccessorProperty(o, member.name, data, baseOffset + member.byteOffset, member.type);
  }
  return o;
}

function makeAccessor_Array(
  data: AllTypedArrays,
  baseOffset: number,
  layout: TypeLayout_Array
): object {
  if (layout.arrayLength === 'unsized') {
    const elementType = layout.elementType;

    const getAccessor = (target: any, index: number) => {
      let accessor = target[index];
      if (accessor === undefined) {
        // Use a wrappedAccessor always (requiring .value) to simplify things with inlined scalars
        accessor = target[index] = makeWrappedAccessor(
          data,
          baseOffset + index * layout.byteStride,
          elementType
        );
      }
      return accessor;
    };

    if ('members' in elementType || 'elementType' in elementType) {
      return new Proxy(
        {},
        {
          get(target: { [k: string]: any }, prop: string) {
            const index = parseInt(prop);
            if (!(index >= 0)) return target[prop];
            return getAccessor(target, index).value;
          },
        }
      );
    } else {
      return new Proxy(
        {},
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
      appendAccessorProperty(o, k, data, baseOffset + k * layout.byteStride, layout.elementType);
    }
    return o;
  }
}

// Helpers for defining properties

function appendAccessorProperty(
  o: object,
  k: number | string,
  data: AllTypedArrays,
  byteOffset: number,
  layout: TypeLayout
): void {
  if ('members' in layout || 'elementType' in layout) {
    appendAccessorProperty_NonScalar(o, k, data, byteOffset, layout);
  } else {
    appendAccessorProperty_Scalar(o, k, data, byteOffset, layout);
  }
}

function appendAccessorProperty_Scalar(
  o: object,
  k: number | string,
  data: AllTypedArrays,
  byteOffset: number,
  layout: TypeLayout_Scalar
) {
  const typedArray = data[layout.type];
  const typedOffset = byteOffset / typedArray.BYTES_PER_ELEMENT;

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

  Object.defineProperty(o, k, {
    enumerable: true,
    get() {
      return typedArray[typedOffset];
    },
    set(value: number) {
      typedArray[typedOffset] = value;
    },
  });
}

function appendAccessorProperty_NonScalar(
  o: object,
  k: number | string,
  data: AllTypedArrays,
  byteOffset: number,
  layout: TypeLayout_Struct | TypeLayout_Array
) {
  const accessor = makeAccessor(data, byteOffset, layout);
  Object.defineProperty(o, k, {
    enumerable: true,
    get() {
      return accessor;
    },
  });
}

// TypedArray stuff

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
  arrayBuffer: ArrayBuffer;
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
    arrayBuffer: ab,
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

// Accessor factory

interface StructuredAccessor<T extends Accessor<TypeDescriptor>> {
  value: T;
  readonly layout: TypeLayout;
  readonly backing: AllTypedArrays;
  readonly baseOffset: number;
}

export class StructuredAccessorFactory<T extends TypeDescriptor> {
  readonly layout: TypeLayout;

  constructor(desc: T) {
    this.layout = layOutType(desc);
  }

  create(
    buffer: ArrayBuffer,
    baseOffset: number = 0
  ): StructuredAccessor<ResolveType<Accessor<T>>> {
    assert(
      this.layout.minByteSize <= buffer.byteLength - baseOffset,
      () =>
        `Accessor requires ${this.layout.minByteSize} bytes past ${baseOffset}, but ArrayBuffer is ${buffer.byteLength} bytes`
    );
    const backing = allTypedArrays(buffer);

    // Make a wrappedAccessor (.value) but then add some more helpful properties to it.
    const root = makeWrappedAccessor(backing, baseOffset, this.layout) as object;
    Object.defineProperties(root, {
      layout: { enumerable: true, get: () => this.layout },
      backing: { enumerable: true, get: () => backing },
      baseOffset: { enumerable: true, get: () => baseOffset },
    });
    return root as any;
  }
}

// Tests

const ab = new ArrayBuffer(32);

const _0 = new StructuredAccessorFactory('i32').create(ab);
const _1 = new StructuredAccessorFactory({
  array: ['i32', 2, { stride: 4 }], //
}).create(ab);
const _2 = new StructuredAccessorFactory({
  struct: {}, //
}).create(ab);
const _3 = new StructuredAccessorFactory({
  struct: {
    x: ['i32', { offset: 0 }], //
  },
}).create(ab);
const _4 = new StructuredAccessorFactory({
  struct: {
    x: ['i32', { offset: 0 }],
    y: ['i8', { size: 1, align: 4 }], //
  },
}).create(ab);
const _5 = new StructuredAccessorFactory({
  struct: {
    x: [{ array: ['i32', 2, { stride: 4 }] }, { offset: 0 }], //
  },
}).create(ab);

const _6 = new StructuredAccessorFactory({
  struct: {
    x: [{ array: ['i32', 'unsized', { stride: 4 }] }, { offset: 0 }], //
  },
}).create(ab, 16);
const _7 = new StructuredAccessorFactory({
  struct: {
    x: [
      {
        array: [
          {
            struct: {
              w: ['i64', { offset: 0 }], //
            },
          },
          'unsized',
          { stride: 8 },
        ],
      },
      { offset: 0 },
    ],
  },
}).create(ab, 16);

console.log('_0.value == ' + JSON.stringify(_0.value));
console.log('    setting _0.value');
_0.value = 99;
console.log('    _0.value == ' + JSON.stringify(_0.value));
console.log('arraybuffer = ' + new Int32Array(ab).toString());

console.log('_1.value == ' + JSON.stringify(_1.value));

console.log('_2.value == ' + JSON.stringify(_2.value));

console.log('_3.value == ' + JSON.stringify(_3.value));

console.log('_4.value == ' + JSON.stringify(_4.value));

console.log('_5.value == ' + JSON.stringify(_5.value));
console.log('    setting _5.value.x[1] = 123');
_5.value.x[1] = 123;
console.log('    _5.value == ' + JSON.stringify(_5.value));

console.log('_6.value == ' + JSON.stringify(_6.value));
console.log('    _6.value.x[1] == ' + _6.value.x[1]);
console.log('    setting _6.value.x[1] = 456');
_6.value.x[1] = 456;
console.log('    _6.value == ' + JSON.stringify(_6.value));

console.log('_7.value == ' + JSON.stringify(_7.value));
console.log('    _7.value.x[0].w == ' + _7.value.x[0].w.toString());
console.log('    _7.value.x[1].w == ' + _7.value.x[1].w.toString());
console.log('    setting _7.value.x[1].w = 789n');
_7.value.x[1].w = BigInt(789);
console.log('    _7.value.x[1].w == ' + _7.value.x[1].w.toString());
console.log('arraybuffer = ' + new Int32Array(ab).toString());
