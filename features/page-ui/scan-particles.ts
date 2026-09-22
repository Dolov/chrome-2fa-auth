/**
 * 扫描可视化粒子层（Scanner Dust）：canvas 绘制与生命周期。
 *
 * AUTOSCAN 原本是黑盒：popup 转 600ms 圈，页面什么都不发生。
 * 本模块把那段等待变成有物理因果的过程 —— 星点从页面边缘涌现、汇聚到候选
 * 元素上排出模块点阵，扑空的候选当场碎散，命中的候选被星点环绕流动。
 *
 * 类型、令牌、点阵几何在 `scan-particle-model.ts`；本文件只负责
 * 「拿到 `Particle[]` → 每帧推进相位 → 画到 canvas → 按时间轴推进阶段」。
 *
 * 硬约束：
 * - 零依赖手写 canvas。content bundle 预算 < 200 KB（CONTEXT 硬规则 2），
 *   引任何动画库都不划算。
 * - `prefers-reduced-motion` / 后台标签页 / 拿不到 2d context → 返回 `null`，
 *   调用方回落到 `scanPage()` + `highlightElement()`。
 * - 粒子池在创建时一次性分配，rAF 循环内零分配。
 * - 各阶段方法用 `sleep` 计时而不是等 rAF：标签页切到后台时 rAF 会停，
 *   计时不受影响，扫描照常收敛。
 *
 * 与 `utils/qr-decode.ts` 的契约只有一条：注入的根节点带 `SCAN_LAYER_ATTR`，
 * 否则候选收集会把这层全屏 canvas 自己当成候选。
 */

import { SCAN_LAYER_ATTR, SCAN_PALETTE } from "~/utils/constants"

import { contentBaseZindex } from "./css-portal"
import {
  approach,
  buildModuleTargets,
  clamp,
  createParticlePool,
  DUST_RADIUS,
  GEOMETRY,
  HUD,
  MODULE_RADIUS,
  pickTone,
  resolveProbeSlot,
  rgba,
  SHAPE_BY_PHASE,
  SHROUD,
  shuffle,
  TIMING
} from "./scan-particle-model"
import type {
  Bounds,
  ModuleTarget,
  Particle,
  ParticleShape,
  Point,
  ProbeMeta,
  ProbeSlot
} from "./scan-particle-model"
import { parkParticle, PARTICLE_UPDATE } from "./scan-particle-motion"

/**
 * 粒子层句柄。
 *
 * 所有阶段方法都返回 Promise，解析时刻由时间常量决定。
 */
export interface ScanParticlesHandle {
  awaken(): Promise<void>
  settle(): Promise<void>
  destroy(): void
  markHit(element: HTMLElement): Promise<void>
  markMiss(element: HTMLElement): Promise<void>
  convergeTo(element: HTMLElement, meta: ProbeMeta): Promise<void>
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

const shouldSkipAnimation = (): boolean =>
  document.hidden ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** 按视口面积派粒子，夹在上下限之间 */
const resolvePoolSize = (): number =>
  clamp(
    Math.round(
      (window.innerWidth * window.innerHeight) / GEOMETRY.areaPerParticle
    ),
    GEOMETRY.minParticles,
    GEOMETRY.maxParticles
  )

/**
 * 建立粒子层。返回 `null` 表示当前环境不适合做动画，调用方走无动画路径。
 */
export const createScanParticles = (): ScanParticlesHandle | null => {
  if (shouldSkipAnimation()) return null
  if (!document.body) return null

  const canvas = document.createElement("canvas")
  canvas.setAttribute(SCAN_LAYER_ATTR, "")
  canvas.style.position = "fixed"
  canvas.style.top = "0"
  canvas.style.left = "0"
  canvas.style.width = "100vw"
  canvas.style.height = "100vh"
  canvas.style.pointerEvents = "none"
  canvas.style.zIndex = `${contentBaseZindex}`
  document.body.appendChild(canvas)

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    canvas.remove()
    return null
  }

  let viewWidth = 0
  let viewHeight = 0
  let shroudAlpha = 0
  let shroudTarget: number = SHROUD.idle
  let hudAlpha = 0
  let hudTarget = 0
  let hudIndex = 0
  let hudTotal = 0
  let rafId: number | null = null
  let lastFrame = 0

