import { cn } from "~/utils/cn"
import {
  ImageUp,
  Keyboard,
  Plus,
  QrCode,
  SquareDashedMousePointer
} from "lucide-react"
import React from "react"

import Button from "~/components/ui/button"
import { ActionType } from "~/utils/constant"
import { canInjectContentScript } from "~/utils/runtime-utils"
import { usePopupIntake } from "~/features/otp-intake"

import { GlobalContext } from "./context"
import { useModalWidth } from "./hooks"
import OptForm from "./otp-form"
import UploadModal from "./upload-modal"

/** AutoScan action 出参的最小定义（与 content/global.content 协议） */
interface AutoScanResult {
  success: boolean
  data?: string
  error?: string
}

const Create: React.FC = () => {
  const { containerType } = React.useContext(GlobalContext)
  const intake = usePopupIntake()

  const [active, setActive] = React.useState(false)
  const [visible, setVisible] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)
  const [injectable, setInjectable] = React.useState(false)
  const [uploadVisible, setUploadVisible] = React.useState(false)

  React.useEffect(() => {
    void canInjectContentScript().then(setInjectable)
  }, [])

  const toggle = () => setActive((prev) => !prev)

  const handleClose = () => {
    setActive(false)
    setVisible(false)
  }

  const sendManualScanMessage = (messageText: string) => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const firstTab = tabs[0]
      if (!firstTab?.id) return
      browser.tabs.sendMessage(firstTab.id, {
        action: ActionType.MANUAL_SCREENSHOT,
        message: messageText
      })
      window.close()
    })
  }

  const handleAutoScan = () => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const firstTab = tabs[0]
      if (!firstTab?.id) return
      browser.tabs.sendMessage(
        firstTab.id,
        { action: ActionType.AUTOSCAN },
        (result: AutoScanResult | undefined) => {
          void handleQRScanResult(result)
        }
      )
    })
  }

  const handleQRScanResult = async (result: AutoScanResult | undefined) => {
    if (!result?.success || !result.data) {
      sendManualScanMessage("未检测到二维码，开启手动截图模式，ESC 退出")
      return
    }

    setIsScanning(true)
    // 短暂反馈，给用户视觉提示"识别中"
    await new Promise((r) => setTimeout(r, 600))
    setIsScanning(false)

    await intake({ kind: "qr-data", data: result.data })
  }

  const handleManualScan = () => {
    sendManualScanMessage("手动截图模式，ESC 退出")
  }

  const handleUpload = () => setUploadVisible(true)
  const handleUploadClose = () => setUploadVisible(false)

  return (
    <div
      className={cn("absolute flex flex-col items-center z-10", {
        "bottom-8 right-8": containerType === "phone",
        "bottom-4 right-4": containerType !== "phone"
      })}>
      {/* 额外的按钮，只有在激活时才显示 */}
      <div
        className={cn(
          "flex flex-col items-center transition-transform duration-200 ease-out opacity-0 mb-1",
          { "opacity-100": active }
        )}>
        <div
          className="tooltip tooltip-open tooltip-left before:py-2"
          data-tip="手动输入认证码">
          <button
            onClick={() => setVisible(true)}
            className="btn btn-square btn-secondary shadow-2xl scale-75">
            <Keyboard />
          </button>
        </div>
        <div
          className="tooltip tooltip-open tooltip-left before:py-2"
          data-tip="自动扫描二维码">
          <div
            className={cn("scale-75 rounded-btn", {
              "bg-base-300": !injectable
            })}>
            <Button
              onlyLoading
              loading={isScanning}
              onClick={handleAutoScan}
              disabled={!injectable}
              className={cn("btn btn-square btn-accent shadow-2xl")}>
              <QrCode />
            </Button>
          </div>
        </div>
        <div
          className="tooltip tooltip-open tooltip-left before:py-2"
          data-tip="手动截取二维码">
          <div
            className={cn("scale-75 rounded-btn", {
              "bg-base-300": !injectable
            })}>
            <Button
              onlyLoading
              onClick={handleManualScan}
              disabled={!injectable}
              className={cn("btn btn-square btn-info shadow-2xl")}>
              <SquareDashedMousePointer />
            </Button>
          </div>
        </div>
        <div
          className="tooltip tooltip-open tooltip-left before:py-2"
          data-tip="上传二维码截图">
          <Button
            onlyLoading
            onClick={handleUpload}
            className={cn("btn btn-square btn-warning shadow-2xl scale-75")}>
            <ImageUp />
          </Button>
        </div>
      </div>

      {/* 主按钮 */}
      <button
        onClick={toggle}
        className={cn(
          "btn btn-circle shadow-2xl transition-all duration-200",
          {
            "btn-neutral": !active,
            "btn-primary": active
          }
        )}>
        <Plus
          className={cn("duration-300 transition-transform", {
            "rotate-45": active
          })}
        />
      </button>

      <OptForm visible={visible} onClose={handleClose} />
      <UploadModal visible={uploadVisible} onClose={handleUploadClose} />
    </div>
  )
}

export default Create
