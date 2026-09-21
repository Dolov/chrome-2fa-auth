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
import { canInjectContentScript } from "~/features/runtime/can-inject-content-script"
import { usePopupIntake } from "~/features/otp-intake/adapters/popup"
import {
  sendAutoScanToActiveTab,
  sendManualScreenshotToActiveTab
} from "~/features/messaging"
import { useModalStack } from "~/features/ui-state/use-modal-stack"

import { GlobalContext } from "./context"
import OptForm from "./otp-form"
import UploadModal from "./upload-modal"

/** FAB + 内嵌 modals 的 key 列表 */
const FAB_MODALS = ["form", "upload"] as const
type FabModalKey = (typeof FAB_MODALS)[number]

const Create: React.FC = () => {
  const { containerType } = React.useContext(GlobalContext)
  const intake = usePopupIntake()
  const modals = useModalStack<FabModalKey>(FAB_MODALS)

  const [active, setActive] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)
  const [injectable, setInjectable] = React.useState(false)

  React.useEffect(() => {
    void canInjectContentScript().then(setInjectable)
  }, [])

  const toggle = () => setActive((prev) => !prev)

  const handleManualScan = async (messageText: string) => {
    await sendManualScreenshotToActiveTab(messageText)
    window.close()
  }

  const handleAutoScan = async () => {
    setIsScanning(true)
    try {
      const result = await sendAutoScanToActiveTab()
      if (!result?.success || !result.data) {
        await handleManualScan("未检测到二维码，开启手动截图模式，ESC 退出")
        return
      }
      // 短暂反馈，给用户视觉提示"识别中"
      await new Promise((r) => setTimeout(r, 600))
      await intake({ kind: "qr-data", data: result.data })
    } finally {
      setIsScanning(false)
    }
  }

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
            onClick={() => modals.open("form")}
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
              onClick={() => void handleManualScan("手动截图模式，ESC 退出")}
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
            onClick={() => modals.open("upload")}
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

      <OptForm
        visible={modals.isOpen("form")}
        onClose={() => {
          modals.close("form")
          setActive(false)
        }}
      />
      <UploadModal
        visible={modals.isOpen("upload")}
        onClose={() => modals.close("upload")}
      />
    </div>
  )
}

export default Create
