import { cn } from "~/utils/cn"
import { ImageUp } from "lucide-react"
import React from "react"

import OtpRemaining from "~/components/otp-remaining"
import OtpText from "~/components/otp-text"
import Modal from "~/components/ui/modal"
import { parseOtpAuthUrl } from "~/utils/otpauth"
import { usePopupIntake } from "~/features/otp-intake"

import { GlobalContext } from "./context"
import { useModalWidth } from "./hooks"

interface UploadModalProps {
  visible: boolean
  onClose: () => void
}

const UploadModal: React.FC<UploadModalProps> = (props) => {
  const { visible, onClose } = props
  const { width } = useModalWidth()
  const { containerType } = React.useContext(GlobalContext)
  const intake = usePopupIntake()

  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // preview state：parse 完后让用户预览、确认或补账号
  const [preview, setPreview] = React.useState<
    ReturnType<typeof parseOtpAuthUrl> | null
  >(null)
  const [accountName, setAccountName] = React.useState("")

  React.useEffect(() => {
    if (!visible) {
      // 关闭时清理 preview / account
      setPreview(null)
      setAccountName("")
      setError(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [visible])

  React.useEffect(() => {
    if (!visible) return
    window.addEventListener("paste", handlePaste)
    return () => {
      window.removeEventListener("paste", handlePaste)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const processFile = async (file: File) => {
    setError(null)
    setPreview(null)

    // intake 内部会读文件 + 解析 + 校验 + 落库 + 提示
    // 我们这里只关心是否需要补账号（preview 状态）
    // 因此先用 readFromFile → parseOtpAuthUrl 做预览判断
    const { readFromFile } = await import("~/utils/qr-decode")
    let data: string
    try {
      data = await readFromFile(file)
    } catch (e) {
      setError(`无法读取文件：${(e as Error).message}`)
      return
    }

    const { isOtpAuthUrl } = await import("~/utils/otpauth")
    if (!isOtpAuthUrl(data)) {
      setError("无效的 OTP Auth URL")
      return
    }

    try {
      const parsed = parseOtpAuthUrl(data)
      setPreview(parsed)
    } catch (e) {
      setError((e as Error).message)
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
    if (!preview || isSubmitting) return
    setIsSubmitting(true)

    const candidate = {
      ...preview,
      account: preview.account ?? accountName
    }

    const outcome = await intake(
      { kind: "parsed", config: candidate },
      // 这里 hintAccount 已是 candidate.account，所以 promptAccount 不会被触发；
      // 若 candidate.account 为空，则 popup intake 会调 promptAccount
      { hintAccount: candidate.account || undefined }
    )

    setIsSubmitting(false)

    if (outcome.status === "added" || outcome.status === "exists") {
      onClose()
    }
  }

  const handleClose = () => {
    onClose()
  }

  const { secret, account } = preview || {}
  const okDisabled =
    isSubmitting ||
    (!!secret && !account && !accountName) ||
    !!error

  return (
    <Modal
      width={width}
      title={
        <div className="flex items-center gap-2">
          <ImageUp size={18} />
          <span>上传二维码截图</span>
        </div>
      }
      visible={visible}
      onOk={handleOk}
      onClose={handleClose}
      okDisabled={okDisabled}>
      <div className="p-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadChange}
          className="file-input file-input-bordered file-input-neutral w-full max-w-xs"
        />
      </div>
      <div className="p-2">
        <p className="text-sm text-neutral-500">你也可以直接粘贴截图</p>
        {!account && secret && (
          <label className="input input-bordered flex items-center mt-6">
            <input
              autoFocus
              type="text"
              className="grow"
              placeholder="输入账户名称"
              value={accountName}
              onKeyDown={handleEnter}
              onChange={(e) => {
                setAccountName(e.target.value)
              }}
            />
          </label>
        )}
        {secret && (
          <div className={cn({ "mt-4": containerType !== "phone" })}>
            <OtpRemaining />
            <OtpText
              small
              secret={secret}
              className="text-primary font-bold text-2xl"
            />
          </div>
        )}
      </div>
      {error && (
        <div role="alert" className="alert alert-warning flex mb-2">
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
          <span className="align-left">{error}</span>
        </div>
      )}
    </Modal>
  )
}

export default UploadModal
