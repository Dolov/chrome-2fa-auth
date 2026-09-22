import {
  History,
  KeyRound,
  Pencil,
  Pin,
  PinOff,
  QrCode,
  Share2,
  Trash2
} from "lucide-react"
import React, { Fragment } from "react"

import { FaviconMinimal } from "~/components/favicons"
import { useOtpList, useOtpMutators } from "~/features/otp-store"
import message from "~/features/page-ui/toast"
import { useModalStack } from "~/features/ui-state/use-modal-stack"
import { copyTextToClipboardV2 } from "~/utils/clipboard"
import { cn } from "~/utils/cn"
import { generateOtpAuthUrl } from "~/utils/libs/otpauth"
import type { DataProps } from "~/utils/types"

import DeleteModal from "./delete-modal"
import EditModal from "./otp-form"
import RecoveryCodesModal from "./recovery-codes-modal"
import { useModalWidth } from "./use-modal-width"

// qrcode.react + 二维码弹层只在用户点开时加载，避免进入 popup 主包
const QRCodeModal = React.lazy(() => import("./qr-code-modal"))

/** ItemActionSheet 内嵌的 4 个 modal 的统一 key 列表 */
const ACTION_MODALS = ["qr", "edit", "recovery", "delete"] as const
type ActionModalKey = (typeof ACTION_MODALS)[number]

interface ItemActionSheetProps {
  isVisible: boolean
  onClose: () => void
  itemData: DataProps
}

const ItemActionSheet: React.FC<ItemActionSheetProps> = (props) => {
  const { isVisible, onClose, itemData } = props
  const { left, right, top, bottom, radius } = useModalWidth()
  const dataList = useOtpList()
  const { pin, restore } = useOtpMutators()
  const modals = useModalStack<ActionModalKey>(ACTION_MODALS)

  const handleMaskClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
  }

  const closeAll = () => {
    modals.closeAll()
    onClose()
  }

  // 恢复已删除的条目
  const handleRestore = async () => {
    await restore(itemData.id)
    message.success("已恢复")
    onClose()
  }

  const handleShare = async () => {
    const url = generateOtpAuthUrl(itemData)
    const shareData = {
      title: `${itemData.issuer} 的 2FA 配置`,
      text: url
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (e) {
        // 用户主动取消分享时不回退到剪贴板
        if (e instanceof DOMException && e.name === "AbortError") return
      }
    }

    await copyTextToClipboardV2(url)
    message.success("已复制分享链接")
  }

  const handlePin = async () => {
    const item = dataList.find((it) => it.id === itemData.id)
    if (!item) return
    await pin(item.id, !item.pinned)
    onClose()
  }

  if (!isVisible) return null

  const { pinned, account, issuer, recoveryCodes, deleted } = itemData

  const isRecoveryButtonVisible =
    Array.isArray(recoveryCodes) && recoveryCodes.length > 0

  return (
    <div
      onClick={handleMaskClick}
      style={{
        top,
        left,
        right,
        bottom
      }}
      className={cn("fixed z-20")}>
      <div
        onClick={closeAll}
        style={{
          borderRadius: radius
        }}
        className="absolute top-0 left-0 right-0 bottom-0 bg-[#0006]"
      />
      <EditModal
        data={itemData}
        isVisible={modals.isOpen("edit")}
        onClose={() => {
          modals.close("edit")
          onClose()
        }}
      />
      <RecoveryCodesModal
        data={itemData}
        title="恢复密钥"
        isVisible={modals.isOpen("recovery")}
        onClose={() => {
          modals.close("recovery")
          onClose()
        }}
      />
      <React.Suspense fallback={null}>
        <QRCodeModal
          data={itemData}
          isVisible={modals.isOpen("qr")}
          onClose={() => modals.close("qr")}
        />
      </React.Suspense>
      <DeleteModal
        data={itemData}
        isVisible={modals.isOpen("delete")}
        onClose={() => {
          modals.close("delete")
          onClose()
        }}
      />
      <div
        style={{
          borderBottomLeftRadius: radius,
          borderBottomRightRadius: radius
        }}
        className="absolute bottom-0 right-0 left-0 h-32 bg-base-100 flex flex-col">
        <div className="flex-1 flex items-center justify-around px-2">
          {!deleted && (
            <button
              onClick={handleShare}
              className="btn btn-ghost px-2 hover:text-primary">
              <div className="flex flex-col items-center justify-center gap-1">
                <Share2 size={18} />
                <span className="text-xs font-normal">分享</span>
              </div>
            </button>
          )}
          {!deleted && (
            <button
              onClick={handlePin}
              className="btn btn-ghost px-2 hover:text-secondary">
              <div className="flex flex-col items-center justify-center gap-1">
                {!pinned && (
                  <Fragment>
                    <Pin size={18} />
                    <span className="text-xs font-normal">置顶</span>
                  </Fragment>
                )}
                {pinned && (
                  <Fragment>
                    <PinOff size={18} />
                    <span className="text-xs font-normal">取消</span>
                  </Fragment>
                )}
              </div>
            </button>
          )}
          <button
            onClick={() => modals.open("qr")}
            className="btn btn-ghost px-2 hover:text-accent">
            <div className="flex flex-col items-center justify-center gap-1">
              <QrCode size={18} />
              <span className="text-xs font-normal">二维码</span>
            </div>
          </button>
          {!deleted && (
            <button
              onClick={() => modals.open("edit")}
              className="btn btn-ghost px-2 hover:text-info">
              <div className="flex flex-col items-center justify-center gap-1">
                <Pencil size={18} />
                <span className="text-xs font-normal">编辑</span>
              </div>
            </button>
          )}
          {isRecoveryButtonVisible && (
            <button
              onClick={() => modals.open("recovery")}
              className="btn btn-ghost px-2 hover:text-success">
              <div className="flex flex-col items-center justify-center gap-1">
                <KeyRound size={18} />
                <span className="text-xs font-normal">恢复码</span>
              </div>
            </button>
          )}
          {deleted && (
            <button
              onClick={handleRestore}
              className="btn btn-ghost px-2 hover:text-info">
              <div className="flex flex-col items-center justify-center gap-1">
                <History size={18} />
                <span className="text-xs font-normal">恢复</span>
              </div>
            </button>
          )}
          <button
            onClick={() => modals.open("delete")}
            className="btn btn-ghost px-2 hover:text-error">
            <div className="flex flex-col items-center justify-center gap-1">
              <Trash2 size={18} />
              <span className="text-xs font-normal">删除</span>
            </div>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-between px-4 border-t border-neutral/30">
          <div className="flex items-center gap-2">
            <FaviconMinimal issuer={issuer} />
            {account && <span>{account}</span>}
          </div>
          <button onClick={closeAll} className="btn btn-sm btn-ghost">
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

export default ItemActionSheet
