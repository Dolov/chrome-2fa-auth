import { cn } from "~/utils/cn"
import {
  ImageUp,
  Keyboard,
  Plus,
  QrCode,
  SquareDashedMousePointer
} from "lucide-react"
import React from "react"

import { useStorage } from "~/utils/storage-hook"

import OtpRemaining from "~/components/otp-remaining"
import OtpText from "~/components/otp-text"
import Button from "~/components/ui/button"
import message from "~/components/ui/message"
import Modal from "~/components/ui/modal"
import { isOtpAuthUrl, parseOtpAuthUrl } from "~/utils/auth"
import { sleep } from "~/utils/dom-utils"
import { canInjectContentScript } from "~/utils/runtime-utils"
import { readQRCodeFromFile } from "~/utils/helpers"
import { checkOtpAuthConfigExist, saveOTP } from "~/utils/storage"
import { ActionType, StorageKey, type DataProps } from "~/utils/constant"

import { GlobalContext } from "./context"
import { useModalWidth } from "./hooks"
import OptForm from "./otp-form"

interface CreateProps {}

const Create: React.FC<CreateProps> = (props) => {
  const { containerType } = React.useContext(GlobalContext)
  const [active, setActive] = React.useState(false)
  const [visible, setVisible] = React.useState(false)
  const [dataList, setDataList] = useStorage<DataProps[]>(StorageKey.DATA, [])
  const [isScanning, setIsScanning] = React.useState(false)
  const [injectable, setInjectable] = React.useState(false)
  const [uploadVisible, setUploadVisible] = React.useState(false)

  React.useEffect(() => {
    canInjectContentScript().then(setInjectable)
  }, [])

  const toggle = () => {
    setActive(!active)
  }

  const handleClose = () => {
    setActive(false)
    setVisible(false)
  }

  const handleAutoScan = () => {
    // 发送消息给 content.js
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const firstTab = tabs[0]
      if (!firstTab?.id) return
      browser.tabs.sendMessage(
        firstTab.id,
        { action: ActionType.AUTOSCAN },
        handleQRScanResult
      )
    })
  }

  interface QRScanResult {
    success: boolean
    data?: string
    error?: string
  }

  const handleQRScanResult = async (result: QRScanResult | undefined) => {
    if (!result) return
    const { success, data } = result
    // 无法自动识别二维码，开启手动截图模式
    if (!success) {
      const messageText = "未检测到二维码，开启手动截图模式，ESC 退出"
      sendManualScanMessage(messageText)
      return
    }
    const parsedData = parseOtpAuthUrl(data)

    setIsScanning(true)
    await sleep(1000)

    if (!parsedData.account) {
      const account = prompt("请输入账号名称")
      if (!account) {
        setIsScanning(false)
        message.error("请输入账号名称")
        return
      }
      parsedData.account = account
    }

    if (checkOtpAuthConfigExist(parsedData)) {
      setIsScanning(false)
      message.warning("该 QR code 已存在。")
      return
    }

    await saveOTP({
      id: Date.now().toString(),
      ...parsedData
    })

    setActive(false)
    setIsScanning(false)
    message.success(`${parsedData.issuer} - ${parsedData.account} 添加成功`)
  }

  const handleManualScan = () => {
    const messageText = "手动截图模式，ESC 退出"
    sendManualScanMessage(messageText)
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

  const handleUpload = () => {
    setUploadVisible(true)
  }

  const handleUploadClose = () => {
    setUploadVisible(false)
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

const UploadModal = (props) => {
  const { visible, onClose } = props
  const { width } = useModalWidth()
  const [error, setError] = React.useState<string | null>(null)
  const [parsedData, setParsedData] =
    React.useState<ReturnType<typeof parseOtpAuthUrl>>(null)
  const [accountName, setAccountName] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (visible) {
      window.addEventListener("paste", handlePaste)
    }

    return () => {
      window.removeEventListener("paste", handlePaste)
    }
  }, [visible])

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    const item = items?.[0]
    if (!item) return
    const imageType = item.type.startsWith("image/")
    if (!imageType) return

    const blob = item.getAsFile()
    if (!blob) return
    // 使用 DataTransfer 来模拟用户选择文件
    const dt = new DataTransfer()
    dt.items.add(blob)
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files
    }
    processFile(blob)
  }

  const processFile = async (file: File) => {
    setParsedData(null)
    const data = await readQRCodeFromFile(file)
    const isOtpAuth = isOtpAuthUrl(data)
    if (!isOtpAuth) {
      setError("无效的 OTP Auth URL")
      return
    }
    const parsedData = parseOtpAuthUrl(data)

    const isExist = await checkOtpAuthConfigExist(parsedData)
    if (isExist) {
      setError("该账户已存在")
      return
    }

    setError(null)
    setParsedData(parsedData)
  }

  const handleOk = async () => {
    const saveData = {
      id: Date.now().toString(),
      ...parsedData
    }
    if (!saveData.account) {
      saveData.account = accountName
    }

    const isExist = await checkOtpAuthConfigExist(saveData)
    if (isExist) {
      setError("该账户已存在")
      return
    }
    await saveOTP(saveData)
    handleClose()
  }

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleOk()
    }
  }

  const handleClose = () => {
    setError(null)
    setParsedData(null)
    setAccountName("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onClose()
  }

  const { secret, account } = parsedData || {}
  const okDisabled = (!accountName && !account) || !!error

  return (
    <Modal
      width={width}
      title="上传二维码截图"
      visible={visible}
      onOk={handleOk}
      onClose={onClose}
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
          <div>
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

export default Create
