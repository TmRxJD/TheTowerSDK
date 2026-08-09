export enum RecordType {
  SerializedStreamHeader = 0,
  ClassWithId = 1,
  SystemClassWithMembers = 2,
  ClassWithMembers = 3,
  SystemClassWithMembersAndTypes = 4,
  ClassWithMembersAndTypes = 5,
  BinaryObjectString = 6,
  BinaryArray = 7,
  MemberPrimitiveTyped = 8,
  MemberReference = 9,
  ObjectNull = 10,
  MessageEnd = 11,
  BinaryLibrary = 12,
  ObjectNullMultiple256 = 13,
  ObjectNullMultiple = 14,
  ArraySinglePrimitive = 15,
  ArraySingleObject = 16,
  ArraySingleString = 17,
  MethodCall = 21,
  MethodReturn = 22,
}

export enum PrimitiveType {
  None = 0,
  Boolean = 1,
  Byte = 2,
  Char = 3,
  Decimal = 5,
  Double = 6,
  Int16 = 7,
  Int32 = 8,
  Int64 = 9,
  SByte = 10,
  Single = 11,
  TimeSpan = 12,
  DateTime = 13,
  UInt16 = 14,
  UInt32 = 15,
  UInt64 = 16,
  Null = 17,
  String = 18,
}

export enum BinaryType {
  Primitive = 0,
  String = 1,
  Object = 2,
  SystemClass = 3,
  Class = 4,
  ObjectArray = 5,
  StringArray = 6,
  PrimitiveArray = 7,
}

export enum BinaryArrayType {
  Single = 0,
  Jagged = 1,
  Rectangular = 2,
  SingleOffset = 3,
  JaggedOffset = 4,
  RectangularOffset = 5,
}

class BinaryReader {
  private position = 0
  constructor(private buffer: Uint8Array) {}

  readByte(): number { return this.buffer[this.position++] }
  readSByte(): number { return (this.buffer[this.position++] << 24) >> 24 }
  readBoolean(): boolean { return this.readByte() !== 0 }
  readInt16(): number {
    const val = (this.buffer[this.position]) | (this.buffer[this.position + 1] << 8)
    this.position += 2
    return (val << 16) >> 16
  }
  readUInt16(): number {
    const val = (this.buffer[this.position]) | (this.buffer[this.position + 1] << 8)
    this.position += 2
    return val
  }
  readInt32(): number {
    const val = (this.buffer[this.position]) | (this.buffer[this.position + 1] << 8) | (this.buffer[this.position + 2] << 16) | (this.buffer[this.position + 3] << 24)
    this.position += 4
    return val
  }
  readUInt32(): number {
    const val = (this.buffer[this.position]) | (this.buffer[this.position + 1] << 8) | (this.buffer[this.position + 2] << 16) | (this.buffer[this.position + 3] << 24)
    this.position += 4
    return val >>> 0
  }
  readInt64(): bigint {
    const lo = this.readUInt32()
    const hi = this.readUInt32()
    return BigInt(lo) + (BigInt(hi) << 32n)
  }
  readUInt64(): bigint {
    const lo = this.readUInt32()
    const hi = this.readUInt32()
    return BigInt(lo) + (BigInt(hi) << 32n)
  }
  readSingle(): number {
    const bytes = this.buffer.slice(this.position, this.position + 4)
    this.position += 4
    const view = new DataView(bytes.buffer, bytes.byteOffset, 4)
    return view.getFloat32(0, true)
  }
  readDouble(): number {
    const bytes = this.buffer.slice(this.position, this.position + 8)
    this.position += 8
    const view = new DataView(bytes.buffer, bytes.byteOffset, 8)
    return view.getFloat64(0, true)
  }
  readChar(): string {
    const code = this.readUInt16()
    return String.fromCharCode(code)
  }

