#!/usr/bin/env node
/** Every gate, one exit code. */
const gates = [
  './check-geometry.mjs',
  './check-contrast.mjs',
  './check-theme-roles.mjs',
  './check-consumers.mjs',
  './check-print.mjs',
  './check-legibility.mjs',
  './check-safe-zones.mjs',
  './check-tight-bounds.mjs',
  './check-baselines.mjs',
  './check-dist-clean.mjs',
];
let failures = 0;
console.log('gates');
for (const g of gates) failures += (await import(g)).default();
console.log(failures ? `\n${failures} gate(s) failed` : '\nall gates pass');
process.exit(failures ? 1 : 0);
