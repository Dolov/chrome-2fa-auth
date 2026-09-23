import { ImageUp } from "lucide-react"
import React from "react"

import OtpRemaining from "./otp-remaining"
import OtpText from "./otp-text"
import Modal from "~/components/ui/modal"
import { usePopupIntake } from "~/features/otp-intake/adapters/popup"
import { cn } from "~/utils/cn"
import { i18n } from "#i18n"
import { isOtpAuthUrl, parseOtpAuthUrl } from "~/utils/libs/otpauth"
import { ContainerType } from "~/utils/types"

import { PopupContext } from "./context"
import { useModalWidth } from "./use-modal-width"

interface UploadModalProps {
  isVisible: boolean
  onClose: () => void
}

const UploadModal: React.FC<UploadModalProps> = (props) => {
  const { isVisible, onClose } = props
  const { width } = useModalWidth()
  const { containerType } = React.useContext(PopupContext)
  const intake = usePopupIntake()

  // kind 供 E2E 区分错误分支（文案会随 i18n / 调整变化，不作为断言依据）
  const [error, setError] = React.useState<{
    kind: "file-read" | "invalid-otpauth" | "parse"
    message: string
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // preview state：parse 完后让用户预览、确认或补账号
  const [preview, setPreview] = React.useState<ReturnType<
    typeof parseOtpAuthUrl
  > | null>(null)
  /** raw otpauth 字符串，OK 路径走 intake.kind: 'qr-data' 需要 */
  const [data, setData] = React.useState<string | null>(null)
  const [accountName, setAccountName] = React.useState("")

  React.useEffect(() => {
    if (isVisible) return
    // 关闭时清理 preview / account
    setPreview(null)
    setData(null)
    setAccountName("")
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [isVisible])

  React.useEffect(() => {
    if (!isVisible) return
    window.addEventListener("paste", handlePaste)
    return () => {
      window.removeEventListener("paste", handlePaste)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  const processFile = async (file: File) => {
    setError(null)
    setPreview(null)
    setData(null)

    // intake 内部会读文件 + 解析 + 校验 + 落库 + 提示
    // 我们这里只关心是否需要补账号（preview 状态）
    // 因此先用 readFromFile → parseOtpAuthUrl 做预览判断
    const { readFromFile } = await import("~/utils/qr-decode")
    let raw: string
    try {
      raw = await readFromFile(file)
    } catch (e) {
      setError({
        kind: "file-read",
        message: i18n.t("intake_error_file_read", [
          e instanceof Error ? e.message : String(e)
        ])
      })
      return
    }

    if (!isOtpAuthUrl(raw)) {
      setError({
        kind: "invalid-otpauth",
        message: i18n.t("popup_modal_upload_invalid_error")
      })
      return
    }

    try {
      const parsed = parseOtpAuthUrl(raw)
      setPreview(parsed)
      setData(raw)
    } catch (e) {
      setError({
        kind: "parse",
        message: e instanceof Error ? e.message : String(e)
      })
    }
  }

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
  }

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    const item = items?.[0]
    if (!item || !item.type.startsWith("image/")) return
    const blob = item.getAsFile()
    if (!blob) return

    // 模拟用户选择文件 → 触发 processFile
    const dt = new DataTransfer()
    dt.items.add(blob)
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files
    }
    void processFile(blob)
  }

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void handleOk()
  }

  const handleOk = async () => {
    if (!preview || !data || isSubmitting) return
    setIsSubmitting(true)

    const outcome = await intake(
      { kind: "qr-data", data },
      // hintAccount 取 preview.account（QR 自带）或用户在 modal 里手填的 accountName；
      // 都为空时 intake 会调 promptAccount。
      { hintAccount: (preview.account ?? accountName) || undefined }
    )

    setIsSubmitting(false)

    if (outcome.status === "added" || outcome.status === "exists") {
      onClose()
    }
  }

  const { account } = preview || {}
  const isOkDisabled =
    isSubmitting || (!!preview?.secret && !account && !accountName) || !!error

  return (
    <Modal
      testId="upload-modal"
      width={width}
      title={
        <div className="flex items-center gap-2">
          <ImageUp size={18} />
          <span>{i18n.t("popup_modal_upload_title")}</span>
        </div>
      }
      isVisible={isVisible}
      onOk={handleOk}
      onClose={onClose}
      isOkDisabled={isOkDisabled}>
      <div className="p-1">
        <input
          ref={fileInputRef}
          type="file"
          data-testid="upload-file-input"
          accept="image/*"
          onChange={handleUploadChange}
          className="file-input file-input-bordered file-input-neutral w-full max-w-xs"
        />
      </div>
      <div className="p-2">
        <p className="text-sm text-neutral-500">{i18n.t("popup_modal_upload_paste_hint")}</p>
        {!account && preview?.secret && (
          <label className="input input-bordered flex items-center mt-6">
            <input
              autoFocus
              type="text"
              data-testid="upload-account-input"
              className="grow"
              placeholder={i18n.t("popup_modal_upload_account_placeholder")}
              value={accountName}
              onKeyDown={handleEnter}
              onChange={(e) => {
                setAccountName(e.target.value)
              }}
            />
          </label>
        )}
        {preview && (
          <div
            data-testid="upload-preview"
            className={cn({ "mt-4": containerType !== ContainerType.PHONE })}>
            <OtpRemaining period={preview.period} />
            <OtpText
              small
              config={preview}
              className="text-primary font-bold text-2xl"
            />
          </div>
        )}
      </div>
      {error && (
        <div
          role="alert"
          data-testid="upload-error"
          data-upload-error={error.kind}
          className="alert alert-warning flex mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="align-left">{error.message}</span>
        </div>
      )}
    </Modal>
  )
}

export default UploadModal
