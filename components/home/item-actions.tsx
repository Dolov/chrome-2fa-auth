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

import { useStorage } from "~/utils/storage-hook"

import { FaviconMinimal } from "~/components/favicons"
import Modal from "~/components/ui/modal"
import { generateOtpAuthUrl } from "~/utils/auth"
import { copyTextToClipboardV2 } from "~/utils/clipboard-utils"
import message from "~/utils/message"
import { StorageKey, type DataProps } from "~/utils/constant"

import { useModalWidth } from "./hooks"
import EditModal from "./otp-form"
import RecoveryCodeModal from "./recovery-codes"

const ItemActions: React.FC<{
  visible: boolean
  onClose: () => void
  itemData: DataProps
}> = (props) => {
  const { visible, onClose, itemData } = props
  const { left, right, top, bottom, radius } = useModalWidth()
  const [dataList, setDataList] = useStorage<DataProps[]>(StorageKey.DATA, [])
  const [qrVisible, setQrVisible] = React.useState(false)
  const [editVisible, setEditVisible] = React.useState(false)
  const [deleteVisible, setDeleteVisible] = React.useState(false)
  const [recoveryVisible, setRecoveryVisible] = React.useState(false)

  const handleMaskClick = (e) => {
    e.stopPropagation()
  }

  const handleEdit = () => {
    setEditVisible(true)
  }

  const handleDelete = () => {
    setDeleteVisible(true)
  }

  const handleRecovery = () => {
    setRecoveryVisible(true)
  }

  // 恢复已删除的条目
  const handleRestore = () => {
    const updatedList = dataList.map((item) =>
      item.id === itemData.id ? { ...item, deleted: false } : item
    )
    setDataList(updatedList)
    message.success("已恢复")
    onClose()
  }

  const handleShare = () => {}

  const handlePin = () => {
    const item = dataList.find((item) => item.id === itemData.id)
    const nextPinned = !item.pinned
    const pinnedData = dataList.filter(
      (item) => item.pinned && item.id !== itemData.id
    )
    const unpinnedData = dataList.filter(
      (item) => !item.pinned && item.id !== itemData.id
    )
    if (nextPinned) {
      setDataList([
        {
          ...item,
          pinned: true
        },
        ...pinnedData,
        ...unpinnedData
      ])
    } else {
      setDataList([
        ...pinnedData,
        {
          ...item,
          pinned: false
        },
        ...unpinnedData
      ])
    }
    onClose()
  }

  const handleQr = () => {
    setQrVisible(true)
  }

  if (!visible) return null

  const { pinned, account, issuer, recoveryCodes, deleted } = itemData

  const recoveryBtnVisible =
    Array.isArray(recoveryCodes) && recoveryCodes.length > 0
  const url = generateOtpAuthUrl(itemData)

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
        onClick={onClose}
        style={{
          borderRadius: radius
        }}
        className="absolute top-0 left-0 right-0 bottom-0 bg-[#0006]"
      />
      <EditModal
        data={itemData}
        visible={editVisible}
        onClose={() => {
          onClose()
          setEditVisible(false)
        }}
      />
      <RecoveryCodeModal
        data={itemData}
        title="恢复密钥"
        visible={recoveryVisible}
        onClose={() => {
          onClose()
          setRecoveryVisible(false)
        }}
      />
      <QRCodeModal
        data={itemData}
        visible={qrVisible}
        onClose={() => {
          setQrVisible(false)
        }}
      />
      <DeleteModal
        data={itemData}
        visible={deleteVisible}
        onClose={() => {
          onClose()
          setDeleteVisible(false)
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
            onClick={handleQr}
            className="btn btn-ghost px-2 hover:text-accent">
            <div className="flex flex-col items-center justify-center gap-1">
              <QrCode size={18} />
              <span className="text-xs font-normal">二维码</span>
            </div>
          </button>
          {!deleted && (
            <button
              onClick={handleEdit}
              className="btn btn-ghost px-2 hover:text-info">
              <div className="flex flex-col items-center justify-center gap-1">
                <Pencil size={18} />
                <span className="text-xs font-normal">编辑</span>
              </div>
            </button>
          )}
          {recoveryBtnVisible && (
            <button
              onClick={handleRecovery}
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
            onClick={handleDelete}
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
          <button onClick={onClose} className="btn btn-sm btn-ghost">
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
  const [dataList, setDataList] = useStorage<DataProps[]>(StorageKey.DATA, [])

  const { issuer, account, deleted } = data

  const handleDelete = () => {
    if (deleted) {
      setDataList(dataList.filter((item) => item.id !== data.id))
    } else {
      setDataList(
        dataList.map((item) =>
          item.id === data.id ? { ...item, deleted: true } : item
        )
      )
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
