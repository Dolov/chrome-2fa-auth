import { cn } from "~/utils/cn"
import React from "react"

import Button from "./button"
import QProgress from "./qprogress"

/**
 * 进程级唯一 modal id 生成器
 *
 * 原实现用 `Date.now()`（毫秒）作 id，同一毫秒挂载的多个 Modal 会
 * 拿到同一个 id，导致 `getElementById` 操作错元素（两个 dialog 互切换）。
 * 改用自增计数器保证唯一。
 */
let modalIdCounter = 0
const nextModalId = (): string => `modal_${++modalIdCounter}`

export interface ModalShortcuts {
  Space?: () => void
  ArrowUp?: () => void
  ArrowDown?: () => void
  ArrowLeft?: () => void
  ArrowRight?: () => void
  [code: string]: (() => void) | undefined
}

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
  keyboardEvents?: ModalShortcuts
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
  const [id] = React.useState(nextModalId)

  React.useEffect(() => {
    const dialog = document.getElementById(id) as HTMLDialogElement | null
    if (!dialog) return
    if (visible) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [visible])

  React.useEffect(() => {
    const dialog = document.getElementById(id) as HTMLDialogElement | null
    if (!dialog) return
    dialog.addEventListener("close", handleClose)
    return () => {
      dialog.removeEventListener("close", handleClose)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleClose = React.useCallback(() => {
    onClose?.()
  }, [onClose])

  const handleConfirm = () => {
    onOk?.()
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLDialogElement> = (event) => {
    if (event.metaKey && event.code === "KeyS" && shortcutKeySave) {
      handleConfirm()
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (!keyboardEvents) return
    const handler = keyboardEvents[event.code]
    if (!handler) return
    event.preventDefault()
    event.stopPropagation()
    handler()
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
export default Modal
