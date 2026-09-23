import React from "react"

import Modal from "~/components/ui/modal"
import message from "~/features/page-ui/toast"
import { useOtpMutators } from "~/features/otp-store"
import { i18n } from "#i18n"
import type { DataProps } from "~/utils/types"

import { useModalWidth } from "./use-modal-width"

const EMPTY_FORM: Partial<DataProps> = {
  issuer: "",
  secret: "",
  account: "",
  remark: ""
}

interface OtpFormProps {
  isVisible: boolean
  onClose: () => void
  data?: DataProps
}

const OtpForm: React.FC<OtpFormProps> = (props) => {
  const { isVisible, onClose, data } = props
  const { width } = useModalWidth()
  const { add, exists, update } = useOtpMutators()
  const title = i18n.t("popup_form_title")
  const [form, setForm] = React.useState<Partial<DataProps>>({
    ...EMPTY_FORM,
    ...data
  })

  const handleOk = async () => {
    const { issuer, secret, account, remark } = form
    if (!issuer || !secret || !account) return

    if (data) {
      await update(data.id, { issuer, secret, account, remark })
    } else {
      // 只有 type+issuer+secret+account 四元组全等才算「已存在」：
      // 同账号换密钥是另一条独立条目（可并存），不拦。
      const isExisting = await exists({ type: "totp", issuer, secret, account })
      if (isExisting) {
        message.warning(i18n.t("intake_warn_account_exists"))
        return
      }
      await add({ type: "totp", issuer, secret, account, remark })
    }
    onClose()
    setForm(EMPTY_FORM)
  }

  return (
    <Modal
      onOk={handleOk}
      title={title}
      width={width}
      isVisible={isVisible}
      onClose={onClose}>
      <div className="flex flex-col gap-3 p-1">
        <label className="input flex items-center gap-2">
          {i18n.t("popup_form_issuer_label")}
          <input
            type="text"
            data-testid="form-issuer"
            className="grow"
            placeholder={i18n.t("popup_form_issuer_placeholder")}
            value={form.issuer ?? ""}
            onChange={(e) => {
              setForm({ ...form, issuer: e.target.value })
            }}
          />
        </label>
        <label className="input flex items-center gap-2">
          {i18n.t("popup_form_secret_label")}
          <input
            type="text"
            data-testid="form-secret"
            className="grow"
            placeholder={i18n.t("popup_form_secret_placeholder")}
            value={form.secret ?? ""}
            onChange={(e) => {
              setForm({ ...form, secret: e.target.value })
            }}
          />
        </label>
        <label className="input flex items-center gap-2">
          {i18n.t("popup_form_account_label")}
          <input
            type="text"
            data-testid="form-account"
            className="grow"
            placeholder={i18n.t("popup_form_account_placeholder")}
            value={form.account ?? ""}
            onChange={(e) => {
              setForm({ ...form, account: e.target.value })
            }}
          />
        </label>
        <label className="input flex items-center gap-2">
          {i18n.t("popup_form_remark_label")}
          <input
            type="text"
            data-testid="form-remark"
            className="grow"
            placeholder={i18n.t("popup_form_remark_placeholder")}
            value={form.remark ?? ""}
            onChange={(e) => {
              setForm({ ...form, remark: e.target.value })
            }}
          />
        </label>
      </div>
    </Modal>
  )
}

export default OtpForm
