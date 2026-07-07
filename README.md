# canada-postal-codes

Fast, offline, zero-dependency lookups for Canadian postal codes.

- **~900,000 postal codes**, generated from a public Canada Post reference dataset.
- **Zero runtime dependencies.** No network calls, no CSV parsing at runtime.
- **Sub-microsecond lookups** after a ~10ms one-time initialization (see [Performance](#performance)).
- **Fully typed.** Written in TypeScript, ships its own `.d.ts` declarations.
- **Dual ESM/CJS** build via [tsup](https://tsup.egoist.dev/).

> 📌 **Scope in one line:** this is a postal-**geography toolkit** — validation, lookup, and
> proximity math over postal codes — **not** a street-address geocoder. Coordinates are
> **approximate area centroids**, not building locations. Read
> [📍 Coordinate accuracy](#-coordinate-accuracy) before you rely on the lat/lng for anything.

```ts
import { lookup } from "canada-postal-codes";

lookup("v6b1a1");
// {
//   postalCode: "V6B 1A1",
//   city: "VANCOUVER",
//   province: "BC",
//   latitude: 49.283756,
//   longitude: -123.106033,
//   timezone: 8
// }
```

## Installation

```sh
yarn add canada-postal-codes
# or
npm install canada-postal-codes
```

## Examples

```ts
import {
  lookup,
  exists,
  normalize,
  format,
  searchByCity,
  searchByProvince,
  distance,
  nearby,
  boundingBox,
  nearest,
  reverseLookup,
  random,
} from "canada-postal-codes";

normalize("v6b 1a1"); // "V6B1A1"
format("v6b1a1"); // "V6B 1A1"
exists("V6B 1A1"); // true
exists("Z9Z 9Z9"); // false

searchByCity("Vancouver"); // PostalCodeRecord[] — every code in Vancouver, BC
searchByProvince("BC"); // PostalCodeRecord[] — every code in British Columbia

distance("V6B1A1", "M4C1S9"); // ~3361.5 (km, Vancouver <-> Toronto)

nearby(49.2827, -123.1207, 5); // NearbyResult[] — everything within 5km, nearest first
boundingBox(49.2, -123.2, 49.35, -123.0); // PostalCodeRecord[] — everything inside the box

nearest("V6B1A1"); // NearbyResult — the closest other postal code
reverseLookup(49.2827, -123.1207); // NearbyResult — the closest postal code to a coordinate
random(); // PostalCodeRecord — a random record, useful for tests/demos
```

## ✅ What it does / 🚫 What it doesn't do

**✅ Good fit for:**

- ✅ **Validation** — is this a real postal code? (`exists`)
- ✅ **Enrichment** — resolve a code to its city, province, and timezone (`lookup`)
- ✅ **Normalizing & formatting** user input (`normalize`, `format`)
- ✅ **Search** — every code in a city or province (`searchByCity`, `searchByProvince`)
- ✅ **Proximity & distance math** — how far apart, what's nearby, what's in this box, what's
  the closest code (`distance`, `nearby`, `boundingBox`, `nearest`)
- ✅ **Approximate reverse lookup** — coordinate → nearest postal code (`reverseLookup`)
- ✅ **Regional aggregation & analytics** — heatmaps, territory/market analysis, binning
  customers into areas
- ✅ **Offline / air-gapped / serverless** use — deterministic, no API key, no rate limit,
  no network call on your hot path, nothing leaves the machine

**🚫 Not the right tool for:**

- 🚫 **Rooftop / address-level geocoding.** It will **not** pinpoint a specific building.
  See [📍 Coordinate accuracy](#-coordinate-accuracy).
- 🚫 **Street address → coordinates.** It only knows _postal codes_, not street addresses.
  For "123 Main St → lat/lng" you want a geocoder (Geocodio, Google, PCCF+).
- 🚫 **Authoritative "this exact coordinate belongs to this code" boundary mapping.**
  `reverseLookup` is a nearest-centroid guess, not a polygon lookup.
- 🚫 **Turn-by-turn dispatch to an exact door.** Centroids can sit a few hundred meters from
  the actual address.
- 🚫 **Guaranteeing a code is _currently active / deliverable._** Presence in the dataset means
  "this code existed in the source snapshot," not "mail is deliverable here today." Postal
  codes are added and retired over time.
- 🚫 **Complete PO Box / business-code coverage.** Public datasets are inconsistent here.

## 📍 Coordinate accuracy

**Read this before you trust the lat/lng.** The short version: **a Canadian postal code is an
_area_, not a point.** The `latitude`/`longitude` this package returns is a single
**representative centroid** for that area — not the location of any specific building.

**What that means in practice:**

- A full 6-character code (FSA + LDU) covers a **block or a cluster of addresses**. In dense
  urban cores it sometimes maps to a **single building** (many downtown highrises get their own
  code) — but often it doesn't, and the stored point is the _average_ of the area.
- Urban accuracy is typically **within a few hundred meters**. This isn't a limitation of _this_
  dataset specifically — even the authoritative, Canada Post–licensed commercial data is only
  the approximate center of each code's delivery area. Building ("rooftop") precision is a
  fundamentally different product built from full street-address data.
- So a `lookup()` coordinate landing on a **neighbouring building** to the one you expected is
  **expected behaviour, not a bug.** As long as it's in the right code's area, it's doing its job.

> ℹ️ Because the source is a **public dataset**, a small number of records may have coarse or
> occasionally off coordinates. Treat the lat/lng as _approximate_ everywhere, and don't build
> anything safety- or dispatch-critical on top of a single centroid.

## API reference

All lookups normalize their input, so casing and spacing never matter:
`"V6B1A1"`, `"v6b1a1"`, and `"v6b 1a1"` are all equivalent.

> 📍 Every function below that returns coordinates returns **approximate area centroids** — see
> [Coordinate accuracy](#-coordinate-accuracy).

### `lookup(postalCode: string): PostalCodeRecord | null`

Resolves a postal code to its record, or `null` if it isn't in the dataset
(this includes malformed input — it simply can't match anything).

### `exists(postalCode: string): boolean`

Whether a postal code is present in the dataset.

### `normalize(postalCode: string): string`

Strips whitespace and uppercases, e.g. `"v6b 1a1"` -> `"V6B1A1"`. Pure
string transform — it does not validate the shape of its input.

### `format(postalCode: string): string`

Formats into the conventional `"A1A 1A1"` presentation. Throws
`InvalidPostalCodeError` if the input doesn't normalize to a well-formed
postal code shape.

### `searchByCity(city: string): PostalCodeRecord[]`

Every record for a city, case-insensitive. Returns `[]` if the city isn't
found.

### `searchByProvince(province: string): PostalCodeRecord[]`

Every record for a province, addressed by its two-letter abbreviation
(e.g. `"ON"`, `"BC"`), case-insensitive. Returns `[]` if not found.

### `distance(postalA: string, postalB: string): number`

Great-circle distance between two postal codes, in kilometers, via the
[Haversine formula](https://en.wikipedia.org/wiki/Haversine_formula). Throws
`PostalCodeNotFoundError` if either postal code isn't in the dataset.
Computed between the two codes' centroids, so treat it as approximate at
short ranges.

### `nearby(latitude: number, longitude: number, radiusKm: number): NearbyResult[]`

Every record within `radiusKm` of a coordinate, sorted nearest-first. Each
result is a `PostalCodeRecord` plus `distanceKm`.

### `boundingBox(minLat, minLng, maxLat, maxLng): PostalCodeRecord[]`

Every record inside an inclusive lat/lng bounding box.

### `nearest(postalCode: string): NearbyResult | null`

The closest _other_ postal code to the given one. Throws
`PostalCodeNotFoundError` if `postalCode` isn't in the dataset.

### `reverseLookup(latitude: number, longitude: number): NearbyResult | null`

The closest postal code to a coordinate. Returns `null` only on a
near-empty dataset.

> ⚠️ **Disclaimer:** this is a nearest-neighbor search over postal code
> **centroids**, not an authoritative "this coordinate belongs to this code"
> mapping. Centroids are approximate and adjacent postal codes can sit
> meters apart, so `reverseLookup` may return a different (but genuinely
> closer) postal code than the one you expected for a given address. If you
> already have a postal code, use `lookup()` directly rather than
> round-tripping through coordinates. See
> [📍 Coordinate accuracy](#-coordinate-accuracy) for the full picture.

### `random(): PostalCodeRecord`

A random record. Handy for tests, demos, and seed data.

### Types

```ts
interface PostalCodeRecord {
  postalCode: string; // "V6B 1A1"
  city: string; // "VANCOUVER"
  province: string; // "BC"
  latitude: number; // ⚠️ approximate area centroid, not a building location
  longitude: number; // ⚠️ approximate area centroid, not a building location
  timezone: number; // raw UTC offset in hours, as sourced
}

interface NearbyResult extends PostalCodeRecord {
  distanceKm: number;
}
```

### Errors

- `InvalidPostalCodeError` — thrown by `format()` when the input can't be
  interpreted as a Canadian postal code.
- `PostalCodeNotFoundError` — thrown by `distance()` / `nearest()` when a
  referenced postal code isn't in the dataset.

## Performance

Measured on a development machine via `yarn bench` (`benchmarks/bench.ts`);
see that file for methodology. Your numbers will vary by hardware, but the
shape should hold.

| Operation                                                              | Cost                         |
| ---------------------------------------------------------------------- | ---------------------------- |
| Cold start (first `lookup()` call)                                     | ~10 ms                       |
| `lookup()` / `exists()`                                                | ~4 µs/op                     |
| `format()` / `normalize()`                                             | < 0.5 µs/op                  |
| `distance()`                                                           | ~8 µs/op                     |
| `searchByCity` / `searchByProvince` (first call, builds index)         | ~100–160 ms                  |
| `nearby()` / `boundingBox()` (dense urban query, thousands of results) | 15–20 ms                     |
| Steady-state memory (all indices built)                                | ~140 MiB heap / ~330 MiB RSS |

### Why it's fast

The generated dataset (`postal-codes.bin`) is a flat, **sorted** binary
array of fixed-width 18-byte records — 6 bytes for the postal code, plus
packed province/timezone/city/lat/lng fields (see
[Dataset generation](#dataset-generation)). `lookup()` and `exists()`
binary-search that buffer directly: no upfront parse, no 900k-entry `Map`
built at import time. Cold start is just reading four small files.

`searchByCity`, `searchByProvince`, `nearby`, and `boundingBox` each need a
full pass over the dataset to build their index (a city/province grouping,
or a spatial grid). Those indices are built **lazily**, on first use, and
cached for the life of the process — so you only pay for what you actually
use. `nearby()`/`boundingBox()` are backed by a uniform grid
(`GridSpatialIndex`, ~11km cells) that's isolated behind a `SpatialIndex`
interface, so it can be swapped for a KD-tree or R-tree later without
touching the public API.

## Dataset generation

The source CSV (`data/CanadianPostalCodes202403.csv`, ~900k rows / ~50MB)
is never shipped and never read at runtime. It's a build-time-only input,
consumed by:

```sh
yarn build:data   # runs scripts/build-data.py
```

The script streams the CSV once (never loading it into memory as a whole),
dedupes postal codes (last occurrence wins), dictionary-encodes city and
province names, and writes to `generated/data/`:

- `postal-codes.bin` — sorted, fixed-width binary records (see above)
- `cities.json` / `provinces.json` — the dictionaries the binary records index into
- `meta.json` — schema/version metadata the runtime loader validates against

`yarn build` (tsup) then copies `generated/data/` into `dist/data/` and
bundles `src/` alongside it. The published package only contains `dist/`.

`generated/data/` (~15.5 MiB) is committed to the repository so CI and
fresh clones can run `yarn build`/`yarn test` without needing the 50 MiB
source CSV. The raw CSV under `data/` is gitignored — it's only needed if
you're regenerating the dataset from a newer Canada Post export.

If Canada Post's data format ever gains extra columns, `build-data.py`
only requires `POSTAL_CODE`, `CITY`, `PROVINCE_ABBR`, `LATITUDE`, and
`LONGITUDE` to be present — it adapts to the rest.

> ℹ️ **On coordinate quality:** the coordinates are only as precise as the source dataset's
> centroids. If you regenerate from a newer or higher-quality export, consider adding a
> build-time sanity pass (e.g. dropping or flagging any row whose coordinates fall outside a
> Canada bounding box) to catch the occasional bad record before it ships.

## Development

```sh
yarn install
yarn build:data   # generate dataset artifacts from the source CSV (once)
yarn build        # bundle with tsup
yarn test         # vitest
yarn bench        # run benchmarks
yarn lint         # eslint
yarn format       # prettier --write
```

## Contributing

Issues and pull requests are welcome. Please:

1. Run `yarn lint`, `yarn typecheck`, and `yarn test` before opening a PR.
2. Keep the public API surface small and stable — prefer extending an
   existing function's behavior over adding a near-duplicate one.
3. If you change the binary data format, bump `SCHEMA_VERSION` in
   `scripts/build-data.py` and update `src/data-loader.ts` accordingly.

## License

MIT
