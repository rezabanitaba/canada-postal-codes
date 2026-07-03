import { haversineKm, toRadians } from "./distance.js";

export interface SpatialMatch {
  index: number;
  distanceKm: number;
}

/**
 * A pluggable nearest-neighbour / range index over a fixed set of
 * (latitude, longitude) points, addressed by their position (`index`) in
 * the parallel `lat`/`lng` arrays owned by the dataset.
 *
 * {@link GridSpatialIndex} is a simple, dependency-free implementation that
 * is fast enough for the whole dataset. It is isolated behind this
 * interface so it can be swapped for a KD-tree or R-tree later without any
 * change to the public `nearby()` / `boundingBox()` API.
 */
export interface SpatialIndex {
  queryRadius(latitude: number, longitude: number, radiusKm: number): SpatialMatch[];
  queryBoundingBox(minLat: number, minLng: number, maxLat: number, maxLng: number): number[];
}

const KM_PER_DEGREE_LAT = 111.32;
const DEFAULT_CELL_SIZE_DEG = 0.1;

/**
 * A uniform lat/lng grid index. Points are bucketed into ~11km cells
 * (at the equator; narrower in longitude at higher latitudes), so a radius
 * or bounding-box query only needs to scan the handful of cells it
 * overlaps rather than the entire dataset.
 */
export class GridSpatialIndex implements SpatialIndex {
  private readonly cells = new Map<number, number[]>();
  private readonly cellSizeDeg: number;

  constructor(
    private readonly lat: Float32Array,
    private readonly lng: Float32Array,
    cellSizeDeg: number = DEFAULT_CELL_SIZE_DEG,
  ) {
    this.cellSizeDeg = cellSizeDeg;
    for (let i = 0; i < lat.length; i++) {
      const key = this.cellKey(this.cellIndex(lat[i]!), this.cellIndex(lng[i]!));
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = [];
        this.cells.set(key, bucket);
      }
      bucket.push(i);
    }
  }

  private cellIndex(value: number): number {
    return Math.floor(value / this.cellSizeDeg);
  }

  /** Packs two cell coordinates into a single numeric map key. */
  private cellKey(latCell: number, lngCell: number): number {
    return latCell * 1_000_000 + lngCell;
  }

  queryRadius(latitude: number, longitude: number, radiusKm: number): SpatialMatch[] {
    const results: SpatialMatch[] = [];
    const latSpanCells = Math.ceil(radiusKm / KM_PER_DEGREE_LAT / this.cellSizeDeg) + 1;
    const kmPerDegreeLng = KM_PER_DEGREE_LAT * Math.max(Math.cos(toRadians(latitude)), 0.01);
    const lngSpanCells = Math.ceil(radiusKm / kmPerDegreeLng / this.cellSizeDeg) + 1;

    const centerLatCell = this.cellIndex(latitude);
    const centerLngCell = this.cellIndex(longitude);

    for (let dLat = -latSpanCells; dLat <= latSpanCells; dLat++) {
      for (let dLng = -lngSpanCells; dLng <= lngSpanCells; dLng++) {
        const bucket = this.cells.get(this.cellKey(centerLatCell + dLat, centerLngCell + dLng));
        if (!bucket) continue;
        for (const index of bucket) {
          const distanceKm = haversineKm(latitude, longitude, this.lat[index]!, this.lng[index]!);
          if (distanceKm <= radiusKm) {
            results.push({ index, distanceKm });
          }
        }
      }
    }
    return results;
  }

  queryBoundingBox(minLat: number, minLng: number, maxLat: number, maxLng: number): number[] {
    const results: number[] = [];
    const minLatCell = this.cellIndex(minLat);
    const maxLatCell = this.cellIndex(maxLat);
    const minLngCell = this.cellIndex(minLng);
    const maxLngCell = this.cellIndex(maxLng);

    for (let latCell = minLatCell; latCell <= maxLatCell; latCell++) {
      for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell++) {
        const bucket = this.cells.get(this.cellKey(latCell, lngCell));
        if (!bucket) continue;
        for (const index of bucket) {
          const lat = this.lat[index]!;
          const lng = this.lng[index]!;
          if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
            results.push(index);
          }
        }
      }
    }
    return results;
  }
}
