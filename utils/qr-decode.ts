/**
 * 二维码解码（jsQR 边界）。
 *
 * **jsQR 必须懒加载**：它压缩后仍有约 117 KB（压缩率极低，内部有大查找表），
 * 而解码只在用户主动上传 / 扫描时才发生。静态 import 会让它进入每一个引用本模块
 * 的 bundle —— popup 主包、`global.content`（`<all_urls>`）、github / npm content
 * 全部各背一份。
 *
 * 拆包的实际情况（实测）：
 * - **popup / settings**：ESM 页面，`import()` 会被真正拆成独立 chunk，
 *   触发前不下载。popup 主包 363.5 KB → 236.2 KB。
 * - **content script**：产物是 IIFE，Rolldown 内联动态 import（会给出
 *   `[INEFFECTIVE_DYNAMIC_IMPORT]` 之外的静默内联），体积不变。要彻底拿掉
 *   content 侧这 ~128 KB 需要改造扫描链路（见 ADR-0007），本模块的懒加载
 *   是那一步的前提，不是替代。
 *
 * 四个导出函数本来就是 Promise 接口，所以改成异步加载对调用方零影响。
 */

import { i18n } from "#i18n"
import type { QRCode } from "jsqr"

import { SCAN_LAYER_ATTR } from "./constants"

/** 解码失败时抛出的 i18n 错误文案（惰性取值，避免模块加载期读 chrome.i18n） */
const canvasContextMissingError = () =>
  new Error(i18n.t("global_content_error_canvas"))
const qrNotFoundError = () => new Error(i18n.t("qr_decode_error_not_found"))

/** 一条扫码结果 */
export interface QRScanResult {
  data: string
  element: HTMLElement
}

/**
 * 预算后的扫描候选。
 *
 * `read` 是闭包而不是 `kind` 字段：调用方不需要知道自己是 canvas 还是 img，
 * 也不需要记住该调 `readFromCanvas` 还是 `readFromImage`。
 */
export interface ScanCandidate {
  element: HTMLElement
  rect: DOMRect
  read: () => Promise<string>
}

type JsQrDecoder = (
  data: Uint8ClampedArray,
  width: number,
  height: number
) => QRCode | null

let decoderPromise: Promise<JsQrDecoder> | null = null

/**
 * 懒加载 jsQR，并缓存 Promise 保证只加载一次。
 * 加载失败时清空缓存，让下一次调用可以重试而不是永久失败。
 */
const loadDecoder = (): Promise<JsQrDecoder> => {
  decoderPromise ??= import("jsqr")
    .then((module) => module.default)
    .catch((error: unknown) => {
      decoderPromise = null
      throw error
    })

  return decoderPromise
}

/**
 * 预热 jsQR，不关心结果。
 *
 * 可视化扫描在动画开场时就调它，把解码器的求值 / 下载藏进动画时长里。
 * content script 的 IIFE 产物会把 `import("jsqr")` 内联（ADR-0007），
 * 这里基本只是一次微任务；ESM 侧则能提前拉 chunk。
 */
export const warmUpDecoder = (): void => {
  void loadDecoder().catch(() => undefined)
}

/** 从一个 <canvas> 元素解码 QR */
export const readFromCanvas = async (
  canvas: HTMLCanvasElement
): Promise<string> => {
  const ctx = canvas.getContext("2d")
  if (!ctx) throw canvasContextMissingError()

  const decode = await loadDecoder()
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = decode(imageData.data, imageData.width, imageData.height)

  if (!code) throw qrNotFoundError()
  return code.data
}

/** 从一个 <img> 元素解码 QR（先绘制到离屏 canvas） */
export const readFromImage = async (img: HTMLImageElement): Promise<string> => {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw canvasContextMissingError()

  canvas.width = img.width
  canvas.height = img.height
  ctx.drawImage(img, 0, 0, img.width, img.height)

  const decode = await loadDecoder()
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = decode(imageData.data, imageData.width, imageData.height)

  if (!code) throw qrNotFoundError()
  return code.data
}