  readString(): string {
    let length = 0, shift = 0, byteRead: number
    do {
      byteRead = this.readByte()
      length |= (byteRead & 0x7F) << shift
      shift += 7
    } while ((byteRead & 0x80) !== 0)
    if (length === 0) return ''
    const bytes = this.buffer.slice(this.position, this.position + length)
    this.position += length
    return new TextDecoder('utf-8').decode(bytes)
  }
}

export class BinaryObject {
  private m = new Map<string, any>()
  typeName = ''
  get entries(): IterableIterator<[string, any]> { return this.m.entries() }
  addMember(n: string, v: any): void { this.m.set(n, v) }
}

type DeferredReference = { id: number }

type ClassInfo = { objectId: number; name: string; memberCount: number; memberNames: string[] }
const readClassInfo = (r: BinaryReader): ClassInfo => {
  const objectId = r.readInt32()
  const name = r.readString()
  const memberCount = r.readInt32()
  return { objectId, name, memberCount, memberNames: Array.from({ length: memberCount }, () => r.readString()) }
}

interface ClassSerializationRecord {
  classInfo?: ClassInfo;
  memberTypeInfo?: MemberTypeInfo;
  value?: BinaryObject;
}

type MemberTypeInfo = { binaryType: BinaryType[]; additionalInfos: PrimitiveType[] }
const readMemberTypeInfo = (count: number, r: BinaryReader): MemberTypeInfo => {
  const binaryType = Array.from({ length: count }, () => r.readByte() as BinaryType)
  const additionalInfos: PrimitiveType[] = []
  for (let i = 0; i < count; i++) {
    const bt = binaryType[i]
    if (bt === BinaryType.Primitive || bt === BinaryType.PrimitiveArray) additionalInfos[i] = r.readByte() as PrimitiveType
    else if (bt === BinaryType.SystemClass || bt === BinaryType.Class) { r.readString(); if (bt === BinaryType.Class) r.readInt32() }
  }
  return { binaryType, additionalInfos }
}

type ArrayInfo = { objectId: number; length: number }
const readArrayInfo = (r: BinaryReader): ArrayInfo => ({ objectId: r.readInt32(), length: r.readInt32() })

const readHeader = (r: BinaryReader): number => {
  const rootId = r.readInt32()
  r.readInt32()
  if (r.readInt32() !== 1 || r.readInt32() !== 0) throw new Error('Invalid NRBF stream')
  return rootId
}

const readTimeSpan = (r: BinaryReader) => Number(r.readInt64()) / 10000
const readDateTime = (r: BinaryReader) => new Date(Number(((r.readInt64() & 0x3FFFFFFFFFFFFFFFn) - 621355968000000000n) / 10000n))
const readPrimitive = (type: PrimitiveType, r: BinaryReader): any => {
  const m: Partial<Record<PrimitiveType, () => any>> = {
    [PrimitiveType.Boolean]: () => r.readBoolean(), [PrimitiveType.Byte]: () => r.readByte(), [PrimitiveType.Char]: () => r.readChar(),
    [PrimitiveType.Double]: () => r.readDouble(), [PrimitiveType.Int16]: () => r.readInt16(), [PrimitiveType.Int32]: () => r.readInt32(),
    [PrimitiveType.Int64]: () => r.readInt64(), [PrimitiveType.SByte]: () => r.readSByte(), [PrimitiveType.Single]: () => r.readSingle(),
    [PrimitiveType.UInt16]: () => r.readUInt16(), [PrimitiveType.UInt32]: () => r.readUInt32(), [PrimitiveType.UInt64]: () => r.readUInt64(),
    [PrimitiveType.Decimal]: () => parseFloat(r.readString()), [PrimitiveType.TimeSpan]: () => readTimeSpan(r), [PrimitiveType.DateTime]: () => readDateTime(r),
  }
  const fn = m[type]
  if (!fn) throw new Error('Invalid primitive type: ' + PrimitiveType[type])
  return fn()
}
type BinaryArrayRecord = { objectId: number; binaryArrayType: BinaryArrayType; rank: number; lengths: number[]; lowerBounds?: number[]; binaryType: BinaryType; primitiveType: PrimitiveType }
const readBinaryArrayRecord = (r: BinaryReader): BinaryArrayRecord => {
  const objectId = r.readInt32()
  const binaryArrayType = r.readByte() as BinaryArrayType
  const rank = r.readInt32()
  const lengths = Array.from({ length: rank }, () => r.readInt32())
  const lowerBounds = [BinaryArrayType.SingleOffset, BinaryArrayType.JaggedOffset, BinaryArrayType.RectangularOffset].includes(binaryArrayType)
    ? Array.from({ length: rank }, () => r.readInt32()) : undefined
  const binaryType = r.readByte() as BinaryType
  let primitiveType = PrimitiveType.None
  if (binaryType === BinaryType.Primitive || binaryType === BinaryType.PrimitiveArray) {
    primitiveType = r.readByte() as PrimitiveType
  } else if (binaryType === BinaryType.SystemClass || binaryType === BinaryType.Class) {
    r.readString()
    if (binaryType === BinaryType.Class) r.readInt32()
  }
  return { objectId, binaryArrayType, rank, lengths, lowerBounds, binaryType, primitiveType }
}

