import { ClipboardCopy, CopyCheck } from "lucide-react"
import React, { useState } from "react"

import Modal from "~/components/ui/modal"
import { useUpdateCopiedCodeStatus } from "~/features/otp-store"
import { copyTextToClipboardV2 } from "~/utils/clipboard"
import { cn } from "~/utils/cn"
import type { DataProps } from "~/utils/types"

import { useModalWidth } from "./use-modal-width"

/** 复制图标恢复为默认态前的停留时长 */
const COPY_FEEDBACK_MS = 1000

export interface RecoveryCodesModalProps {
  data: DataProps
  title: string
  isVisible: boolean
  onClose: () => void
}

const RecoveryCodesModal: React.FC<RecoveryCodesModalProps> = (props) => {
  const { isVisible, onClose, title, data } = props
  const { width } = useModalWidth()

  const [updateCodeStatus] = useUpdateCopiedCodeStatus()

  // 跟踪当前被复制的代码，用于显示复制反馈图标
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleCopy = (code: string) => {
    setCopiedCode(code)
    void copyTextToClipboardV2(code)
    timeoutRef.current = setTimeout(() => {
      setCopiedCode(null)
      void updateCodeStatus(data.id, code)
    }, COPY_FEEDBACK_MS)
  }

  const { recoveryCodes = [] } = data

  return (
    <Modal title={title} width={width} isVisible={isVisible} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {recoveryCodes.map((item, index) => {
          const { value, copied } = item
          const isCopying = copiedCode === value
          const CopyIcon = isCopying ? CopyCheck : ClipboardCopy
          return (
            <div
              key={`${value}-${index}`}
              onClick={() => handleCopy(value)}
              className={cn(
                "badge w-full flex items-center justify-between px-3 py-2",
                {
                  "badge-accent": !copied,
                  "!badge-ghost": copied,
                  "!badge-secondary": isCopying
                }
              )}>
              <span
                className={cn("truncate grow min-w-0", {
                  "line-through": copied
                })}>
                {value}
              </span>
              <CopyIcon
                size={14}
                className={cn("ml-2 shrink-0 transition", {
                  "hover:text-white/80 cursor-pointer active:scale-95": !copied
                })}
              />
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

export default RecoveryCodesModal
