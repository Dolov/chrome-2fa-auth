/**
 * 扫描可视化粒子层的状态机：每帧按相位推进粒子。
 *
 * 纯状态转移，不碰 canvas、不读宿主 DOM —— 所以可以和 `scan-particle-model.ts`
 * 分开且单独推演。绘制在 `scan-particles.ts`，它只负责调 `PARTICLE_UPDATE`。
 *
 * 相位语义：
 * - `field`    环境星尘自由漂移（常驻底噪）
 * - `converge` 沿贝塞尔飞向模块落点
 * - `grid`     停在落点上原地呼吸（等解码结果 / 命中后"钉住"二维码）
 * - `lift`     从点阵剥离到环绕轨道
 * - `orbit`    沿椭圆轨道流动
 * - `disperse` 扑空，径向散开并熄灭
 * - `parked`   待命，不绘制
 */

import {
  approach,
  easeOutCubic,
  GEOMETRY,
  quadratic,
  TIMING
} from "./scan-particle-model"
import type { Bounds, Particle, ParticlePhase } from "./scan-particle-model"

// ---------------------------------------------------------------------------
// 相位推进
// ---------------------------------------------------------------------------

export const parkParticle = (particle: Particle) => {
  particle.alpha = 0
  particle.targetAlpha = 0
  particle.phase = "parked"
}

const updateField = (particle: Particle, dt: number, bounds: Bounds) => {
  particle.x += particle.driftX * dt
  particle.y += particle.driftY * dt
  particle.alpha = approach(
    particle.alpha,
    particle.targetAlpha,
    dt / TIMING.transitionMs
  )

  if (particle.x < -GEOMETRY.wrapMargin)
    particle.x = bounds.width + GEOMETRY.wrapMargin
  if (particle.x > bounds.width + GEOMETRY.wrapMargin)
    particle.x = -GEOMETRY.wrapMargin
  if (particle.y < -GEOMETRY.wrapMargin)
    particle.y = bounds.height + GEOMETRY.wrapMargin
  if (particle.y > bounds.height + GEOMETRY.wrapMargin)
    particle.y = -GEOMETRY.wrapMargin
}

const updateConverge = (particle: Particle, dt: number) => {
  const motion = particle.motion
  motion.elapsed = Math.min(motion.elapsed + dt, motion.duration)

  const eased = easeOutCubic(motion.elapsed / motion.duration)
  particle.x = quadratic(
    motion.origin.x,
    motion.control.x,
    motion.target.x,
    eased
  )
  particle.y = quadratic(
    motion.origin.y,
    motion.control.y,
    motion.target.y,
    eased
  )
  particle.alpha = approach(
    particle.alpha,
    particle.targetAlpha,
    dt / TIMING.transitionMs
  )

  if (motion.elapsed < motion.duration) return
  particle.phase = "grid"
}

/** 从点阵剥离并飞到环绕轨道：与汇聚同一套贝塞尔插值，只是落点不同 */
const updateLift = (particle: Particle, dt: number) => {
  const motion = particle.motion
  motion.elapsed = Math.min(motion.elapsed + dt, motion.duration)

  const eased = easeOutCubic(motion.elapsed / motion.duration)
  particle.x = quadratic(
    motion.origin.x,
    motion.control.x,
    motion.target.x,
    eased
  )
  particle.y = quadratic(
    motion.origin.y,
    motion.control.y,
    motion.target.y,
    eased
  )
  particle.alpha = approach(
    particle.alpha,
    particle.targetAlpha,
    dt / TIMING.transitionMs
  )

  if (motion.elapsed < motion.duration) return
  // 轨道角度在 launchOrbit 里已按序号分配，落到轨道上即无缝接上
  particle.phase = "orbit"
}

const updateGrid = (particle: Particle, dt: number) => {
  const motion = particle.motion
  motion.elapsed += dt

  // 停在落点上原地呼吸：等解码结果时，这层 shimmer 就是"还在看"的反馈
  const shimmer =
    Math.sin((motion.elapsed + particle.seed) * GEOMETRY.shimmerSpeed) *
    GEOMETRY.shimmerAmplitude

  particle.x = motion.target.x + shimmer
  particle.y = motion.target.y + shimmer * 0.6
  particle.alpha = approach(
    particle.alpha,
    particle.targetAlpha,
    dt / TIMING.transitionMs
  )
}

const updateOrbit = (particle: Particle, dt: number) => {
  particle.orbitAngle += particle.orbitSpeed * dt
  particle.x =
    particle.orbitCenterX +
    Math.cos(particle.orbitAngle) * particle.orbitRadiusX
  particle.y =
    particle.orbitCenterY +
    Math.sin(particle.orbitAngle) * particle.orbitRadiusY
  particle.alpha = approach(
    particle.alpha,
    particle.targetAlpha,
    dt / TIMING.transitionMs
  )
}

const updateParked = (particle: Particle) => {
  particle.alpha = 0
}

const updateDisperse = (particle: Particle, dt: number) => {
  particle.x += particle.driftX * dt
  particle.y += particle.driftY * dt
  particle.alpha -= dt / particle.motion.duration

  if (particle.alpha > 0) return
  parkParticle(particle)
}

/** 每帧按相位分派；用查表代替 switch，加相位时类型检查自动接管 */
export const PARTICLE_UPDATE: Record<
  ParticlePhase,
  (particle: Particle, dt: number, bounds: Bounds) => void
> = {
  grid: updateGrid,
  lift: updateLift,
  field: updateField,
  orbit: updateOrbit,
  parked: updateParked,
  converge: updateConverge,
  disperse: updateDisperse
}
