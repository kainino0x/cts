// Utilities

function align(n: number, alignment: number): number {
  return Math.ceil(n / alignment) * alignment;
}

function assert(condition: boolean, msg: () => string): asserts condition {
  if (!condition) throw new Error(msg());
}

/** Use as `InferSubtypeOf<Supertype, infer Subtype>` to constrain a type `infer`ence. */
type InferSubtypeOf<TBase, T extends TBase> = T;
/** Forces a type to resolve its type definitions, to make it readable/debuggable. */
type ResolveType<T> = T extends InferSubtypeOf<object, infer O>
  ? { [K in keyof O]: ResolveType<O[K]> }
  : T;

// Type Descriptors

/** User-provided description of a structured datatype */
type TypeDescriptor = TypeDescriptor_Scalar | TypeDescriptor_Struct | TypeDescriptor_Array;

type TypeDescriptor_Scalar = TypeDescriptor_Number | TypeDescriptor_BigInt;
type TypeDescriptor_Number = 'i8' | 'u8' | 'i16' | 'u16' | 'i32' | 'u32' | 'f32' | 'f64';
type TypeDescriptor_BigInt = 'i64' | 'u64';

interface TypeDescriptor_Struct {
  readonly struct: {
    readonly [k: string]: DescStructMember;
  };
  readonly align?: number;
  readonly size?: number;
}
type DescStructMember = readonly [TypeDescriptor, DescStructMemberInfo?];
interface DescStructMemberInfo {
  readonly offset?: number;
  readonly align?: number;
  readonly size?: number;
}

interface TypeDescriptor_Array {
  readonly array: readonly [TypeDescriptor, number | 'unsized', DescArrayInfo?];
}
interface DescArrayInfo {
  readonly stride?: number;
}

// Type Layouts

/** Concrete layout computed from the TypeDescriptor */
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

// TODO: provide defaulting rules (WGSL, GLSL std140/std430/scalar, C?)
function computeTypeLayout(desc: TypeDescriptor): TypeLayout {
  if (typeof desc === 'string') {
    return computeTypeLayout_Scalar(desc);
  } else if ('array' in desc) {
    return computeTypeLayout_Array(desc);
  } else {
    return computeTypeLayout_Struct(desc);
  }
}

function computeTypeLayout_Scalar(desc: TypeDescriptor_Scalar): TypeLayout_Scalar {
  const typedArrayConstructor = kTypedArrayConstructors[desc];
  return {
    minByteSize: typedArrayConstructor.BYTES_PER_ELEMENT,
    minByteAlign: typedArrayConstructor.BYTES_PER_ELEMENT,
    unsized: false,
    type: desc,
  };
}

function computeTypeLayout_Array(desc: TypeDescriptor_Array): TypeLayout_Array {
  const [elementDesc, arrayLength, info] = desc.array;
  const elementType = computeTypeLayout(elementDesc);

  if (info?.stride !== undefined) {
    assert(!elementType.unsized, () => 'Array element types must be sized');
    /* prettier-ignore */ assert(elementType.minByteSize <= info.stride,
      () => `Array element of size ${elementType.minByteSize} must fit within array stride ${info.stride}`);
    /* prettier-ignore */ assert(info.stride % elementType.minByteAlign === 0,
      () => `Array stride ${info.stride} must be a multiple of element alignment ${elementType.minByteAlign}`);
  }
  const byteStride = info?.stride ?? align(elementType.minByteSize, elementType.minByteAlign);

  const unsized = arrayLength === 'unsized';
  const minByteSize =
    arrayLength === 'unsized' || arrayLength === 0
      ? 0
      : (arrayLength - 1) * byteStride + elementType.minByteSize;
  return {
    minByteSize,
    minByteAlign: elementType.minByteAlign,
    unsized,
    byteStride,
    arrayLength: arrayLength,
    elementType,
  };
}