  // 复用一个 bounds 对象：粒子回绕每帧都要它，不在帧循环里分配
  const bounds: Bounds = { width: 0, height: 0 }
  // 当前候选的一拍配额，由 convergeTo 写入、markMiss 复用
  let currentSlot: ProbeSlot = resolveProbeSlot(1)

  const poolSize = resolvePoolSize()
  const gridCapacity = Math.floor(poolSize * GEOMETRY.gridReserveRatio)
  const particles = createParticlePool(poolSize, gridCapacity)
  const gridPool = particles.slice(0, gridCapacity)
  const ambientPool = particles.slice(gridCapacity)

  const resize = () => {
    const ratio = window.devicePixelRatio || 1
    viewWidth = window.innerWidth
    viewHeight = window.innerHeight
    bounds.width = viewWidth
    bounds.height = viewHeight
    canvas.width = Math.round(viewWidth * ratio)
    canvas.height = Math.round(viewHeight * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  }

  /** 从视口外的一圈环带上取一个涌现点 */
  const scatterPoint = (): Point => {
    const angle = Math.random() * Math.PI * 2
    const radius =
      GEOMETRY.emitInner +
      Math.random() * (GEOMETRY.emitOuter - GEOMETRY.emitInner)

    return {
      x: viewWidth / 2 + Math.cos(angle) * viewWidth * radius,
      y: viewHeight / 2 + Math.sin(angle) * viewHeight * radius
    }
  }

  const updateOverlay = (dt: number) => {
    shroudAlpha = approach(shroudAlpha, shroudTarget, dt / TIMING.shroudFadeMs)
    hudAlpha = approach(hudAlpha, hudTarget, dt / TIMING.shroudFadeMs)
  }

  const drawDust = (particle: Particle) => {
    ctx.globalAlpha = particle.alpha
    ctx.fillStyle = rgba(SCAN_PALETTE[particle.tone], 1)
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, DUST_RADIUS[particle.tone], 0, Math.PI * 2)
    ctx.fill()
  }

  const drawModule = (particle: Particle) => {
    const radius = MODULE_RADIUS[particle.tone]
    ctx.fillStyle = rgba(SCAN_PALETTE[particle.tone], 1)

    if (particle.isFinder) {
      const bloom = radius * GEOMETRY.bloomScale
      ctx.globalAlpha = particle.alpha * GEOMETRY.bloomAlpha
      ctx.fillRect(particle.x - bloom, particle.y - bloom, bloom * 2, bloom * 2)
    }

    ctx.globalAlpha = particle.alpha
    ctx.fillRect(
      particle.x - radius,
      particle.y - radius,
      radius * 2,
      radius * 2
    )
  }

  const drawShape: Record<ParticleShape, (particle: Particle) => void> = {
    dust: drawDust,
    module: drawModule
  }

  const hudStateOf = (index: number): keyof typeof HUD.alphaByState => {
    if (index < hudIndex) return "done"
    if (index === hudIndex) return "current"
    return "pending"
  }

  /** 进度不是文本，是一排模块方块：走过的暗、当前的亮、未到的几乎透明 */
  const drawHud = () => {
    if (hudAlpha <= GEOMETRY.minVisibleAlpha) return
    if (hudTotal <= 0) return

    const stride = HUD.square + HUD.gap
    const originX = HUD.margin
    const originY = viewHeight - HUD.margin - HUD.square
    ctx.fillStyle = rgba(SCAN_PALETTE.ion, 1)

    for (let index = 0; index < hudTotal; index++) {
      ctx.globalAlpha = hudAlpha * HUD.alphaByState[hudStateOf(index)]
      ctx.fillRect(originX + index * stride, originY, HUD.square, HUD.square)
    }
  }

  const drawShroud = () => {
    if (shroudAlpha <= 0) return

    ctx.globalAlpha = 1
    ctx.fillStyle = rgba(SCAN_PALETTE.void, shroudAlpha)
    ctx.fillRect(0, 0, viewWidth, viewHeight)
  }

  const drawParticles = () => {
    for (const particle of particles) {
      if (particle.alpha <= GEOMETRY.minVisibleAlpha) continue
      drawShape[SHAPE_BY_PHASE[particle.phase]](particle)
    }

    ctx.globalAlpha = 1
  }

