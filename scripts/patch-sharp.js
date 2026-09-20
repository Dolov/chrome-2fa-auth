#!/usr/bin/env node
/**
 * 给 sharp@0.32.6 注入 stub `toGamut` 方法
 * Plasmo 0.88 内部调用了 sharp.toGamut，但 sharp 0.32 没有该方法（0.33+ 才加入）
 * 这是 Plasmo 0.88 + sharp 0.32.6 的兼容 bug
 *
 * 用法：在 Plasmo build 之前跑
 *   node scripts/patch-sharp.js
 */
const fs = require("node:fs")
const path = require("node:path")

const SHARP_PNPM_DIRS = fs
  .existsSync("node_modules/.pnpm")
  ? fs
    .readdirSync("node_modules/.pnpm")
    .filter((n) => n.startsWith("sharp@"))
    .map((n) => `node_modules/.pnpm/${n}/node_modules/sharp`)
  : []

const SHARP_DIRS = [
  fs.existsSync("node_modules/sharp") ? "node_modules/sharp" : null,
  ...SHARP_PNPM_DIRS
].filter(Boolean)

const MARKER = "__sharpToGamutStubPatch__"
const STUB = `\n// === patch: stub toGamut (Plasmo 0.88 compat) — ${MARKER} ===\nmodule.exports.toGamut = function __sharpToGamutStub__(input) { return input }\n`

let patched = 0
for (const dir of SHARP_DIRS) {
  const libFile = path.join(dir, "lib", "index.js")
  if (!fs.existsSync(libFile)) continue
  let src = fs.readFileSync(libFile, "utf8")
  src = src.replace(/\/\/ === patch:[\s\S]*?(?=\n\n|$)/g, "")
  src = src.replace(/^module\.exports\.toGamut\s*=.*$/gm, "")
  src = src.replace(/^sharp\.toGamut.*$/gm, "")
  if (src.includes(MARKER)) {
    console.log(`[patch-sharp] already patched ${libFile}`)
    continue
  }
  src = src.trimEnd() + "\n" + STUB
  fs.writeFileSync(libFile, src)
  patched++
  console.log(`[patch-sharp] patched ${libFile}`)
}
if (patched === 0) {
  console.warn("[patch-sharp] no sharp lib/index.js found")
}
process.exit(0)