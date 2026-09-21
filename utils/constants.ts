/**
 * 需要运行时值的领域常量与主题常量。
 *
 * `COLORS` / `GRADIENT` 只服务 features/page-ui 的注入 UI；
 * 单独成文件是为了让 `types.ts`（模型契约）保持零值依赖。
 */

import { ContainerType, FaviconType } from "./types"

export const DEFAULT_SETTINGS: {
  theme: string
  faviconType: FaviconType
  containerType: ContainerType
} = {
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
