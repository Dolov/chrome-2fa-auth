import { cn } from "~/utils/cn"
import React from "react"

import Button from "./button"
import QProgress from "./qprogress"

export interface ModalProps {
  width?: number | string
  visible: boolean
  onOk?: () => void
  title?: React.ReactNode
  footer?: React.ReactNode
  onClose?: () => void
  children: React.ReactNode
  okLoading?: boolean
  okDisabled?: boolean
  qprogressLoading?: boolean
  okText?: string
  closeButtonClassName?: string
  confirmButtonClassName?: string
  footerLeft?: React.ReactNode
  full?: boolean
  style?: React.CSSProperties
  placeholder?: React.ReactNode
  keyboardEvents?: {
    Space?: () => void
    ArrowUp?: () => void
    ArrowDown?: () => void
    ArrowLeft?: () => void
    ArrowRight?: () => void
    [key: string]: () => void
  }
  shortcutKeySave?: boolean
}

const Modal: React.FC<ModalProps> = (props) => {
  const {
    full,
    style,
    visible,
    onClose,
    onOk,
    okDisabled,
    children,
    title,
    width,
    footer,
    footerLeft,
    okLoading,
    qprogressLoading,
    confirmButtonClassName,
    closeButtonClassName,
    okText = "Confirm",
    keyboardEvents,
    shortcutKeySave,
    placeholder
  } = props
  const id = React.useMemo(() => "modal_" + Date.now(), [])

  React.useEffect(() => {
    const dialog = document.getElementById(id) as HTMLDialogElement
    if (visible) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [visible])

  React.useEffect(() => {
    const dialog = document.getElementById(id) as HTMLDialogElement
    dialog.addEventListener("close", handleClose)
    return () => {
      dialog.removeEventListener("close", handleClose)
    }
  }, [id])

  const handleClose = React.useCallback(() => {
    onClose && onClose()
  }, [])

  const handleConfirm = () => {
    onOk && onOk()
  }

  const onKeyDown: React.KeyboardEventHandler = (event) => {
    if (event.metaKey && event.code === "KeyS" && shortcutKeySave) {
      handleConfirm()
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (!keyboardEvents) return
    const key = event.code
    if (!keyboardEvents[key]) return
    event.preventDefault()
    event.stopPropagation()
    keyboardEvents[key]()
  }

  const renderFooter = () => {
    if (footer === null) return null
    if (React.isValidElement(footer)) return footer
    return (
      <div className="modal-action flex justify-between">
        <div className="flex items-center">{footerLeft}</div>
        <div className="flex items-center">
          {onOk && (
            <Button
              loading={okLoading}
              className={cn(
                "btn btn-neutral mr-2",
                confirmButtonClassName
              )}
              disabled={okDisabled}
              onClick={handleConfirm}>
              {okText}
            </Button>
          )}
          <button
            className={cn("btn", closeButtonClassName)}
            onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <dialog onKeyDown={onKeyDown} id={id} className="modal">
      <QProgress
        loading={qprogressLoading}
        style={{ width, maxWidth: width, ...style }}
        className={cn("modal-box flex flex-col", {
          "w-full h-full max-h-full rounded-none": full
        })}>
        <div className="w-full h-full absolute -z-10 left-0 top-0">
          {placeholder}
        </div>
        {title && <h3 className="font-bold text-lg pb-4">{title}</h3>}
        <div className="flex flex-col flex-1 overflow-auto">{children}</div>
        {renderFooter()}
      </QProgress>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  )
}

/**
 * HOC to control the visibility of a component
 * @param WrappedComponent - The component to be wrapped
 */
function withVisibility<T extends object>(
  WrappedComponent: React.ComponentType<T>
) {
  return function (props: T & ModalProps) {
    const { visible } = props

    const rendered = React.useRef(visible)

    React.useEffect(() => {
      if (visible) {
        rendered.current = true
      }
    }, [visible])

    if (!visible && !rendered.current) {
      return null
    }

    if (visible) {
      return <WrappedComponent {...props} />
    }

    return <WrappedComponent {...props} />
  }
}

export default withVisibility(Modal)