function computeTypeLayout_Struct(desc: TypeDescriptor_Struct): TypeLayout_Struct {
  let computedMinByteSize = 0;
  let computedMinByteAlign = 1;
  let totalSize: number | 'unsized' = 0;
  const members: LayoutStruct_Member[] = [];

  let prevName: string | undefined;
  for (const [name, [typeDesc, info]] of Object.entries(desc.struct)) {
    const type = computeTypeLayout(typeDesc);

    if (info?.align !== undefined) {
      /* prettier-ignore */ assert(info.align % type.minByteAlign === 0,
        () => `Member ${name} has explicit alignment ${memberAlign} that is not a multiple of the type's minByteAlign ${type.minByteAlign}`);
    }
    const memberAlign = info?.align ?? type.minByteAlign;

    if (info?.offset !== undefined) {
      /* prettier-ignore */ assert(info.offset % memberAlign === 0,
        () => `Member ${name} has explicit offset ${info.offset} that does not align to required alignment ${memberAlign}`);
    } else {
      /* prettier-ignore */ assert(totalSize !== 'unsized',
        () => `Member ${name} follows unsized member ${prevName}, but does not have an explicit offset`);
    }
    const memberOffset: number = info?.offset ?? align(totalSize as number, memberAlign);

    if (info?.size !== undefined) {
      /* prettier-ignore */ assert(info?.size >= type.minByteSize,
        () => `Member ${name} has explicit size ${memberSize} that is smaller than the type's minByteSize ${type.minByteSize}`);
    }
    const memberSize = info?.size ?? type.minByteSize;

    members.push({ name, byteOffset: memberOffset, type: type });

    if (type.unsized) {
      totalSize = 'unsized';
    } else {
      totalSize = memberOffset + memberSize;
      computedMinByteSize = totalSize;
    }
    // Note minByteAlign is set to type.minByteAlign, not to memberAlign.
    computedMinByteAlign = Math.max(computedMinByteAlign, type.minByteAlign);
    prevName = name;
  }

  if (desc.align !== undefined) {
    /* prettier-ignore */ assert(desc.align % computedMinByteAlign === 0,
      () => `Struct has explicit alignment ${desc.align} that does not align to required alignment ${computedMinByteAlign}`);
  }
  const minByteAlign = desc.align ?? computedMinByteAlign;

  if (desc.size !== undefined) {
    /* prettier-ignore */ assert(desc.size >= computedMinByteSize,
      () => `Struct has explicit size ${desc.size} that is smaller than required size ${computedMinByteSize}`);
  }
  const minByteSize = desc.size ?? computedMinByteSize;

  return { minByteSize, minByteAlign, unsized: totalSize === 'unsized', members };
}

// Inner accessor interfaces

/** TS type of a member whose structured type is described by T */
type Accessor<T extends TypeDescriptor> = T extends TypeDescriptor_Number
  ? number
  : T extends TypeDescriptor_BigInt
  ? bigint
  : T extends TypeDescriptor_Array
  ? Accessor_Array<T>
  : T extends TypeDescriptor_Struct
  ? Accessor_Struct<T>
  : 'ERROR: TypeDescriptor was not a TypeDescriptor';

