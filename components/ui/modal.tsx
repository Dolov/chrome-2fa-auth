import React from "react"

import { cn } from "~/utils/cn"
import { i18n } from "#i18n"

import Button from "./button"

export interface ModalProps {
  width?: number | string
  isVisible: boolean
  onOk?: () => void
  title?: React.ReactNode
  footer?: React.ReactNode
  onClose?: () => void
  children: React.ReactNode
  isOkDisabled?: boolean
  okText?: string
  confirmButtonClassName?: string
  /** E2E 定位锚点：透传到 <dialog> 的 data-testid */
  testId?: string
}

const Modal: React.FC<ModalProps> = (props) => {
  const {
    isVisible,
    onClose,
    onOk,
    isOkDisabled,
    children,
    title,
    width,
    footer,
    confirmButtonClassName,
    okText = i18n.t("common_action_confirm"),
    testId
  } = props

  const dialogRef = React.useRef<HTMLDialogElement>(null)
  const onCloseRef = React.useRef(onClose)

  React.useEffect(() => {
    onCloseRef.current = onClose
  })

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isVisible && !dialog.open) {
      dialog.showModal()
      return
    }
    if (!isVisible && dialog.open) {
      dialog.close()
    }
  }, [isVisible])

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleNativeClose = () => onCloseRef.current?.()
    dialog.addEventListener("close", handleNativeClose)
    return () => {
      dialog.removeEventListener("close", handleNativeClose)
    }
  }, [])

  const handleClose = () => {
    onClose?.()
  }

  const handleConfirm = () => {
    onOk?.()
  }

  const renderFooter = () => {
    if (footer === null) return null
    if (React.isValidElement(footer)) return footer
    return (
      <div className="modal-action">
        {onOk && (
          <Button
            data-testid="modal-confirm"
            className={cn("btn", confirmButtonClassName ?? "btn-neutral")}
            disabled={isOkDisabled}
            onClick={handleConfirm}>
            {okText}
          </Button>
        )}
        <button data-testid="modal-close" className="btn" onClick={handleClose}>
          {i18n.t("common_action_close")}
        </button>
      </div>
    )
  }

  return (
    <dialog ref={dialogRef} data-testid={testId} className="modal">
      <div
        style={{ width, maxWidth: width }}
        className="modal-box flex flex-col">
        {title && <h3 className="font-bold text-lg pb-4">{title}</h3>}
        <div className="flex flex-col flex-1 overflow-auto">{children}</div>
        {renderFooter()}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label={i18n.t("common_action_close")}>close</button>
      </form>
    </dialog>
  )
}
export default Modal
