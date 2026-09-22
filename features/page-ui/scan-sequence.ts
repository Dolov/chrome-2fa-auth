/**
 * 扫码可视化编排（Scan Sequence）
 *
 * 把 `AUTOSCAN` 的黑盒等待变成有因果的仪式：
 * 星点从页面边缘涌现 → 汇聚到候选元素排出模块点阵 → 扑空即碎散、
 * 命中即环绕流动 + 三个定位图案点暖白锁定。
 *
 * 逐候选是**忠实串行**的：先让用户看见星点飞向哪里，再给判定。
 * 但解码与汇聚动画并行，jsQR 的延迟藏在动画时长里。
 *
 * 两条降级路径（都不做动画，直接回到旧行为）：
 * - `createScanParticles()` 返回 `null`（prefers-reduced-motion / 后台标签页）；
 * - 预算内的候选全扑空 → 回落裸 `scanPage()`。
 *   候选预算（可视 + 最小边长 + 上限 8）必然会漏掉一些元素，
 *   这一层兜底保证「过滤只影响动画，不影响找回二维码的能力」。
 *
 * 本模块只服务 `AUTOSCAN`。GitHub / NPM 的站点自动填充（`read-qr.ts`）
 * 走的是另一条链路，不受这里影响。
 */

import {
  collectScanCandidates,
  decodeCandidate,
  scanPage,
  warmUpDecoder
} from "~/utils/qr-decode"
import type { QRScanResult, ScanCandidate } from "~/utils/qr-decode"

import { highlightElement } from "./highlight"
import { createScanParticles } from "./scan-particles"
import type { ScanParticlesHandle } from "./scan-particles"

/**
 * 同一时刻只允许一条可视化扫描。
 *
 * 并发到达（FAB 连点）时不排队也不报错，直接走无动画路径 ——
 * 两层粒子同时抢一张 canvas 只会互相覆盖。
 */
let isScanning = false

/** 无动画路径统一用旧的彩虹脉冲收尾，保证降级后仍有"扫到了"的反馈 */
const scanWithoutAnimation = async (): Promise<QRScanResult> => {
  const result = await scanPage()
  highlightElement(result.element)
  return result
}

const probeOne = async (
  particles: ScanParticlesHandle,
  candidate: ScanCandidate,
  index: number,
  total: number
): Promise<QRScanResult | null> => {
  // 解码与汇聚同时开始：先起 promise，再等动画，最后取结果
  const pending = decodeCandidate(candidate)

  await particles.convergeTo(candidate.element, { index, total })

  const data = await pending
  if (data == null) {
    await particles.markMiss(candidate.element)
    return null
  }

  await particles.markHit(candidate.element)
  await particles.settle()
  return { data, element: candidate.element }
}

export const runVisualScan = async (): Promise<QRScanResult> => {
  if (isScanning) return scanWithoutAnimation()

  // 收集必须在建粒子层之前：粒子层的全屏 canvas 会出现在 querySelectorAll 里
  const candidates = collectScanCandidates()
  if (candidates.length === 0) return scanWithoutAnimation()

  const particles = createScanParticles()
  if (!particles) return scanWithoutAnimation()

  isScanning = true
  try {
    warmUpDecoder()
    await particles.awaken()

    for (const [index, candidate] of candidates.entries()) {
      const found = await probeOne(
        particles,
        candidate,
        index,
        candidates.length
      )
      if (found != null) return found
    }

    await particles.settle()
    return await scanWithoutAnimation()
  } finally {
    isScanning = false
    particles.destroy()
  }
}
