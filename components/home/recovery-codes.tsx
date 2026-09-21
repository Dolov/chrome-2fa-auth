import { ClipboardCopy, CopyCheck } from "lucide-react"
import React, { useState } from "react"

import Modal from "~/components/ui/modal"
import { useUpdateCopiedCodeStatus } from "~/state/hooks"
import { copyTextToClipboardV2 } from "~/utils/clipboard-utils"
import { cn } from "~/utils/cn"
import { type DataProps } from "~/utils/constant"

import { useModalWidth } from "./hooks"

export interface RecoveryCodesProps {
  data: DataProps
  title: string
  visible: boolean
  onClose: () => void
}

const RecoveryCodes: React.FC<RecoveryCodesProps> = (props) => {
  const { visible, onClose, title, data } = props
  const { width } = useModalWidth()

  const [updateCodeStatus] = useUpdateCopiedCodeStatus()

  // 设置一个状态来跟踪哪个代码被复制，和复制状态
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopy = (code: string) => {
    setCopiedCode(code) // 设置当前复制的代码
    copyTextToClipboardV2(code)
    setTimeout(() => {
      setCopiedCode(null) // n 秒后恢复为 ClipboardCopy 图标
      updateCodeStatus(data.id, code)
    }, 1000)
  }

  const { recoveryCodes = [] } = data
  return (
    <Modal title={title} width={width} visible={visible} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {recoveryCodes.map((item) => {
          const { value, copied } = item
          const isCoping = copiedCode === value
          const CopyIcon = isCoping ? CopyCheck : ClipboardCopy
          return (
            <div
              key={value}
              onClick={() => handleCopy(value)}
              className={cn(
                "badge w-full flex items-center justify-between px-3 py-2",
                {
                  "badge-accent": !copied,
                  "!badge-ghost": copied,
                  "!badge-secondary": isCoping
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

export default RecoveryCodes
