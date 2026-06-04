#!/usr/bin/env node
/**
 * CatTower 번들 병목 요약 — vite build 후 dist/assets 기준
 * 사용: node scripts/cattower-perf-report.mjs
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist", "assets");
const files = readdirSync(dist).filter((f) => f.endsWith(".js"));

const rows = files
  .map((name) => {
    const path = join(dist, name);
    const bytes = statSync(path).size;
    return { name, kb: Math.round(bytes / 1024) };
  })
  .sort((a, b) => b.kb - a.kb);

const total = rows.reduce((s, r) => s + r.kb, 0);
const rive = rows.filter((r) => r.name.includes("rive"));
const main = rows.filter((r) => r.name.startsWith("index-"));

console.log("\n=== CatTower / Frontend bundle (production) ===\n");
console.log(`Total JS chunks: ${total} KB (${rows.length} files)\n`);
console.log("Top chunks:");
for (const r of rows.slice(0, 8)) {
  console.log(`  ${String(r.kb).padStart(5)} KB  ${r.name}`);
}
if (rive.length) {
  console.log(`\nRive chunk(s): ${rive.reduce((s, r) => s + r.kb, 0)} KB — CatTower LCP 주요 후보`);
}
if (main.length) {
  console.log(`Main chunk(s): ${main.reduce((s, r) => s + r.kb, 0)} KB`);
}
console.log("\n권장: React Profiler에서 <CatTowerRoomStage>, <RiveCatPlayer> 렌더 시간 확인");
console.log("권장: Network에서 /page, guestbooks, visitors 호출 타이밍 확인\n");