/** 从用户选择的本地图片文件解码 QR */
export const readFromFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        readFromImage(img).then(resolve).catch(reject)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** 扫描当前页面所有 canvas / img 中第一个 QR */
export const scanPage = async (): Promise<QRScanResult> => {
  for (const canvas of Array.from(document.querySelectorAll("canvas"))) {
    // 跳过粒子层自己注入的全屏 canvas：它不是候选，且解码它要白扫 80 万像素
    if (isOwnLayer(canvas)) continue
    try {
      const data = await readFromCanvas(canvas)
      return { data, element: canvas }
    } catch {
      // 继续尝试下一个元素
    }
  }

  for (const img of Array.from(document.querySelectorAll("img"))) {
    if (isOwnLayer(img)) continue
    try {
      const data = await readFromImage(img)
      return { data, element: img }
    } catch {
      // 继续尝试下一个元素
    }
  }

  throw new Error(i18n.t("qr_decode_error_no_valid_qr"))
}

/**
 * 候选预算：可视区域内、足够大、非本层注入的画布 / 图片，按"像二维码"排序取前 N。
 *
 * 与 `scanPage()` 的关系是**互补而不是替换**：`scanPage()` 是无上限的全量兜底
 * （GitHub / NPM 站点自动填充依赖它，行为不能变），本函数只服务带可视化的
 * `AUTOSCAN` —— 粒子动画必须有上限，否则整页几百张图会变成一场几分钟的烟花。
 * 调用方在候选全扑空后仍会回落到 `scanPage()`，所以过滤不会丢结果。
 */

/** 小于这个边长的元素基本不可能是二维码贴图 */
const MIN_CANDIDATE_SIDE = 48

/** 一次可视化扫描最多探测几个候选（也是角标进度的方块数） */
const MAX_CANDIDATES = 8

type CanvasOrImage = HTMLCanvasElement | HTMLImageElement

/** 排除粒子层自己注入的 canvas，否则它会把自己的全屏画布当成候选 */
const isOwnLayer = (element: Element): boolean =>
  element.closest(`[${SCAN_LAYER_ATTR}]`) != null

const isInViewport = (rect: DOMRect): boolean =>
  rect.bottom > 0 &&
  rect.right > 0 &&
  rect.top < window.innerHeight &&
  rect.left < window.innerWidth

const isLargeEnough = (rect: DOMRect): boolean =>
  rect.width >= MIN_CANDIDATE_SIDE && rect.height >= MIN_CANDIDATE_SIDE

const isScannable = (element: HTMLElement, rect: DOMRect): boolean =>
  !isOwnLayer(element) && isInViewport(rect) && isLargeEnough(rect)

/** 越接近 0 越方 —— 二维码是正方形，用来给同面积候选排序 */
const squarenessDelta = (rect: DOMRect): number =>
  Math.abs(1 - rect.width / rect.height)

/** 面积大的先探测；同面积时更方的先探测 */
const byLikelihood = (a: ScanCandidate, b: ScanCandidate): number => {
  const areaDelta = b.rect.width * b.rect.height - a.rect.width * a.rect.height
  if (areaDelta !== 0) return areaDelta
  return squarenessDelta(a.rect) - squarenessDelta(b.rect)
}

const toCandidates = <T extends CanvasOrImage>(
  nodes: NodeListOf<T>,
  read: (element: T) => Promise<string>
): ScanCandidate[] => {
  const result: ScanCandidate[] = []

  for (const element of Array.from(nodes)) {
    const rect = element.getBoundingClientRect()
    if (!isScannable(element, rect)) continue
    result.push({ element, rect, read: () => read(element) })
  }

  return result
}

/** 收集一次可视化扫描的候选（已排序、已截断） */
export const collectScanCandidates = (): ScanCandidate[] => {
  const canvases = toCandidates(
    document.querySelectorAll("canvas"),
    readFromCanvas
  )
  const images = toCandidates(document.querySelectorAll("img"), readFromImage)

  // sort 是稳定排序：面积与方形度都相同时，canvas 排在 img 前（NPM 的 QR 是 canvas）
  return [...canvases, ...images].sort(byLikelihood).slice(0, MAX_CANDIDATES)
}

/**
 * 解码单个候选，**不抛异常**（返回 null 表示扑空）。
 *
 * 可视化链路里解码与汇聚动画并行，异常会打断动画；跨域图 `getImageData`
 * 的 SecurityError、已解体元素、jsQR 加载失败全部收敛成 null。
 */
export const decodeCandidate = async (
  candidate: ScanCandidate
): Promise<string | null> => {
  if (!candidate.element.isConnected) return null

  try {
    return await candidate.read()
  } catch {
    return null
  }
}
