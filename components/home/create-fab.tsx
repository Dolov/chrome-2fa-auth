import {
  ImageUp,
  Keyboard,
  Plus,
  QrCode,
  SquareDashedMousePointer
} from "lucide-react"
import React from "react"

import Button from "~/components/ui/button"
import {
  sendAutoScanToActiveTab,
  sendManualScreenshotToActiveTab
} from "~/features/messaging"
import { usePopupIntake } from "~/features/otp-intake/adapters/popup"
import { canInjectContentScript } from "~/features/runtime/can-inject-content-script"
import { useModalStack } from "~/features/ui-state/use-modal-stack"
import { cn } from "~/utils/cn"
import { ContainerType } from "~/utils/types"

import { HomeContext } from "./home-context"
import OtpForm from "./otp-form"
import UploadModal from "./upload-modal"

/** FAB + 内嵌 modals 的 key 列表 */
const FAB_MODALS = ["form", "upload"] as const
type FabModalKey = (typeof FAB_MODALS)[number]

/** 自动扫描成功后给用户的“识别中”视觉反馈时长 */
const SCAN_FEEDBACK_MS = 600

const TONE_CLASSES = {
  secondary: "btn-secondary",
  accent: "btn-accent",
  info: "btn-info",
  warning: "btn-warning"
} as const

type FabActionTone = keyof typeof TONE_CLASSES

interface FabActionProps {
  tip: string
  tone: FabActionTone
  disabled?: boolean
  isLoading?: boolean
  onTrigger: () => void
  children: React.ReactNode
}

const FabAction: React.FC<FabActionProps> = (props) => {
  const { tip, tone, disabled, isLoading, onTrigger, children } = props

  return (
    <div
      className="tooltip tooltip-open tooltip-left before:py-2"
      data-tip={tip}>
      <div className={cn("scale-75 rounded-btn", { "bg-base-300": disabled })}>
        <Button
          isLoadingOnly
          isLoading={isLoading}
          disabled={disabled}
          onClick={onTrigger}
          className={cn("btn btn-square shadow-2xl", TONE_CLASSES[tone])}>
          {children}
        </Button>
      </div>
    </div>
  )
}

const CreateFab: React.FC = () => {
  const { containerType } = React.useContext(HomeContext)
  const intake = usePopupIntake()
  const modals = useModalStack<FabModalKey>(FAB_MODALS)

  const [isActive, setIsActive] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)
  const [canInject, setCanInject] = React.useState(false)

  React.useEffect(() => {
    void canInjectContentScript().then(setCanInject)
  }, [])

  const toggle = () => setIsActive((prev) => !prev)

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
      // 短暂反馈，给用户视觉提示“识别中”
      await new Promise((resolve) => setTimeout(resolve, SCAN_FEEDBACK_MS))
      await intake({ kind: "qr-data", data: result.data })
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div
      className={cn("absolute flex flex-col items-center z-10", {
        "bottom-8 right-8": containerType === ContainerType.PHONE,
        "bottom-4 right-4": containerType !== ContainerType.PHONE
      })}>
      {/* 额外的按钮，只有在激活时才显示 */}
      <div
        className={cn(
          "flex flex-col items-center transition-transform duration-200 ease-out opacity-0 mb-1",
          { "opacity-100": isActive }
        )}>
        <FabAction
          tip="手动输入认证码"
          tone="secondary"
          onTrigger={() => modals.open("form")}>
          <Keyboard />
        </FabAction>
        <FabAction
          tip="自动扫描二维码"
          tone="accent"
          disabled={!canInject}
          isLoading={isScanning}
          onTrigger={handleAutoScan}>
          <QrCode />
        </FabAction>
        <FabAction
          tip="手动截取二维码"
          tone="info"
          disabled={!canInject}
          onTrigger={() => void handleManualScan("手动截图模式，ESC 退出")}>
          <SquareDashedMousePointer />
        </FabAction>
        <FabAction
          tip="上传二维码截图"
          tone="warning"
          onTrigger={() => modals.open("upload")}>
          <ImageUp />
        </FabAction>
      </div>

      {/* 主按钮 */}
      <button
        onClick={toggle}
        className={cn("btn btn-circle shadow-2xl transition-all duration-200", {
          "btn-neutral": !isActive,
          "btn-primary": isActive
        })}>
        <Plus
          className={cn("duration-300 transition-transform", {
            "rotate-45": isActive
          })}
        />
      </button>

      <OtpForm
        isVisible={modals.isOpen("form")}
        onClose={() => {
          modals.close("form")
          setIsActive(false)
        }}
      />
      <UploadModal
        isVisible={modals.isOpen("upload")}
        onClose={() => modals.close("upload")}
      />
    </div>
  )
}

export default CreateFab
