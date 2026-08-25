import { sha1 } from "@noble/hashes/legacy.js"
import { sha256 } from "@noble/hashes/sha2.js"
import bencode from "bencode"

export interface TorrentMetainfoFile {
  index: number
  path: string
  length: number
}

export interface TorrentMetainfo {
  name: string
  files: TorrentMetainfoFile[]
  torrentId: string
}

type BencodeDictionary = Record<string, unknown>

const textDecoder = new TextDecoder()
const BYTE_COLON = 58
const BYTE_DICTIONARY = 100
const BYTE_END = 101
const BYTE_INTEGER = 105
const BYTE_LIST = 108

function isDictionary(value: unknown): value is BencodeDictionary {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && !(value instanceof Uint8Array)
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined
  if (value instanceof Uint8Array) return textDecoder.decode(value) || undefined
  return undefined
}

function readLength(value: unknown): number | undefined {
  if (typeof value === "bigint") {
    return value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : undefined
  }
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

function readPath(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const parts = value.map(readString)
  return parts.length > 0 && parts.every((part): part is string => part !== undefined) ? parts : undefined
}

function parseV1Files(info: BencodeDictionary, name: string): TorrentMetainfoFile[] | undefined {
  if (Array.isArray(info.files)) {
    return info.files.map((value, index) => {
      if (!isDictionary(value)) throw new Error("Invalid file entry in torrent metadata")
      const length = readLength(value.length)
      const path = readPath(value["path.utf-8"]) ?? readPath(value.path)
      if (length === undefined || !path) throw new Error("Invalid file entry in torrent metadata")
      return { index, path: [name, ...path].join("/"), length }
    })
  }

  const length = readLength(info.length)
  return length === undefined ? undefined : [{ index: 0, path: name, length }]
}

function parseV2Files(info: BencodeDictionary, name: string): TorrentMetainfoFile[] | undefined {
  const fileTree = info["file tree"]
  if (!isDictionary(fileTree)) return undefined

  const files: TorrentMetainfoFile[] = []
  const visit = (node: BencodeDictionary, path: string[]) => {
    const leaf = node[""]
    if (isDictionary(leaf)) {
      const length = readLength(leaf.length)
      if (length === undefined) throw new Error("Invalid file tree entry in torrent metadata")
      files.push({ index: files.length, path: [name, ...path].join("/"), length })
    }

    for (const [part, child] of Object.entries(node)) {
      if (part === "") continue
      if (!isDictionary(child)) throw new Error("Invalid file tree in torrent metadata")
      visit(child, [...path, part])
    }
  }

  visit(fileTree, [])
  return files.length ? files : undefined
}

interface ByteStringRange {
  start: number
  end: number
  next: number
}

function readByteStringRange(data: Uint8Array, offset: number): ByteStringRange {
  const lengthStart = offset
  let length = 0
  while (offset < data.length && data[offset] !== BYTE_COLON) {
    const byte = data[offset]
    if (byte < 48 || byte > 57) throw new Error("Invalid bencoded byte string")
    if (offset > lengthStart && data[lengthStart] === 48) throw new Error("Invalid bencoded byte string length")
    length = (length * 10) + byte - 48
    if (!Number.isSafeInteger(length)) throw new Error("Torrent metadata value is too large")
    offset += 1
  }
  if (offset === lengthStart || data[offset] !== BYTE_COLON) throw new Error("Invalid bencoded byte string")

  const start = offset + 1
  const end = start + length
  if (end > data.length) throw new Error("Truncated bencoded byte string")
  return { start, end, next: end }
}

function skipBencodedValue(data: Uint8Array, offset: number, depth = 0): number {
  if (depth > 512 || offset >= data.length) throw new Error("Invalid torrent metadata structure")
  const marker = data[offset]

  if (marker >= 48 && marker <= 57) return readByteStringRange(data, offset).next
  if (marker === BYTE_INTEGER) {
    const end = data.indexOf(BYTE_END, offset + 1)
    if (end < 0 || end === offset + 1) throw new Error("Invalid bencoded integer")
    return end + 1
  }
  if (marker === BYTE_LIST) {
    let next = offset + 1
    while (next < data.length && data[next] !== BYTE_END) next = skipBencodedValue(data, next, depth + 1)
    if (data[next] !== BYTE_END) throw new Error("Unterminated bencoded list")
    return next + 1
  }
  if (marker === BYTE_DICTIONARY) {
    let next = offset + 1
    while (next < data.length && data[next] !== BYTE_END) {
      next = readByteStringRange(data, next).next
      next = skipBencodedValue(data, next, depth + 1)
    }
    if (data[next] !== BYTE_END) throw new Error("Unterminated bencoded dictionary")
    return next + 1
  }
  throw new Error("Invalid bencoded value")
}

function isInfoKey(data: Uint8Array, range: ByteStringRange): boolean {
  return range.end - range.start === 4
    && data[range.start] === 105
    && data[range.start + 1] === 110
    && data[range.start + 2] === 102
    && data[range.start + 3] === 111
}

function findInfoDictionaryBytes(data: Uint8Array): Uint8Array {
  if (data[0] !== BYTE_DICTIONARY) throw new Error("Torrent metadata must be a dictionary")
  let offset = 1
  let infoBytes: Uint8Array | undefined

  while (offset < data.length && data[offset] !== BYTE_END) {
    const key = readByteStringRange(data, offset)
    const valueStart = key.next
    const valueEnd = skipBencodedValue(data, valueStart)
    if (isInfoKey(data, key)) {
      if (infoBytes) throw new Error("Torrent metadata contains duplicate info dictionaries")
      if (data[valueStart] !== BYTE_DICTIONARY) throw new Error("Torrent metadata info value must be a dictionary")
      infoBytes = data.subarray(valueStart, valueEnd)
    }
    offset = valueEnd
  }

  if (data[offset] !== BYTE_END || offset + 1 !== data.length) throw new Error("Invalid torrent metadata ending")
  if (!infoBytes) throw new Error("Torrent metadata is missing its info dictionary")
  return infoBytes
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function parseTorrentMetainfo(data: Uint8Array): TorrentMetainfo {
  const infoBytes = findInfoDictionaryBytes(data)
  const root = bencode.decode(data)
  if (!isDictionary(root) || !isDictionary(root.info)) {
    throw new Error("Torrent metadata is missing its info dictionary")
  }

  const info = root.info
  const name = readString(info["name.utf-8"]) ?? readString(info.name)
  if (!name) throw new Error("Torrent metadata is missing its name")

  const v1Files = parseV1Files(info, name)
  const files = v1Files ?? parseV2Files(info, name)
  if (!files?.length) throw new Error("Torrent metadata does not contain any files")

  const digest = v1Files ? sha1(infoBytes) : sha256(infoBytes)
  return { name, files, torrentId: toHex(digest.subarray(0, 20)) }
}
