import QierProgress from "qier-progress"
import React from "react"

interface ProgressBarProps {
  isLoading?: boolean
  children: React.ReactNode
  progressHeight?: number
  className?: string
  style?: React.CSSProperties
  value?: number
}

/**
 * 顶置进度条包装：传给 `isLoading` 即在容器顶部跑 qier-progress 动画。
 *
 * 用法是在 Modal 顶层包一层：children 是 modal-box 本身。Modal 打开期间如果
 * 想表达「异步加载中」，把 `isLoading` 切 true 就会有一条从左到右的绿色进度。
 */
const ProgressBar: React.FC<ProgressBarProps> = (props) => {
  const {
    isLoading,
    children,
    progressHeight = 5,
    className,
    style,
    value
  } = props
  const progressRef = React.useRef<QierProgress | null>(null)

  React.useEffect(() => {
    if (!progressRef.current) return
    if (isLoading) {
      progressRef.current.start()
    } else {
      progressRef.current.finish()
    }
  }, [isLoading])

  const setRef = React.useCallback((element: HTMLDivElement | null) => {
    if (!element) {
      progressRef.current = null
      return
    }

    if (!progressRef.current) {
      progressRef.current = new QierProgress({
        parentNode: element,
        height: progressHeight
      })
    }
  }, [])

  return (
    <div ref={setRef} style={style} className={className} data-value={value}>
      {children}
    </div>
  )
}

export default ProgressBar
