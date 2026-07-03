import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GridSpatialIndex, type SpatialIndex } from "./spatial-index.js";
import type { PostalCodeRecord } from "./types.js";

interface Meta {
  schemaVersion: number;
  recordCount: number;
  recordSize: number;
}

function resolveDataDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "data"), // built package: dist/data copied alongside dist/index.js
    join(here, "..", "generated", "data"), // dev/test: running directly from src/
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "meta.json"))) {
      return candidate;
    }
  }
  throw new Error(
    "canada-postal-codes: could not locate generated data artifacts. " +
      "Run `yarn build:data` to generate them from the source CSV before building.",
  );
}

const PROVINCE_OFFSET = 6;
const TIMEZONE_OFFSET = 7;
const CITY_OFFSET = 8;
const LATITUDE_OFFSET = 10;
const LONGITUDE_OFFSET = 14;

/**
 * The in-memory dataset.
 *
 * `postal-codes.bin` is sorted ascending by postal code, so a single
 * postal code lookup is answered with a binary search directly over the
 * memory-mapped buffer (`O(log n)`, no decoding required until a match is
 * found) rather than an eagerly-built `Map` of ~900k entries. This makes
 * cold start for `lookup()` / `exists()` effectively just the cost of
 * reading four small files.
 *
 * Grouped lookups (`searchByCity`, `searchByProvince`) and spatial queries
 * (`nearby`, `boundingBox`) each need a full pass over the dataset to build
 * their index, so those indices are built lazily on first use and cached
 * for the lifetime of the process.
 */
export class Dataset {
  readonly count: number;
  private readonly recordSize: number;
  private readonly buffer: Buffer;
  private readonly view: DataView;
  readonly provinces: readonly string[];
  readonly cities: readonly string[];

  private cityIndicesCache: Map<string, number[]> | undefined;
  private provinceIndicesCache: Map<string, number[]> | undefined;
  private spatialIndexCache: SpatialIndex | undefined;

  constructor(meta: Meta, provinces: string[], cities: string[], buffer: Buffer) {
    this.count = meta.recordCount;
    this.recordSize = meta.recordSize;
    this.buffer = buffer;
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    this.provinces = provinces;
    this.cities = cities;
  }

  /** Binary search for a normalized postal code. Returns its row index, or -1. */
  findIndex(normalizedCode: string): number {
    if (normalizedCode.length !== 6) return -1;

    const target = Buffer.from(normalizedCode, "latin1");
    let lo = 0;
    let hi = this.count - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const start = mid * this.recordSize;
      // buf.compare returns 1 when `target` sorts before the buf region,
      // -1 when after, 0 when equal.
      const cmp = this.buffer.compare(target, 0, 6, start, start + 6);
      if (cmp === 0) return mid;
      if (cmp === 1) hi = mid - 1;
      else lo = mid + 1;
    }
    return -1;
  }

  /** Decodes the full record at a given row index. */
  recordAt(index: number): PostalCodeRecord {
    const offset = index * this.recordSize;
    const code = this.buffer.toString("latin1", offset, offset + 6);
    const provinceIdx = this.view.getUint8(offset + PROVINCE_OFFSET);
    const cityIdx = this.view.getUint16(offset + CITY_OFFSET, true);

    return {
      postalCode: `${code.slice(0, 3)} ${code.slice(3)}`,
      city: this.cities[cityIdx]!,
      province: this.provinces[provinceIdx]!,
      latitude: this.view.getFloat32(offset + LATITUDE_OFFSET, true),
      longitude: this.view.getFloat32(offset + LONGITUDE_OFFSET, true),
      timezone: this.view.getInt8(offset + TIMEZONE_OFFSET),
    };
  }

  /** City name (uppercased) -> row indices. Built on first access. */
  get cityToIndices(): Map<string, number[]> {
    if (!this.cityIndicesCache) this.buildGroupIndices();
    return this.cityIndicesCache!;
  }

  /** Province abbreviation -> row indices. Built on first access. */
  get provinceToIndices(): Map<string, number[]> {
    if (!this.provinceIndicesCache) this.buildGroupIndices();
    return this.provinceIndicesCache!;
  }

  private buildGroupIndices(): void {
    const cityToIndices = new Map<string, number[]>();
    const provinceToIndices = new Map<string, number[]>();

    for (let i = 0; i < this.count; i++) {
      const offset = i * this.recordSize;
      const provinceName = this.provinces[this.view.getUint8(offset + PROVINCE_OFFSET)]!;
      const cityName = this.cities[this.view.getUint16(offset + CITY_OFFSET, true)]!;

      let provinceBucket = provinceToIndices.get(provinceName);
      if (!provinceBucket) {
        provinceBucket = [];
        provinceToIndices.set(provinceName, provinceBucket);
      }
      provinceBucket.push(i);

      let cityBucket = cityToIndices.get(cityName);
      if (!cityBucket) {
        cityBucket = [];
        cityToIndices.set(cityName, cityBucket);
      }
      cityBucket.push(i);
    }

    this.cityIndicesCache = cityToIndices;
    this.provinceIndicesCache = provinceToIndices;
  }

  /** Grid-based spatial index over all coordinates. Built on first access. */
  get spatialIndex(): SpatialIndex {
    if (!this.spatialIndexCache) {
      const lat = new Float32Array(this.count);
      const lng = new Float32Array(this.count);
      for (let i = 0; i < this.count; i++) {
        const offset = i * this.recordSize;
        lat[i] = this.view.getFloat32(offset + LATITUDE_OFFSET, true);
        lng[i] = this.view.getFloat32(offset + LONGITUDE_OFFSET, true);
      }
      this.spatialIndexCache = new GridSpatialIndex(lat, lng);
    }
    return this.spatialIndexCache;
  }
}

let cached: Dataset | undefined;

function loadDataset(): Dataset {
  const dir = resolveDataDir();

  const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8")) as Meta;
  const provinces = JSON.parse(readFileSync(join(dir, "provinces.json"), "utf8")) as string[];
  const cities = JSON.parse(readFileSync(join(dir, "cities.json"), "utf8")) as string[];
  const buffer = readFileSync(join(dir, "postal-codes.bin"));

  return new Dataset(meta, provinces, cities, buffer);
}

/** Loads (once) and returns the shared, process-lifetime dataset singleton. */
export function getDataset(): Dataset {
  if (!cached) {
    cached = loadDataset();
  }
  return cached;
}
