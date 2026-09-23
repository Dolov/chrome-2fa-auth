import React from "react"

import { cn } from "~/utils/cn"

/**
 * 启动画面总时长，必须与 `style.css` 里 `--animate-splash` 的 `800ms` 对齐。
 * 内部节奏：0–200ms 淡入 + 拉远定格，200–500ms 停留，500–800ms 淡出。
 */
const SPLASH_TOTAL_MS = 800
/** daisyUI mockup-phone 官方示例壁纸 */
const SPLASH_IMAGE_URL = "https://img.daisyui.com/images/stock/453966.webp"

interface PhoneFrameProps {
  children: React.ReactNode
  className?: string
}

/**
 * daisyUI `mockup-phone` 外壳：摄像头 + 屏幕 + 圆角机身。
 *
 * 结构即 daisyUI 官方示例：`mockup-phone` 作为根节点，`mockup-phone-camera` 与
 * `mockup-phone-display` 是它的两个 grid-area 叠加层。屏幕里放 popup 主视图
 * （而非官方示例的壁纸图），因此保留 `flex flex-col` 与 `bg-base-100` 以承载
 * 三段式骨架（Header / List / EntryActions）。
 *
 * 启动画面：先铺官方示例壁纸，做一次「开机」动画（淡入 + 轻微拉远定格 → 淡出），
 * 动画结束由 `SPLASH_TOTAL_MS` 计时器卸载。
 *
 * `PhoneFrame` 而非 `Phone`——避免与 daisyUI 类名、与设备 API 的 `Phone` 概念混淆。
 */
const PhoneFrame: React.FC<PhoneFrameProps> = (props) => {
  const { children, className } = props
  const [isSplashVisible, setIsSplashVisible] = React.useState(true)

  React.useEffect(() => {
    const timeout = window.setTimeout(
      () => setIsSplashVisible(false),
      SPLASH_TOTAL_MS
    )
    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <div className={cn("mockup-phone border-primary/50", className)}>
      <div className="mockup-phone-camera z-30" />
      <div className="mockup-phone-display relative flex flex-col items-stretch bg-base-100">
        {children}
        {isSplashVisible && (
          <img
            alt=""
            src={SPLASH_IMAGE_URL}
            className="animate-splash absolute inset-0 z-20 bg-base-100 object-cover motion-reduce:animate-none"
          />
        )}
      </div>
    </div>
  )
}

export default PhoneFrame
