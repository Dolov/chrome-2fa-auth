/**
 * 扫描可视化粒子层的模型层：类型、令牌、数学与点阵几何。
 *
 * 这里**不碰 canvas**，只描述"粒子长什么样、怎么动、落在哪里"。
 * 绘制与生命周期在 `scan-particles.ts`，两者的边界是 `Particle[]`。
 * 拆开的理由有两个：文件行数上限，以及让点阵几何可以脱离 rAF 单独推演。
 *
 * **视觉语言全部取自二维码本身**，不是通用"科技感粒子"：
 * - 落点是模块网格（module grid），不是随机散布
 * - 三个定位图案（finder pattern）角上的粒子更亮更大 —— 对应 QR 的三个角标
 * - 形态即阶段：飞行中是圆点（尘埃），落定后是方块（模块）；扑空时方块退化回尘埃
 * - 进度指示不是 `07 / 12` 文本，而是一排模块方块
 */

/** 一次探测的序号信息，驱动角标进度方块 */
export interface ProbeMeta {
  index: number
  total: number
}

export type ParticleTone = "ion" | "dust" | "flux" | "lock" | "decay"

export type ParticlePhase =
  | "grid"
  | "lift"
  | "field"
  | "orbit"
  | "parked"
  | "converge"
  | "disperse"

export type ParticleShape = "dust" | "module"

export interface Point {
  x: number
  y: number
}

/**
 * 一条运动段：二次贝塞尔轨迹 + 该段时长。
 *
 * 粒子复用同一个对象，循环内只改字段；`duration` 就是"本段多长"，
 * 消散段也借用它来控制淡出速度。
 */
export interface Motion {
  origin: Point
  target: Point
  control: Point
  elapsed: number
  duration: number
}

export interface Particle {
  x: number
  y: number
  seed: number
  tone: ParticleTone
  alpha: number
  phase: ParticlePhase
  isFinder: boolean
  targetAlpha: number
  driftX: number
  driftY: number
  motion: Motion
  orbitAngle: number
  orbitSpeed: number
  orbitCenterX: number
  orbitCenterY: number
  orbitRadiusX: number
  orbitRadiusY: number
}

/** 模块点阵上的一个落点 */
export interface ModuleTarget {
  x: number
  y: number
  isFinder: boolean
}

/** 环境星尘回绕用的视口尺寸 */
export interface Bounds {
  width: number
  height: number
}

/** 时间轴（毫秒） */
export const TIMING = {
  // 开场：压暗层淡入 + 环境星尘铺开
  awakenMs: 160,
  // 相位切换的 alpha 缓动
  transitionMs: 120,
  // 命中后的环绕 —— 整段预算里最贵的一拍，是"认出来了"的回报
  // 先花 liftMs 从点阵剥离到轨道上，剩下的时间绕圈
  liftMs: 260,
  orbitMs: 700,
  // 收尾：压暗层与角标淡出
  settleMs: 260,
  shroudFadeMs: 220
} as const

/**
 * 一次 AUTOSCAN 可视化的总时长预算（毫秒）。
 *
 * 这是**整段扫描**的预算，不是单个候选的：`resolveProbeSlot` 按候选数量把它
 * 切成每候选一拍，于是 1 个候选和 4 个候选的总时长一致（均约 2s）。
 * 只有当单拍触到 `floorMs` 时才会超预算（8 个候选约 3s）——
 * 宁可偶尔超时，也不让每一拍短到读不懂。
 */
export const VISUAL_BUDGET_MS = 2000

/** 单候选一拍的配额与切分比例 */
export const PROBE_SLOT = {
  floorMs: 320,
  ceilMs: 900,
  convergeShare: 0.55,
  holdShare: 0.25,
  disperseShare: 0.2
} as const

export interface ProbeSlot {
  convergeMs: number
  holdMs: number
  disperseMs: number
}

/**
 * 把总预算切成单候选一拍。
 *
 * 先扣掉开场、环绕（命中后必然发生，所以先记账）和收尾，剩下的按候选数平分。
 */