  const tick = (now: number) => {
    const dt = Math.min(now - lastFrame, GEOMETRY.maxFrameMs)
    lastFrame = now

    for (const particle of particles)
      PARTICLE_UPDATE[particle.phase](particle, dt, bounds)
    updateOverlay(dt)

    ctx.clearRect(0, 0, viewWidth, viewHeight)
    drawShroud()
    drawParticles()
    drawHud()

    rafId = window.requestAnimationFrame(tick)
  }

  /** 给一个粒子绑上从环带飞向落点的弧线 */
  const startConverge = (
    particle: Particle,
    target: ModuleTarget | undefined,
    duration: number
  ) => {
    if (target == null) {
      parkParticle(particle)
      return
    }

    const origin = scatterPoint()
    const motion = particle.motion
    const deltaX = target.x - origin.x
    const deltaY = target.y - origin.y
    const distance = Math.hypot(deltaX, deltaY) || 1
    const bend = (Math.random() - 0.5) * distance * GEOMETRY.bendRatio

    motion.origin.x = origin.x
    motion.origin.y = origin.y
    motion.control.x = (origin.x + target.x) / 2 + (-deltaY / distance) * bend
    motion.control.y = (origin.y + target.y) / 2 + (deltaX / distance) * bend
    motion.target.x = target.x
    motion.target.y = target.y
    motion.elapsed = 0
    motion.duration = duration

    particle.x = origin.x
    particle.y = origin.y
    particle.alpha = 0
    particle.isFinder = target.isFinder
    particle.phase = "converge"
    particle.targetAlpha = 0.85
    particle.tone = "dust"

    if (!target.isFinder) return
    particle.targetAlpha = 1
    particle.tone = "ion"
  }

  /** 三个定位图案角保留暖白锁定闪光，其余从权重袋抽 */
  const assignOrbitTone = (particle: Particle) => {
    if (particle.isFinder) {
      particle.tone = "lock"
      return
    }

    particle.tone = pickTone()
  }

  /** 命中时把粒子留在原地继续呼吸，点阵因此保持可见 = "二维码被钉住" */
  const holdGridParticle = (particle: Particle) => {
    particle.phase = "grid"
    particle.targetAlpha = 1
    if (!particle.isFinder) return
    particle.tone = "lock"
  }

  /**
   * 把粒子从当前位置"剥离"到环绕轨道上。
   *
   * 轨道角度**按序号均匀分配**（而非从当前位置推导）：沿着点阵分布的角度会
   * 挤在四个角附近，整环一起转时看起来是一团而不是一圈。
   * 为了避免瞬移，用 `lift` 相位真正飞过去，落点与轨道角度严格对齐。
   */
  const launchOrbit = (
    particle: Particle,
    index: number,
    total: number,
    rect: DOMRect,
    centerX: number,
    centerY: number
  ) => {
    const step = (Math.PI * 2) / Math.max(1, total)
    const angle = index * step + (Math.random() - 0.5) * step
    const spread = 1 + Math.random() * GEOMETRY.orbitSpread
    const radiusX = (rect.width / 2 + GEOMETRY.orbitInset) * spread
    const radiusY = (rect.height / 2 + GEOMETRY.orbitInset) * spread
    const targetX = centerX + Math.cos(angle) * radiusX
    const targetY = centerY + Math.sin(angle) * radiusY
    const motion = particle.motion

    motion.origin.x = particle.x
    motion.origin.y = particle.y
    // 控制点向外鼓出：路径先离开点阵再折回轨道，读作"剥离"而不是平移
    motion.control.x =
      (particle.x + targetX) / 2 + (targetX - centerX) * GEOMETRY.liftBulge
    motion.control.y =
      (particle.y + targetY) / 2 + (targetY - centerY) * GEOMETRY.liftBulge
    motion.target.x = targetX
    motion.target.y = targetY
    motion.elapsed = 0
    motion.duration = TIMING.liftMs

    particle.phase = "lift"
    particle.alpha = 1
    particle.targetAlpha = 0.72 + Math.random() * 0.28
    particle.orbitAngle = angle
    particle.orbitCenterX = centerX
    particle.orbitCenterY = centerY
    particle.orbitRadiusX = radiusX
    particle.orbitRadiusY = radiusY
    particle.orbitSpeed =
      GEOMETRY.orbitSpeed *
      (0.7 + Math.random() * 0.6) *
      (Math.random() < 0.35 ? -1 : 1)
    assignOrbitTone(particle)
  }