type Accessor_Struct<T extends TypeDescriptor_Struct> = {
  [K in keyof T['struct']]: T['struct'][K][0] extends InferSubtypeOf<TypeDescriptor, infer TMember>
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

/** Make an accessor that is wrapped in one extra `.value` layer so scalar types can be settable. */
function makeWrappedAccessor(
  data: AllTypedArrays,
  baseOffset: number,
  layout: TypeLayout
): Accessor<TypeDescriptor> {
  return makeAccessor_Struct(data, baseOffset, {
    minByteSize: layout.minByteSize,
    minByteAlign: layout.minByteAlign,
    unsized: layout.unsized,
    members: [{ name: 'value', byteOffset: 0, type: layout }],
  });
}

function makeAccessor(
  data: AllTypedArrays,
  baseOffset: number,
  layout: TypeLayout
): Accessor<TypeDescriptor> {
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
): Accessor_Struct<TypeDescriptor_Struct> {
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
): Accessor_Array<TypeDescriptor_Array> {
  if (layout.arrayLength === 'unsized') {
    return makeAccessor_UnsizedArray(data, baseOffset, layout);
  } else {
    const o = {};
    for (let k = 0; k < layout.arrayLength; ++k) {
      appendAccessorProperty(o, k, data, baseOffset + k * layout.byteStride, layout.elementType);
    }
    return o;
  }
}

function makeAccessor_UnsizedArray(
  data: AllTypedArrays,
  baseOffset: number,
  layout: TypeLayout_Array
): Accessor_Array<TypeDescriptor_Array> {
  const elementType = layout.elementType;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const getAccessor = (target: { [k: number]: any }, index: number) => {
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
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
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
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        get(target: { [k: string]: any }, prop: string): any {
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
}

// Helpers for defining properties in makeAccessor

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

  /* prettier-ignore */ assert(byteOffset % typedArray.BYTES_PER_ELEMENT === 0,
    () => `final offset ${byteOffset} of a scalar accessor must be a multiple of its alignment ${typedArray.BYTES_PER_ELEMENT}`);
  /* prettier-ignore */ assert(byteOffset < typedArray.byteLength,
    () => `final offset ${byteOffset} of a scalar accessor must be within the ArrayBuffer of size ${typedArray.byteLength} bytes`);

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

/** All `TypedArray` constructors (indexable by `TypeDescriptor_Scalar`). */
const kTypedArrayConstructors = {
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

/** An `ArrayBuffer` and every type of `TypedArray` pointing at it. */
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

/** A structured accessor allowing structured read/write access to a section of an `ArrayBuffer`. */
interface StructuredAccessor<T extends Accessor<TypeDescriptor>> {
  /** Root property (getter/setter) for the structured accessor. */
  value: T;
  /** TypeLayout computed from the given TypeDescriptor. */
  readonly layout: TypeLayout;
  /** ArrayBuffer and TypedArrays of all types for the given ArrayBuffer. */
  readonly backing: AllTypedArrays;
  /** The provided base offset into the ArrayBuffer. */
  readonly baseOffset: number;
}

/**
 * Factory for StructuredAccessors of a particular TypeDescriptor.
 * Construct this once for each structured type, then use `.create()` to point it at parts of
 * `ArrayBuffer`s.
 */
export class StructuredAccessorFactory<T extends TypeDescriptor> {
  readonly layout: TypeLayout;

  constructor(desc: T) {
    this.layout = computeTypeLayout(desc);
  }

  create(
    buffer: ArrayBuffer,
    baseOffset: number = 0
  ): StructuredAccessor<ResolveType<Accessor<T>>> {
    /* prettier-ignore */ assert(this.layout.minByteSize <= buffer.byteLength - baseOffset,
      () => `Accessor requires ${this.layout.minByteSize} bytes past ${baseOffset}, but ArrayBuffer is ${buffer.byteLength} bytes`);
    const backing = allTypedArrays(buffer);

    // Make a wrappedAccessor (.value) but then add some more helpful properties to it.
    const root = makeWrappedAccessor(backing, baseOffset, this.layout);
    Object.defineProperties(root, {
      layout: { enumerable: true, get: () => this.layout },
      backing: { enumerable: true, get: () => backing },
      baseOffset: { enumerable: true, get: () => baseOffset },
    });
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    return root as any;
  }
}

// Tests

const ab = new ArrayBuffer(32);

const _0 = new StructuredAccessorFactory('i32').create(ab);
const _1 = new StructuredAccessorFactory({
  array: ['i32', 2], //
}).create(ab);
const _2 = new StructuredAccessorFactory({
  struct: {}, //
}).create(ab);
const _3 = new StructuredAccessorFactory({
  struct: {
    x: ['i32'], //
  },
}).create(ab);
const _4 = new StructuredAccessorFactory({
  struct: {
    x: ['i8', { size: 1, align: 4 }], //
    y: ['i32', { offset: 4 }],
    z: ['i8', { size: 1, align: 4 }],
  },
}).create(ab);
const _5 = new StructuredAccessorFactory({
  struct: {
    x: [{ array: ['i32', 2, { stride: 4 }] }], //
  },
}).create(ab);

const _6 = new StructuredAccessorFactory({
  struct: {
    x: [{ array: ['i32', 'unsized'] }], //
  },
}).create(ab, 16);
const _7 = new StructuredAccessorFactory({
  struct: {
    x: [
      {
        array: [
          {
            struct: {
              w: ['i64'], //
            },
          },
          'unsized',
        ],
      },
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