interface DeferredItem {
  owner?: BinaryObject;
  member?: string;
  id: number;
  deferredAction?: (value: any) => void;
}

export class NRBFReader {
  private reader: BinaryReader
  private endOfStream = false
  private objectTracker = new Map<number, any>()
  private deferredItems: DeferredItem[] = []

  private constructor(buffer: Uint8Array) {
    this.reader = new BinaryReader(buffer)
  }

  public static readStream(buffer: Uint8Array): any {
    return new NRBFReader(buffer).parse()
  }

  private parse(): any {
    if (this.reader.readByte() !== RecordType.SerializedStreamHeader) throw new Error('Invalid NRBF stream')
    const rootId = readHeader(this.reader)
    while (!this.endOfStream) this.read()
    this.completeDeferredItems()
    return this.dereferenceTrackedObject(rootId)
  }

  private read = (): any => this.readWithRecordType().value

  private readWithRecordType(): { value: any; recordType: RecordType } {
    let currentObject: any = null
    const recordType = this.reader.readByte() as RecordType

    switch (recordType) {
      case RecordType.ClassWithId:
        {
          const oid = this.reader.readInt32()
          const ref = this.objectTracker.get(this.reader.readInt32()) as ClassSerializationRecord
          const o = Object.assign(new BinaryObject(), { typeName: ref.value!.typeName })
          if (oid !== 0) this.objectTracker.set(oid, o)
          currentObject = o
          ref.memberTypeInfo ? this.readMembers(o, ref.classInfo!.memberNames, ref.memberTypeInfo) : this.readUntypedMembers(o, o.typeName, ref.classInfo!.memberNames)
        }
        break

      case RecordType.SystemClassWithMembers:
      case RecordType.ClassWithMembers:
        {
          const ci = readClassInfo(this.reader)
          if (recordType === RecordType.ClassWithMembers) this.reader.readInt32()
          const v = Object.assign(new BinaryObject(), { typeName: ci.name })
          const res: ClassSerializationRecord = { classInfo: ci, value: v }
          if (ci.objectId !== 0) this.objectTracker.set(ci.objectId, res)
          currentObject = v
          this.readUntypedMembers(v, ci.name, ci.memberNames)
        }
        break

      case RecordType.SystemClassWithMembersAndTypes:
      case RecordType.ClassWithMembersAndTypes:
        {
          const ci = readClassInfo(this.reader)
          const mti = readMemberTypeInfo(ci.memberCount, this.reader)
          if (recordType === RecordType.ClassWithMembersAndTypes) this.reader.readInt32()
          const v = Object.assign(new BinaryObject(), { typeName: ci.name })
          const res: ClassSerializationRecord = { classInfo: ci, memberTypeInfo: mti, value: v }
          if (ci.objectId !== 0) this.objectTracker.set(ci.objectId, res)
          currentObject = v
          this.readMembers(v, ci.memberNames, mti)
        }
        break

      case RecordType.BinaryObjectString:
        {
          const id = this.reader.readInt32()
          currentObject = this.reader.readString()
          if (id !== 0) this.objectTracker.set(id, currentObject)
        }
        break

      case RecordType.BinaryArray:
        {
          const br = readBinaryArrayRecord(this.reader)
          currentObject = this.readBinaryArray(br)
          if (br.objectId !== 0) this.objectTracker.set(br.objectId, currentObject)
        }
        break

      case RecordType.MemberPrimitiveTyped:
        currentObject = readPrimitive(this.reader.readByte() as PrimitiveType, this.reader)
        break

      case RecordType.MemberReference:
        {
          const id = this.reader.readInt32()
          const ref = this.objectTracker.get(id)
          currentObject = ref === undefined ? { id } as DeferredReference :
            (ref && typeof ref === 'object' && 'value' in ref ? (ref as ClassSerializationRecord).value : ref)
        }
        break

      case RecordType.ObjectNull:
        return { value: null, recordType }

      case RecordType.MessageEnd:
        this.endOfStream = true
        break

      case RecordType.BinaryLibrary:
        this.reader.readInt32()
        this.reader.readString()
        break

      case RecordType.ObjectNullMultiple256:
      case RecordType.ObjectNullMultiple:
        currentObject = { nullCount: recordType === RecordType.ObjectNullMultiple256 ? this.reader.readByte() : this.reader.readInt32() }
        break

      case RecordType.ArraySinglePrimitive:
        {
          const ai = readArrayInfo(this.reader)
          currentObject = this.readPrimitiveArray(ai, this.reader.readByte() as PrimitiveType)
          if (ai.objectId !== 0) this.objectTracker.set(ai.objectId, currentObject)
        }
        break

      case RecordType.ArraySingleObject:
        {
          const ai = readArrayInfo(this.reader)
          currentObject = this.readObjectArray(ai)
          if (ai.objectId !== 0) this.objectTracker.set(ai.objectId, currentObject)
        }
        break

      case RecordType.ArraySingleString:
        {
          const ai = readArrayInfo(this.reader)
          currentObject = this.readStringArray(ai)
          if (ai.objectId !== 0) this.objectTracker.set(ai.objectId, currentObject)
        }
        break

      case RecordType.MethodCall:
      case RecordType.MethodReturn:
      case RecordType.SerializedStreamHeader:
      default:
        throw new Error('RecordType not supported: ' + RecordType[recordType])
    }

    return { value: currentObject, recordType }
  }