  /**
   * 命中：定位图案与一部分粒子留在点阵上，其余（含全部环境星尘）改走椭圆轨道。
   *
   * 全部拉去环绕会让二维码瞬间"失去点阵"，读起来只是光圈而不是锁定；
   * 留一部分钉在原位，才能同时看到 `网格 + 环绕` 两层。
   * 先定下"谁留下"再统一发号，环上的角度才能均匀分完。
   */
  const assignOrbit = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const launched: Particle[] = []

    for (const particle of gridPool) {
      if (particle.isFinder) {
        holdGridParticle(particle)
        continue
      }
      if (Math.random() < GEOMETRY.gridHoldRatio) {
        holdGridParticle(particle)
        continue
      }
      launched.push(particle)
    }

    launched.push(...ambientPool)
    launched.forEach((particle, index) => {
      launchOrbit(particle, index, launched.length, rect, centerX, centerY)
    })
  }

  /** 扑空：方块退化回尘埃，沿元素中心的径向散开并熄灭 */
  const disperseAll = (element: HTMLElement, fadeMs: number) => {
    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    for (const particle of particles) {
      const angle = Math.atan2(particle.y - centerY, particle.x - centerX)
      const speed =
        GEOMETRY.disperseSpeed + Math.random() * GEOMETRY.disperseSpread

      particle.phase = "disperse"
      particle.isFinder = false
      particle.targetAlpha = 0
      particle.tone = "decay"
      particle.driftX = Math.cos(angle) * speed
      particle.driftY = Math.sin(angle) * speed
      particle.motion.duration = fadeMs
    }
  }

  const scatterAmbient = () => {
    for (const particle of ambientPool) {
      particle.x = Math.random() * viewWidth
      particle.y = Math.random() * viewHeight
      particle.alpha = 0
      particle.targetAlpha = 0.28 + Math.random() * 0.3
      particle.phase = "field"
      particle.driftX = (Math.random() - 0.5) * GEOMETRY.ambientDrift
      particle.driftY = (Math.random() - 0.5) * GEOMETRY.ambientDrift
    }
  }

  const awaken = async (): Promise<void> => {
    resize()
    scatterAmbient()

    shroudTarget = SHROUD.scan
    hudTarget = 1
    lastFrame = performance.now()
    rafId = window.requestAnimationFrame(tick)

    await sleep(TIMING.awakenMs)
  }

  const convergeTo = async (
    element: HTMLElement,
    meta: ProbeMeta
  ): Promise<void> => {
    const targets = buildModuleTargets(element.getBoundingClientRect())
    const order = shuffle(targets.length)
    const slot = resolveProbeSlot(meta.total)

    hudIndex = meta.index
    hudTotal = meta.total
    currentSlot = slot

    gridPool.forEach((particle, index) => {
      const targetIndex = order[index]
      const target = targetIndex == null ? undefined : targets[targetIndex]
      startConverge(particle, target, slot.convergeMs)
    })

    // 汇聚 + 停一拍：这段时间与解码并行，jsQR 慢时点阵会停在原地呼吸
    await sleep(slot.convergeMs + slot.holdMs)
  }

  const markHit = async (element: HTMLElement): Promise<void> => {
    shroudTarget = SHROUD.orbit
    assignOrbit(element)

    await sleep(TIMING.orbitMs)
  }

  const markMiss = async (element: HTMLElement): Promise<void> => {
    disperseAll(element, currentSlot.disperseMs)

    await sleep(currentSlot.disperseMs)
  }

  const settle = async (): Promise<void> => {
    shroudTarget = SHROUD.idle
    hudTarget = 0

    // 压暗层淡出的同时把粒子的目标透明度拉到 0，避免 canvas 被抽走时"瞬删"
    for (const particle of particles) particle.targetAlpha = 0

    await sleep(TIMING.settleMs)
  }

  const destroy = () => {
    if (rafId != null) window.cancelAnimationFrame(rafId)
    rafId = null
    window.removeEventListener("resize", resize)
    canvas.remove()
  }

  window.addEventListener("resize", resize)

  return { awaken, settle, destroy, markHit, markMiss, convergeTo }
}
