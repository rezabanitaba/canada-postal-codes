#!/usr/bin/env python3
"""
Build-time data pipeline for canada-postal-codes.

Streams the source CSV (never loading the raw file into memory) and produces
a compact set of runtime artifacts under generated/data/:

  postal-codes.bin  - fixed-width binary records, sorted by postal code
  cities.json       - city name dictionary, indexed by the city index stored
                       in each binary record
  provinces.json    - province abbreviation dictionary, indexed by the
                       province index stored in each binary record
  meta.json         - schema/version metadata consumed by the TS loader

Binary record layout (little-endian, 18 bytes per record):

  offset  size  field           type
  0       6     postal code     ASCII, no space, e.g. "V6B1A1"
  6       1     province index  uint8  (index into provinces.json)
  7       1     timezone        int8   (raw UTC offset hours, as sourced)
  8       2     city index      uint16 (index into cities.json)
  10      4     latitude        float32
  14      4     longitude       float32

Records are sorted ascending by postal code, which keeps the artifact
deterministic and leaves the door open for binary-search-based lookups in
the future without needing to regenerate the data.
"""

from __future__ import annotations

import csv
import json
import re
import struct
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_CSV = ROOT / "data" / "CanadianPostalCodes202403.csv"
OUT_DIR = ROOT / "generated" / "data"

POSTAL_CODE_RE = re.compile(r"^[A-Z]\d[A-Z]\d[A-Z]\d$")

RECORD_STRUCT = struct.Struct("<6sBbHff")
assert RECORD_STRUCT.size == 18

SCHEMA_VERSION = 1


def normalize_postal_code(raw: str) -> str:
    return raw.replace(" ", "").strip().upper()


def build() -> None:
    if not SOURCE_CSV.exists():
        print(f"error: source CSV not found at {SOURCE_CSV}", file=sys.stderr)
        sys.exit(1)

    start = time.time()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    records: dict[str, tuple[str, str, int, float, float]] = {}
    provinces: set[str] = set()
    cities: set[str] = set()

    total_rows = 0
    skipped_invalid = 0
    duplicates = 0

    print(f"streaming {SOURCE_CSV.name} ...")
    with SOURCE_CSV.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        # Adapt to whatever columns are present, keyed by the documented
        # schema, so minor upstream CSV changes don't break the build.
        fieldnames = {name.strip().upper() for name in (reader.fieldnames or [])}
        required = {"POSTAL_CODE", "CITY", "PROVINCE_ABBR", "LATITUDE", "LONGITUDE"}
        missing = required - fieldnames
        if missing:
            print(f"error: CSV is missing required columns: {missing}", file=sys.stderr)
            sys.exit(1)
        has_timezone = "TIME_ZONE" in fieldnames

        for row in reader:
            total_rows += 1

            postal_code = normalize_postal_code(row["POSTAL_CODE"])
            if not POSTAL_CODE_RE.match(postal_code):
                skipped_invalid += 1
                continue

            city = row["CITY"].strip().upper()
            province = row["PROVINCE_ABBR"].strip().upper()

            try:
                lat = float(row["LATITUDE"])
                lng = float(row["LONGITUDE"])
            except (TypeError, ValueError):
                skipped_invalid += 1
                continue

            timezone = 0
            if has_timezone:
                raw_tz = (row.get("TIME_ZONE") or "").strip()
                if raw_tz:
                    try:
                        timezone = int(float(raw_tz))
                    except ValueError:
                        timezone = 0

            if postal_code in records:
                duplicates += 1
            # Last occurrence wins; the source file is generally append-ordered
            # with corrections appearing later.
            records[postal_code] = (city, province, timezone, lat, lng)
            provinces.add(province)
            cities.add(city)

    print(
        f"parsed {total_rows:,} rows -> {len(records):,} unique postal codes "
        f"({duplicates:,} duplicates, {skipped_invalid:,} skipped as invalid)"
    )

    province_list = sorted(provinces)
    city_list = sorted(cities)
    province_index = {name: i for i, name in enumerate(province_list)}
    city_index = {name: i for i, name in enumerate(city_list)}

    if len(province_list) > 255:
        print("error: province dictionary exceeds uint8 range", file=sys.stderr)
        sys.exit(1)
    if len(city_list) > 65535:
        print("error: city dictionary exceeds uint16 range", file=sys.stderr)
        sys.exit(1)

    sorted_codes = sorted(records.keys())

    bin_path = OUT_DIR / "postal-codes.bin"
    with bin_path.open("wb") as out:
        for code in sorted_codes:
            city, province, timezone, lat, lng = records[code]
            out.write(
                RECORD_STRUCT.pack(
                    code.encode("ascii"),
                    province_index[province],
                    max(-128, min(127, timezone)),
                    city_index[city],
                    lat,
                    lng,
                )
            )

    (OUT_DIR / "cities.json").write_text(
        json.dumps(city_list, separators=(",", ":")), encoding="utf-8"
    )
    (OUT_DIR / "provinces.json").write_text(
        json.dumps(province_list, separators=(",", ":")), encoding="utf-8"
    )

    meta = {
        "schemaVersion": SCHEMA_VERSION,
        "recordCount": len(sorted_codes),
        "recordSize": RECORD_STRUCT.size,
        "recordFormat": "<6sBbHff",
        "fields": [
            "postalCode",
            "provinceIndex",
            "timezone",
            "cityIndex",
            "latitude",
            "longitude",
        ],
        "provinceCount": len(province_list),
        "cityCount": len(city_list),
        "sourceFile": SOURCE_CSV.name,
        "sourceRowCount": total_rows,
        "duplicatesResolved": duplicates,
        "skippedInvalidRows": skipped_invalid,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (OUT_DIR / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    elapsed = time.time() - start
    bin_size_mb = bin_path.stat().st_size / (1024 * 1024)
    print(f"wrote {bin_path} ({bin_size_mb:.2f} MiB)")
    print(f"wrote cities.json ({len(city_list):,} entries), provinces.json ({len(province_list)} entries)")
    print(f"done in {elapsed:.2f}s")


if __name__ == "__main__":
    build()