  private readMembers(o: BinaryObject, mns: string[], mti: MemberTypeInfo): void {
    for (let i = 0; i < mns.length; i++) {
      if (mti.binaryType[i] === BinaryType.Primitive) {
        o.addMember(mns[i], readPrimitive(mti.additionalInfos[i] as PrimitiveType, this.reader))
      } else {
        const mc = this.read()
        if (mc && typeof mc === 'object' && 'id' in mc) {
          this.deferredItems.push({ owner: o, member: mns[i], id: (mc as DeferredReference).id })
          o.addMember(mns[i], null)
        } else o.addMember(mns[i], mc)
      }
    }
  }

  private readUntypedMembers(o: BinaryObject, cn: string, mns: string[]): void {
    if (cn === 'System.Guid' && mns.length === 11) {
      o.addMember('_a', this.reader.readInt32())
      o.addMember('_b', this.reader.readInt16())
      o.addMember('_c', this.reader.readInt16());
      ['_d', '_e', '_f', '_g', '_h', '_i', '_j', '_k'].forEach(m => o.addMember(m, this.reader.readByte()))
      return
    }
    if (mns.length === 1 && mns[0] === 'value__') { o.addMember(mns[0], this.reader.readInt32()); return }
    throw new Error('Unsupported untyped member: ' + cn)
  }

  private readPrimitiveArray(info: ArrayInfo, type: PrimitiveType): any[] {
    return Array.from({ length: info.length }, () => readPrimitive(type, this.reader))
  }

