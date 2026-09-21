import { isOtpAuthUrl, parseOtpAuthUrl } from "~/utils/auth"
import { saveOTP } from "~/utils/storage"
import { highlightElement, startOtpMessageUpdater } from "~/utils/ui"
import { readQRCodeFromImage, waitForElement } from "~/utils/helpers"
import { type DataProps } from "~/utils/constant"
import message from "~/utils/message"

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: false,
  main() {
    const waitQRCodeImage = async () => {
      const qrImg = await waitForElement<HTMLImageElement>("img.qr-code-img")
      let parsedData: Awaited<ReturnType<typeof parseImage2faUrl>> | null = null

      const processImage = async () => {
        parsedData = await parseImage2faUrl(qrImg)
      }

      // 如果图片已加载
      if (qrImg.complete && qrImg.naturalWidth !== 0) {
        await processImage()
      } else {
        qrImg.onload = processImage
      }

      const saveButton = document.querySelector<HTMLButtonElement>(
        "button[data-target='two-factor-configure-otp-factor.saveButton']"
      )

      if (!saveButton) return

      saveButton.addEventListener("click", async (e) => {
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

      const input =
        document.querySelector<HTMLInputElement>(
          "input[data-target='two-factor-configure-otp-factor.appOtpInput']"
        ) ||
        document.querySelector<HTMLInputElement>(
          "input[data-target='two-factor-setup-verification.appOtpInput']"
        )

      if (input && secret) {
        startOtpMessageUpdater(input, secret, {
          style: { marginLeft: "16px" },
          placeholder: true
        })
      }

      return parsedData
    }

    waitQRCodeImage()
  }
})