import Progress from "qier-progress"
import React from "react"

interface QProgressProps {
  loading?: boolean
  children: React.ReactNode
  progressHeight?: number
  className?: string
  style?: React.CSSProperties
  value?: number
}

const QProgress: React.FC<QProgressProps> = (props) => {
  const {
    loading,
    children,
    progressHeight = 5,
    className,
    style,
    value
  } = props
  const progressRef = React.useRef<Progress | null>(null)

  React.useEffect(() => {
    if (!progressRef.current) return
    if (loading) {
      progressRef.current.start()
    } else {
      progressRef.current.finish()
    }
  }, [loading])

  const setRef = React.useCallback((element: HTMLDivElement | null) => {
    if (!element) {
      progressRef.current = null
      return
    }

    if (!progressRef.current) {
      progressRef.current = new Progress({
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

export default QProgress
