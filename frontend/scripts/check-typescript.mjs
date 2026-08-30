#!/usr/bin/env node
// ==================================================
// FILE: frontend/scripts/check-typescript.mjs
// FUNGSI: Jalankan tsc --noEmit, tapi hanya gagalkan CI kalau ada error
// BARU (di luar known-typescript-issues.txt). Utang teknis lama tetap
// tercatat & terlihat, tapi tidak memblokir pipeline setiap kali push.
// ==================================================

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(rootDir, 'known-typescript-issues.txt');

const baseline = new Set(
  readFileSync(baselinePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
);

let output = '';
try {
  output = execSync('npx tsc --noEmit -p tsconfig.json', {
    cwd: rootDir,
    encoding: 'utf8',
  });
} catch (error) {
  output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
}

const errorLineRegex = /^(.+?)\(\d+,\d+\): error (TS\d+):/;
const ditemukan = new Set();
const barisBaru = [];

for (const line of output.split('\n')) {
  const match = line.match(errorLineRegex);
  if (!match) continue;

  const key = `${match[1]}::${match[2]}`;
  ditemukan.add(key);

  if (!baseline.has(key)) {
    barisBaru.push(line.trim());
  }
}

if (barisBaru.length > 0) {
  console.error('Ditemukan error TypeScript BARU (di luar known-typescript-issues.txt):\n');
  for (const baris of barisBaru) {
    console.error(`  ${baris}`);
  }
  console.error(
    '\nKalau ini bug baru dari perubahan Anda: perbaiki dulu sebelum push.' +
      '\nKalau ini memang utang teknis lama yang baru ketahuan: tambahkan barisnya ke frontend/known-typescript-issues.txt.',
  );
  process.exit(1);
}

const sisaUtang = [...baseline].filter((key) => ditemukan.has(key));
console.log(
  `Tidak ada error TypeScript baru. (${sisaUtang.length}/${baseline.size} utang teknis lama masih ada, sudah tercatat.)`,
);
process.exit(0);
