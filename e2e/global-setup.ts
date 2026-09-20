/**
 * Global setup — 在所有 test 跑之前执行一次
 * 1. pnpm build Plasmo 扩展产物（如 build/chrome-mv3-prod 不存在或过期）
 * 2. sharp monkey-patch（Plasmo 0.88 + sharp 0.32 兼容）
 * 3. 安装 playwright chromium（仅 CI）
 *
 * 节省：避免每个 worker 重新 build，避免每个 spec 重新 patch
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const EXT_PATH = path.resolve(process.env.EXT_PATH ?? "build/chrome-mv3-prod")

function log(msg: string): void {
  console.log(`[global-setup] ${msg}`)
}

function run(cmd: string): void {
  log(`$ ${cmd}`)
  execSync(cmd, { stdio: "inherit" })
}

export default async function globalSetup(): Promise<void> {
  // 1. sharp monkey-patch（Plasmo 0.88 + sharp 0.32 兼容 bug）
  log("patching sharp.toGamut stub")
  run("node scripts/patch-sharp.js")

  // 2. build 扩展产物
  if (!fs.existsSync(EXT_PATH) || !fs.existsSync(path.join(EXT_PATH, "manifest.json"))) {
    log(`build产物不存在 (${EXT_PATH})，开始 build`)
    run("./node_modules/.bin/plasmo build")
  } else {
    log(`build产物已存在: ${EXT_PATH}`)
  }

  // 3. 装 playwright bundled chromium（必须！系统 Chrome 不支持 --load-extension）
  log("装 playwright chromium（官方要求）")
  run("pnpm exec playwright install chromium")
}