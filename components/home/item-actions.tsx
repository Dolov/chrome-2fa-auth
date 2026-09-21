import { cn } from "~/utils/cn"
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
import { QRCodeCanvas } from "qrcode.react"
import React, { Fragment } from "react"

import { FaviconMinimal } from "~/components/favicons"
import Modal from "~/components/ui/modal"
import { generateOtpAuthUrl } from "~/utils/otpauth"
import { copyTextToClipboardV2 } from "~/utils/clipboard"
import message from "~/features/page-ui/toast"
import { useOtpList, useOtpMutators } from "~/features/otp-store"
import { useModalStack } from "~/features/ui-state/use-modal-stack"
import { type DataProps } from "~/utils/types"

import { useModalWidth } from "./hooks"
import EditModal from "./otp-form"
import RecoveryCodeModal from "./recovery-codes"

/** ItemActions 内嵌的 4 个 modal 的统一 key 列表 */
const ACTION_MODALS = ["qr", "edit", "recovery", "delete"] as const
type ActionModalKey = (typeof ACTION_MODALS)[number]

const ItemActions: React.FC<{
  visible: boolean
  onClose: () => void
  itemData: DataProps
}> = (props) => {
  const { visible, onClose, itemData } = props
  const { left, right, top, bottom, radius } = useModalWidth()
  const dataList = useOtpList()
  const { pin, restore, softDelete, hardDelete } = useOtpMutators()
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

  const handleShare = () => {}

  const handlePin = async () => {
    const item = dataList.find((it) => it.id === itemData.id)
    if (!item) return
    await pin(item.id, !item.pinned)
    onClose()
  }

  if (!visible) return null

  const { pinned, account, issuer, recoveryCodes, deleted } = itemData

  const recoveryBtnVisible =
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
        visible={modals.isOpen("edit")}
        onClose={() => {
          modals.close("edit")
          onClose()
        }}
      />
      <RecoveryCodeModal
        data={itemData}
        title="恢复密钥"
        visible={modals.isOpen("recovery")}
        onClose={() => {
          modals.close("recovery")
          onClose()
        }}
      />
      <QRCodeModal
        data={itemData}
        visible={modals.isOpen("qr")}
        onClose={() => modals.close("qr")}
      />
      <DeleteModal
        data={itemData}
        visible={modals.isOpen("delete")}
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
          {recoveryBtnVisible && (
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

const QRCodeModal: React.FC<{
  data: DataProps
  visible: boolean
  onClose: () => void
}> = (props) => {
  const { visible, onClose, data } = props
  const { issuer, account } = data
  const { width } = useModalWidth()
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const url = generateOtpAuthUrl(data)

  const handleCopy = () => {
    copyTextToClipboardV2(url)
    message.success("复制成功")
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = url
    a.download = `${issuer}-${account}-${new Date().toLocaleString()}.png`
    a.click()
  }

  return (
    <Modal
      title={
        <div className="flex items-center justify-center gap-2">
          <FaviconMinimal className="!text-2xl" issuer={issuer} />
          <span>{account}</span>
        </div>
      }
      width={width}
      visible={visible}
      onClose={onClose}
      footer={null}>
      <div className="w-full h-full flex flex-col items-center">
        <QRCodeCanvas value={url} size={240} ref={canvasRef} />
        <div>
          <div className="flex items-center justify-center">
            <button onClick={handleCopy} className="btn btn-link">
              复制
            </button>
            <button onClick={handleDownload} className="btn btn-link">
              下载
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

const DeleteModal: React.FC<{
  data: DataProps
  visible: boolean
  onClose: () => void
}> = (props) => {
  const { visible, onClose, data } = props
  const { width } = useModalWidth()
  const { softDelete, hardDelete } = useOtpMutators()

  const { issuer, account, deleted } = data

  const handleDelete = async () => {
    if (deleted) {
      await hardDelete(data.id)
    } else {
      await softDelete(data.id)
    }
    onClose()
  }

  const text = deleted ? "删除后不可恢复，确定删除？" : "确定删除？"

  return (
    <Modal
      width={width}
      title={
        <div className="flex items-center gap-2">
          <FaviconMinimal className="!text-2xl" issuer={issuer} />
          <span>{account}</span>
        </div>
      }
      visible={visible}
      onClose={onClose}
      onOk={handleDelete}
      okText="删除"
      confirmButtonClassName="btn-error">
      <div className="font-bold text-lg flex items-center gap-2">{text}</div>
    </Modal>
  )
}

export default ItemActions
