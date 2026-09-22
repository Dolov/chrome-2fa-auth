import React from "react"

import { cn } from "~/utils/cn"
import { i18n } from "#i18n"

import Button from "./button"
import ProgressBar from "./progress"

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
  isVisible: boolean
  onOk?: () => void
  title?: React.ReactNode
  footer?: React.ReactNode
  onClose?: () => void
  children: React.ReactNode
  isOkLoading?: boolean
  isOkDisabled?: boolean
  isProgressLoading?: boolean
  okText?: string
  closeButtonClassName?: string
  confirmButtonClassName?: string
  footerLeft?: React.ReactNode
  isFull?: boolean
  style?: React.CSSProperties
  placeholder?: React.ReactNode
  keyboardEvents?: ModalShortcuts
  isShortcutKeySave?: boolean
  /** E2E 定位锚点：透传到 <dialog> 的 data-testid */
  testId?: string
}

const Modal: React.FC<ModalProps> = (props) => {
  const {
    isFull,
    style,
    isVisible,
    onClose,
    onOk,
    isOkDisabled,
    children,
    title,
    width,
    footer,
    footerLeft,
    isOkLoading,
    isProgressLoading,
    confirmButtonClassName,
    closeButtonClassName,
    okText = i18n.t("common_action_confirm"),
    keyboardEvents,
    isShortcutKeySave,
    placeholder,
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

  const onKeyDown: React.KeyboardEventHandler<HTMLDialogElement> = (event) => {
    if (event.metaKey && event.code === "KeyS" && isShortcutKeySave) {
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
              data-testid="modal-confirm"
              isLoading={isOkLoading}
              className={cn("btn btn-neutral mr-2", confirmButtonClassName)}
              disabled={isOkDisabled}
              onClick={handleConfirm}>
              {okText}
            </Button>
          )}
          <button
            data-testid="modal-close"
            className={cn("btn", closeButtonClassName)}
            onClick={handleClose}>
            {i18n.t("common_action_close")}
          </button>
        </div>
      </div>
    )
  }

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={onKeyDown}
      data-testid={testId}
      className="modal">
      <ProgressBar
        isLoading={isProgressLoading}
        style={{ width, maxWidth: width, ...style }}
        className={cn("modal-box flex flex-col", {
          "w-full h-full max-h-full rounded-none": isFull
        })}>
        <div className="w-full h-full absolute -z-10 left-0 top-0">
          {placeholder}
        </div>
        {title && <h3 className="font-bold text-lg pb-4">{title}</h3>}
        <div className="flex flex-col flex-1 overflow-auto">{children}</div>
        {renderFooter()}
      </ProgressBar>
      <form method="dialog" className="modal-backdrop">
        <button aria-label={i18n.t("common_action_close")}>close</button>
      </form>
    </dialog>
  )
}
export default Modal