  private readStringArray(info: ArrayInfo): string[] {
    const r: string[] = []
    for (let i = 0; i < info.length; i++) {
      const v = this.read()
      if (typeof v === 'string') r[i] = v
      else if (v && typeof v === 'object' && 'nullCount' in v) i += (v as any).nullCount - 1
    }
    return r
  }

  private readObjectArray(info: ArrayInfo): any[] {
    const r: any[] = []
    for (let i = 0; i < info.length; i++) {
      const rr = this.readWithRecordType()
      const v = rr.recordType === RecordType.BinaryLibrary ? this.read() : rr.value
      if (v && typeof v === 'object' && 'nullCount' in v) i += (v as any).nullCount - 1
      else if (v && typeof v === 'object' && 'id' in v) {
        const idx = i
        this.deferredItems.push({ id: (v as DeferredReference).id, deferredAction: res => { r[idx] = res } })
      } else r[i] = v
    }
    return r
  }

  private readBinaryArray(r: BinaryArrayRecord): any {
    const createArray = (d: number[], l?: number[]): any => d.length === 1
      ? (() => { const a: any[] = []; const lb = l ? l[0] : 0; for (let i = 0; i < d[0]; i++) a[lb + i] = undefined; return a })()
      : (() => { const a: any[] = []; const lb = l ? l[0] : 0; for (let i = 0; i < d[0]; i++) a[lb + i] = createArray(d.slice(1), l?.slice(1)); return a })()
    const res = createArray(r.lengths, r.lowerBounds)
    const firstIdx = (d: number[], l?: number[]): number[] => d.map((_, i) => l ? l[i] : 0)
    const nextIdx = (idx: number[], d: number[], l?: number[]): number[] | null => {
      for (let i = idx.length - 1; i >= 0; --i) {
        idx[i]++
        if (idx[i] <= (l ? l[i] : 0) + d[i] - 1) return idx
        idx[i] = l ? l[i] : 0
      }
      return null
    }
    const setVal = (a: any, idx: number[], v: any): void => {
      let c = a
      for (let i = 0; i < idx.length - 1; i++) c = c[idx[i]]
      c[idx[idx.length - 1]] = v
    }

    if (r.primitiveType === PrimitiveType.None || r.binaryArrayType === BinaryArrayType.Jagged) {
      if (r.binaryType !== BinaryType.Primitive) {
        let cc = 0
        let idx: number[] | null = firstIdx(r.lengths, r.lowerBounds)
        while (idx !== null) {
          if (cc > 0) { cc--; idx = nextIdx(idx!, r.lengths, r.lowerBounds); continue }
          const rr = this.readWithRecordType()
          const v = rr.recordType === RecordType.BinaryLibrary ? this.read() : rr.value
          if (v && typeof v === 'object' && 'nullCount' in v) cc = (v as any).nullCount - 1
          else if (v && typeof v === 'object' && 'id' in v) {
            const si = [...idx]
            this.deferredItems.push({ id: (v as DeferredReference).id, deferredAction: rv => setVal(res, si, rv) })
          } else setVal(res, idx, v)
          idx = nextIdx(idx, r.lengths, r.lowerBounds)
        }
      } else throw new Error('Unsupported array structure')
    } else {
      let idx: number[] | null = firstIdx(r.lengths, r.lowerBounds)
      while (idx !== null) {
        setVal(res, idx, readPrimitive(r.primitiveType, this.reader))
        idx = nextIdx(idx, r.lengths, r.lowerBounds)
      }
    }
    return res
  }

  private completeDeferredItems(): void {
    for (const it of this.deferredItems) {
      const ref = this.dereferenceTrackedObject(it.id)
      if (it.deferredAction) it.deferredAction(ref)
      else if (it.owner && it.member) it.owner.addMember(it.member, ref)
    }
  }

  private dereferenceTrackedObject(id: number): any {
    const ref = this.objectTracker.get(id)
    return (ref && typeof ref === 'object' && 'value' in ref) ? (ref as ClassSerializationRecord).value : ref
  }
}
