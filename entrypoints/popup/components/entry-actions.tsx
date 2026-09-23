import { i18n } from "#i18n"
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
import { canInjectContentScript } from "~/features/runtime/can-inject-content-script"
import { useOtpList, useOtpListLoaded } from "~/features/otp-store"
import { useModalStack } from "~/features/ui-state/use-modal-stack"
import { cn } from "~/utils/cn"
import { ContainerType } from "~/utils/types"

import { PopupContext } from "./context"
import OtpForm from "./otp-form"
import UploadModal from "./upload-modal"

/** FAB + 内嵌 modals 的 key 列表 */
const FAB_MODALS = ["form", "upload"] as const
type FabModalKey = (typeof FAB_MODALS)[number]

const TONE_CLASSES = {
  secondary: "btn-secondary",
  accent: "btn-accent",
  info: "btn-info",
  warning: "btn-warning"
} as const

type FabActionTone = keyof typeof TONE_CLASSES

/** 手动截图扫描：发消息后立即关闭 popup，结果由 content 侧 toast 反馈 */
const handleManualScan = async (messageText: string) => {
  await sendManualScreenshotToActiveTab(messageText)
  window.close()
}

/** 自动扫描：扫描瞬时完成，不等结果直接关闭 popup，避免遮挡页面 */
const handleAutoScan = () => {
  void sendAutoScanToActiveTab()
  window.close()
}

interface FabActionProps {
  tip: string
  tone: FabActionTone
  disabled?: boolean
  isLoading?: boolean
  onTrigger: () => void
  children: React.ReactNode
  /** E2E 定位锚点；data-tip 保留以兼容 07-qr-scan 现有断言 */
  testId?: string
}

const FabAction: React.FC<FabActionProps> = (props) => {
  const { tip, tone, disabled, isLoading, onTrigger, children, testId } = props

  return (
    <div
      className="tooltip tooltip-open tooltip-left before:py-2"
      data-tip={tip}
      data-testid={testId}>
      <div className={cn("scale-75 rounded-field", { "bg-base-300": disabled })}>
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

const EntryActions: React.FC = () => {
  const { containerType } = React.useContext(PopupContext)
  const modals = useModalStack<FabModalKey>(FAB_MODALS)
  const items = useOtpList()
  const isListLoaded = useOtpListLoaded()

  const [isActive, setIsActive] = React.useState(false)
  const [canInject, setCanInject] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const hasNoNormalAccounts = React.useMemo(
    () => items.every((item) => item.deleted),
    [items]
  )

  React.useEffect(() => {
    void canInjectContentScript().then(setCanInject)
  }, [])

  // 列表加载完成后正常账户为空就自动展开 FAB；数据从空 → 非空不主动收。
  // 必须等 isListLoaded，否则首次安装的「尚未加载」会被误判为空态。
  React.useEffect(() => {
    if (!isListLoaded) return
    if (hasNoNormalAccounts) setIsActive(true)
  }, [isListLoaded, hasNoNormalAccounts])

  // 点击 FAB 外部区域关闭
  React.useEffect(() => {
    if (!isActive) return
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (containerRef.current?.contains(target)) return
      setIsActive(false)
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
    }
  }, [isActive])

  const toggle = () => setIsActive((prev) => !prev)

  return (
    <div
      ref={containerRef}
      className={cn("absolute flex flex-col items-center z-10", {
        "bottom-8 right-8": containerType === ContainerType.PHONE,
        "bottom-4 right-4": containerType !== ContainerType.PHONE
      })}>
      {/* 额外的按钮，只有在激活时才显示 */}
      <div
        data-testid="fab-actions"
        className={cn(
          "flex flex-col items-center transition-transform duration-200 ease-out opacity-0 mb-1",
          { "opacity-100": isActive }
        )}>
        <FabAction
          tip={i18n.t("popup_fab_form_tip")}
          testId="fab-form"
          tone="secondary"
          onTrigger={() => modals.open("form")}>
          <Keyboard />
        </FabAction>
        <FabAction
          tip={i18n.t("popup_fab_qr_auto_tip")}
          testId="fab-qr-auto"
          tone="accent"
          disabled={!canInject}
          onTrigger={handleAutoScan}>
          <QrCode />
        </FabAction>
        <FabAction
          tip={i18n.t("popup_fab_qr_manual_tip")}
          testId="fab-qr-manual"
          tone="info"
          disabled={!canInject}
          onTrigger={() =>
            void handleManualScan(i18n.t("popup_fab_manual_scan_msg"))
          }>
          <SquareDashedMousePointer />
        </FabAction>
        <FabAction
          tip={i18n.t("popup_fab_qr_upload_tip")}
          testId="fab-qr-upload"
          tone="warning"
          onTrigger={() => modals.open("upload")}>
          <ImageUp />
        </FabAction>
      </div>

      {/* 主按钮 */}
      <button
        onClick={toggle}
        data-testid="fab-main"
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

export default EntryActions
