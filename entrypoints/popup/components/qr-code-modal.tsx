import { QRCodeCanvas } from "qrcode.react"
import React from "react"

import { FaviconMinimal } from "~/components/favicons"
import Modal from "~/components/ui/modal"
import message from "~/features/page-ui/toast"
import { copyTextToClipboardV2 } from "~/utils/clipboard"
import { i18n } from "#i18n"
import { generateOtpAuthUrl } from "~/utils/libs/otpauth"
import type { DataProps } from "~/utils/types"

import { useModalWidth } from "./use-modal-width"

interface QRCodeModalProps {
  data: DataProps
  isVisible: boolean
  onClose: () => void
}

const QRCodeModal: React.FC<QRCodeModalProps> = (props) => {
  const { isVisible, onClose, data } = props
  const { issuer, account } = data
  const { width } = useModalWidth()
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const url = generateOtpAuthUrl(data)

  const handleCopy = () => {
    void copyTextToClipboardV2(url)
    message.success(i18n.t("common_toast_copied"))
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = dataUrl
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
      isVisible={isVisible}
      onClose={onClose}
      footer={null}>
      <div className="w-full h-full flex flex-col items-center">
        <QRCodeCanvas value={url} size={240} ref={canvasRef} />
        <div>
          <div className="flex items-center justify-center">
            <button
              onClick={handleCopy}
              data-testid="qr-modal-copy"
              className="btn btn-link">
              {i18n.t("popup_modal_qr_copy")}
            </button>
            <button
              onClick={handleDownload}
              data-testid="qr-modal-download"
              className="btn btn-link">
              {i18n.t("popup_modal_qr_download")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default QRCodeModal
