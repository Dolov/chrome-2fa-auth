import message from "~/utils/message"
import { isOtpAuthUrl, parseOtpAuthUrl } from "~/utils/auth"
import { saveOTP } from "~/utils/storage"
import { highlightElement, startOtpMessageUpdater } from "~/utils/ui"
import { readQRCodeFromImage, waitForElement } from "~/utils/helpers"
import { type DataProps } from "~/utils/constant"

import {
  GITHUB_QR_IMAGE_SELECTOR,
  GITHUB_QR_SAVE_BUTTON_SELECTOR,
  GITHUB_QR_VERIFY_INPUT_SELECTOR
} from "./helpers"

/**
 * GitHub 启用 2FA 页：扫描 QR → 填验证码 → 保存到本地
 * 适用 URL：github.com/settings/two_factor_authentication/...
 */
export const setupGitHubReadQR = async (): Promise<void> => {
  const qrImg = await waitForElement<HTMLImageElement>(GITHUB_QR_IMAGE_SELECTOR)
  let parsedData: Omit<DataProps, "id"> | null = null

  const processImage = async () => {
    parsedData = await parseImage2faUrl(qrImg)
  }

  // 图片可能已加载或在加载中
  if (qrImg.complete && qrImg.naturalWidth !== 0) {
    await processImage()
  } else {
    qrImg.onload = processImage
  }

  const saveButton = document.querySelector<HTMLButtonElement>(
    GITHUB_QR_SAVE_BUTTON_SELECTOR
  )
  if (!saveButton) return

  saveButton.addEventListener("click", async () => {
    if (!parsedData) return
    await saveOTP({
      ...parsedData,
      id: Date.now().toString()
    })
    message.success("添加成功")
  })
}

const parseImage2faUrl = async (
  qrImg: HTMLImageElement
): Promise<Omit<DataProps, "id"> | null> => {
  const url = await readQRCodeFromImage(qrImg)
  if (!isOtpAuthUrl(url)) return null

  highlightElement(qrImg)

  const parsedData = parseOtpAuthUrl(url)
  const { secret } = parsedData

  const input = document.querySelector<HTMLInputElement>(
    GITHUB_QR_VERIFY_INPUT_SELECTOR
  )

  if (input && secret) {
    startOtpMessageUpdater(input, secret, {
      style: { marginLeft: "16px" },
      placeholder: true
    })
  }

  return parsedData
}