export const resolveProbeSlot = (total: number): ProbeSlot => {
  const overhead = TIMING.awakenMs + TIMING.orbitMs + TIMING.settleMs
  const slot = clamp(
    (VISUAL_BUDGET_MS - overhead) / Math.max(1, total),
    PROBE_SLOT.floorMs,
    PROBE_SLOT.ceilMs
  )

  return {
    convergeMs: Math.round(slot * PROBE_SLOT.convergeShare),
    holdMs: Math.round(slot * PROBE_SLOT.holdShare),
    disperseMs: Math.round(slot * PROBE_SLOT.disperseShare)
  }
}

export const GEOMETRY = {
  // 密度：按视口面积派粒子，夹在上下限之间
  minParticles: 130,
  maxParticles: 300,
  areaPerParticle: 9000,
  gridReserveRatio: 0.8,
  /** 命中后留在点阵上"钉住"二维码的粒子比例，其余改走环绕轨道 */
  gridHoldRatio: 0.35,
  // 模块网格
  gridMax: 12,
  gridPitch: 16,
  gridInset: 4,
  // 粒子半径
  dustRadius: 1.3,
  moduleRadius: 2.4,
  finderRadius: 3.2,
  // 廉价 bloom：低透明度放大方块，替代昂贵的 shadowBlur。
  // 必须有 —— 光点叠在二维码自身的高对比图案上，没有光晕会被吞掉
  bloomAlpha: 0.2,
  bloomScale: 2.8,
  /** 定位图案的光晕再强一档，让三个角标成为视觉锚点 */
  finderBloomBoost: 1.8,
  // 环绕轨道
  orbitInset: 10,
  orbitSpeed: 0.003,
  orbitSpread: 0.18,
  // 漂移与消散
  ambientDrift: 0.02,
  disperseSpeed: 0.12,
  disperseSpread: 0.22,
  // 落定后的原地呼吸
  shimmerSpeed: 0.006,
  shimmerAmplitude: 0.9,
  // 星点涌现的环带半径（相对视口宽高）
  emitInner: 0.5,
  emitOuter: 0.72,
  // 汇聚路径的弧度比例
  bendRatio: 0.5,
  /** 从点阵"剥离"到环绕轨道时，控制点向外鼓出的比例 */
  liftBulge: 0.28,
  // 其他
  maxFrameMs: 48,
  wrapMargin: 24,
  minVisibleAlpha: 0.02
} as const

/** 压暗层目标不透明度：环绕阶段加深，让发亮的二维码跳出来 */
export const SHROUD = { idle: 0, scan: 0.68, orbit: 0.78 } as const

/** 角标进度方块，以及三种状态的透明度 */
export const HUD = {
  gap: 4,
  square: 7,
  margin: 26,
  alphaByState: { done: 0.26, current: 1, pending: 0.1 } as const
}

/** 环绕阶段的色调权重袋：定位图案拿 `lock`，其余从这里抽 */
const ORBIT_TONES: ParticleTone[] = ["ion", "ion", "ion", "flux", "dust"]

export const MODULE_RADIUS: Record<ParticleTone, number> = {
  ion: GEOMETRY.finderRadius,
  dust: GEOMETRY.moduleRadius,
  flux: GEOMETRY.moduleRadius,
  lock: GEOMETRY.finderRadius,
  decay: GEOMETRY.moduleRadius
}

export const DUST_RADIUS: Record<ParticleTone, number> = {
  ion: GEOMETRY.finderRadius,
  dust: GEOMETRY.dustRadius,
  flux: GEOMETRY.dustRadius,
  lock: GEOMETRY.finderRadius,
  decay: GEOMETRY.dustRadius
}

