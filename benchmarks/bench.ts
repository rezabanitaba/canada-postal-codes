/**
 * Benchmarks for canada-postal-codes.
 *
 * Run with `yarn bench`. Not a substitute for a statistically rigorous
 * benchmarking harness (e.g. tinybench) - the goal here is a quick, honest
 * read on the numbers the README's performance section talks about:
 * cold-start cost, steady-state lookup speed, and memory footprint.
 */
import {
  boundingBox,
  distance,
  exists,
  format,
  lookup,
  nearby,
  nearest,
  normalize,
  random,
  searchByCity,
  searchByProvince,
} from "../src/index.js";

function formatMs(ns: bigint): string {
  return `${(Number(ns) / 1e6).toFixed(3)} ms`;
}

function formatUs(ns: bigint, ops: number): string {
  return `${(Number(ns) / ops / 1e3).toFixed(3)} µs/op`;
}

function formatMiB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function time<T>(fn: () => T): { result: T; elapsed: bigint } {
  const start = process.hrtime.bigint();
  const result = fn();
  const elapsed = process.hrtime.bigint() - start;
  return { result, elapsed };
}

function main(): void {
  console.log("canada-postal-codes benchmarks\n");

  // --- Cold start ------------------------------------------------------
  const memBefore = process.memoryUsage();
  const { elapsed: coldLookup } = time(() => lookup("V6B1A1"));
  const memAfterLookup = process.memoryUsage();

  console.log("Cold start (first call triggers dataset load + binary parse):");
  console.log(`  first lookup():        ${formatMs(coldLookup)}`);
  console.log(
    `  heap used delta:       ${formatMiB(memAfterLookup.heapUsed - memBefore.heapUsed)}`,
  );
  console.log(`  rss delta:             ${formatMiB(memAfterLookup.rss - memBefore.rss)}`);
  console.log();

  // --- Lazy secondary indices -------------------------------------------
  const { elapsed: cityIndexBuild } = time(() => searchByCity("Vancouver"));
  const { elapsed: provinceIndexBuild } = time(() => searchByProvince("ON"));
  const { elapsed: spatialIndexBuild } = time(() => nearby(49.283756, -123.106033, 1));
  const memAfterIndices = process.memoryUsage();

  console.log("Lazy secondary indices (built once, on first use):");
  console.log(`  searchByCity (+build): ${formatMs(cityIndexBuild)}`);
  console.log(`  searchByProvince:      ${formatMs(provinceIndexBuild)} (indices shared/cached)`);
  console.log(`  nearby (+grid build):  ${formatMs(spatialIndexBuild)}`);
  console.log(
    `  heap used delta:       ${formatMiB(memAfterIndices.heapUsed - memAfterLookup.heapUsed)}`,
  );
  console.log();

  // --- Steady-state lookup speed ----------------------------------------
  const sampleCodes = Array.from({ length: 1000 }, () => random().postalCode);
  const ITERATIONS = 200_000;

  const { elapsed: lookupElapsed } = time(() => {
    for (let i = 0; i < ITERATIONS; i++) {
      lookup(sampleCodes[i % sampleCodes.length]!);
    }
  });

  const { elapsed: existsElapsed } = time(() => {
    for (let i = 0; i < ITERATIONS; i++) {
      exists(sampleCodes[i % sampleCodes.length]!);
    }
  });

  const { elapsed: formatElapsed } = time(() => {
    for (let i = 0; i < ITERATIONS; i++) {
      format(sampleCodes[i % sampleCodes.length]!);
    }
  });

  const { elapsed: normalizeElapsed } = time(() => {
    for (let i = 0; i < ITERATIONS; i++) {
      normalize(sampleCodes[i % sampleCodes.length]!);
    }
  });

  console.log(`Steady-state throughput (${ITERATIONS.toLocaleString()} iterations):`);
  console.log(`  lookup():    ${formatUs(lookupElapsed, ITERATIONS)}`);
  console.log(`  exists():    ${formatUs(existsElapsed, ITERATIONS)}`);
  console.log(`  format():    ${formatUs(formatElapsed, ITERATIONS)}`);
  console.log(`  normalize(): ${formatUs(normalizeElapsed, ITERATIONS)}`);
  console.log();

  // --- Spatial / misc ----------------------------------------------------
  const { elapsed: distanceElapsed } = time(() => {
    for (let i = 0; i < 50_000; i++) distance("V6B1A1", "M4C1S9");
  });
  const { elapsed: nearbyElapsed } = time(() => {
    for (let i = 0; i < 1000; i++) nearby(49.283756, -123.106033, 5);
  });
  const { elapsed: boundingBoxElapsed } = time(() => {
    for (let i = 0; i < 1000; i++) boundingBox(49.2, -123.2, 49.35, -123.0);
  });
  const { elapsed: nearestElapsed } = time(() => {
    for (let i = 0; i < 1000; i++) nearest("V6B1A1");
  });

  console.log("Other operations:");
  console.log(`  distance():    ${formatUs(distanceElapsed, 50_000)}`);
  console.log(`  nearby(5km):   ${formatUs(nearbyElapsed, 1000)}`);
  console.log(`  boundingBox(): ${formatUs(boundingBoxElapsed, 1000)}`);
  console.log(`  nearest():     ${formatUs(nearestElapsed, 1000)}`);
  console.log();

  const memFinal = process.memoryUsage();
  console.log("Final memory usage:");
  console.log(`  heapUsed: ${formatMiB(memFinal.heapUsed)}`);
  console.log(`  rss:      ${formatMiB(memFinal.rss)}`);
}

main();
