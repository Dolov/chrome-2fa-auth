/**
 * 需要运行时值的领域常量与主题常量。
 *
 * `COLORS` / `GRADIENT` / `SCAN_PALETTE` 只服务 features/page-ui 的注入 UI；
 * 单独成文件是为了让 `types.ts`（模型契约）保持零值依赖。
 */

import type { Settings } from "./types"
import { ContainerType, FaviconType } from "./types"

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  faviconType: FaviconType.ELEGANT,
  containerType: ContainerType.DEFAULT
}

export const COLORS = [
  "#422ad5", // 靛蓝
  "#00bafe", // 湖蓝
  "#00d3bb", // 青绿
  "#00d390", // 草绿
  "#fcb700", // 金黄
  "#f43098", // 玫红
  "#ff637d" // 粉红
]

export const GRADIENT = `linear-gradient(to right, ${COLORS.join(", ")})`

/**
 * 扫描可视化粒子层（Scanner Dust）调色板。
 *
 * 值是 canvas 直绘用的 `"r, g, b"` 三元组（不是 `#hex`），
 * 调用方靠拼 `rgba(${triple}, ${alpha})` 拿到任意透明度。
 *
 * 冷青 + 品紫是刻意的双色层次（避免"近黑底 + 单一荧光绿"的模板感）；
 * `lock` 是全局唯一一次暖色，只用在"判定命中"的一瞬。
 */
export const SCAN_PALETTE = {
  void: "5, 7, 14", // 压暗层底色（留一点蓝，不用纯黑）
  decay: "42, 59, 82", // 消散余晖，粒子熄灭时落到这里
  dust: "138, 216, 255", // 主粒子冷青：星点、尘埃
  flux: "167, 139, 250", // 次粒子品紫：制造色散层次
  ion: "224, 242, 254", // 近白：模块点阵 / 定位图案与环绕高亮
  lock: "255, 244, 224" // 暖白炽：命中瞬间的锁定闪光
} as const

/**
 * 粒子层根节点的 DOM 契约属性。
 *
 * 粒子层会往宿主页面插一张全屏 `<canvas>`，而 `utils/qr-decode.ts` 的候选
 * 收集会 `querySelectorAll("canvas")` —— 属性名放在这里，让两侧共用同一个
 * 契约而不是各写一份字面量。
 */
export const SCAN_LAYER_ATTR = "data-g2fa-scan-layer"