export const SHAPE_BY_PHASE: Record<ParticlePhase, ParticleShape> = {
  grid: "module",
  lift: "module",
  field: "dust",
  orbit: "module",
  parked: "dust",
  converge: "module",
  disperse: "dust"
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const rgba = (triple: string, alpha: number): string =>
  `rgba(${triple}, ${alpha})`

export const approach = (value: number, target: number, step: number): number =>
  value + Math.sign(target - value) * Math.min(Math.abs(target - value), step)

export const easeOutCubic = (progress: number): number =>
  1 - (1 - progress) ** 3

/** 二次贝塞尔求值 */
export const quadratic = (
  from: number,
  ctrl: number,
  to: number,
  t: number
): number => {
  const inverted = 1 - t
  return inverted * inverted * from + 2 * inverted * t * ctrl + t * t * to
}

/** Fisher-Yates：让每个粒子随机认领一个落点，避免整块网格平移的僵硬感 */
export const shuffle = (count: number): number[] => {
  const indexes = Array.from({ length: count }, (_, index) => index)

  for (let cursor = indexes.length - 1; cursor > 0; cursor--) {
    const swap = Math.floor(Math.random() * (cursor + 1))
    const held = indexes[cursor] ?? 0
    indexes[cursor] = indexes[swap] ?? 0
    indexes[swap] = held
  }

  return indexes
}

export const pickTone = (): ParticleTone =>
  ORBIT_TONES[Math.floor(Math.random() * ORBIT_TONES.length)] ?? "ion"

/** 二维码的三个定位图案角：左上、右上、左下 */
const isFinderCorner = (
  column: number,
  row: number,
  cols: number,
  rows: number
): boolean => {
  const isLeft = column === 0
  const isRight = column === cols - 1
  const isTop = row === 0
  const isBottom = row === rows - 1

  return ((isLeft || isRight) && isTop) || (isLeft && isBottom)
}

/**
 * 把元素矩形切成模块点阵，并标出三个定位图案角。
 *
 * 列 / 行数由 pitch 推出而不是固定 21（QR version 1）：宿主页面上二维码的
 * 实际渲染尺寸差异极大，固定网格会让小图挤成一团、大图稀疏。
 */
export const buildModuleTargets = (rect: DOMRect): ModuleTarget[] => {
  const cols = clamp(
    Math.round(rect.width / GEOMETRY.gridPitch),
    2,
    GEOMETRY.gridMax
  )
  const rows = clamp(
    Math.round(rect.height / GEOMETRY.gridPitch),
    2,
    GEOMETRY.gridMax
  )
  const stepX = (rect.width - GEOMETRY.gridInset * 2) / Math.max(1, cols - 1)
  const stepY = (rect.height - GEOMETRY.gridInset * 2) / Math.max(1, rows - 1)
  const targets: ModuleTarget[] = []

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < cols; column++) {
      targets.push({
        x: rect.left + GEOMETRY.gridInset + column * stepX,
        y: rect.top + GEOMETRY.gridInset + row * stepY,
        isFinder: isFinderCorner(column, row, cols, rows)
      })
    }
  }

  return targets
}

/**
 * 一次性分配整个粒子池。
 *
 * rAF 循环内只改字段、不 new 对象 —— 每帧分配几百个小对象会让扫描期间的
 * 主线程陷入 GC 抖动，而扫描本身（jsQR）已经是重活了。
 *
 * 池子按 `gridCapacity` 切成两段，成员固定：
 * 前段每轮汇聚时重新认领落点，后段常驻为环境星尘，制造"星空"底噪。
 */
export const createParticlePool = (
  poolSize: number,
  gridCapacity: number
): Particle[] =>
  Array.from({ length: poolSize }, (_, index) => ({
    x: 0,
    y: 0,
    seed: Math.random() * 1000,
    tone: index % 5 === 0 ? "flux" : "dust",
    alpha: 0,
    phase: index < gridCapacity ? "parked" : "field",
    isFinder: false,
    targetAlpha: 0,
    driftX: 0,
    driftY: 0,
    motion: {
      origin: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      control: { x: 0, y: 0 },
      elapsed: 0,
      // 每段开跑前都会被 startConverge / launchOrbit / disperseAll 覆盖
      duration: 0
    },
    orbitAngle: 0,
    orbitSpeed: GEOMETRY.orbitSpeed,
    orbitCenterX: 0,
    orbitCenterY: 0,
    orbitRadiusX: 0,
    orbitRadiusY: 0
  }))

// ---------------------------------------------------------------------------
