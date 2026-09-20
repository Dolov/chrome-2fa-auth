import React from "react"

import { useStorage } from "~/utils/storage-hook"

import Modal from "~/components/ui/modal"
import { StorageKey, type DataProps } from "~/utils/constant"

import { useModalWidth } from "./hooks"

const defaultForm: Partial<DataProps> = {
  issuer: "",
  secret: "",
  account: "",
  remark: ""
}

const OtpForm: React.FC<{
  visible: boolean
  onClose: () => void
  data?: DataProps
}> = (props) => {
  const { visible, onClose, data } = props
  const { width } = useModalWidth()
  const [dataList, setDataList] = useStorage<DataProps[]>(StorageKey.DATA, [])
  const title = "输入账户详细信息"
  const [form, setForm] = React.useState<DataProps>({
    ...defaultForm,
    ...data
  })

  const handleOk = () => {
    const { issuer, secret, account, remark } = form
    if (!issuer || !secret || !account) return
    if (data) {
      const newData = dataList.map((item) => {
        if (item.id === data.id) {
          return {
            ...item,
            issuer,
            secret,
            remark,
            account
          }
        }
        return item
      })
      setDataList(newData)
    } else {
      const id = `${Date.now()}`
      const item = {
        id,
        type: "totp",
        issuer,
        secret,
        account,
        remark
      }
      setDataList([...dataList, item as DataProps])
    }
    onClose()
    setForm(defaultForm as DataProps)
  }

  return (
    <Modal
      onOk={handleOk}
      title={title}
      width={width}
      visible={visible}
      onClose={onClose}>
      <div className="flex flex-col gap-3 p-1">
        <label className="input input-bordered flex items-center gap-2">
          平台
          <input
            type="text"
            className="grow"
            placeholder="例如：Github"
            value={form.issuer}
            onChange={(e) => {
              setForm({ ...form, issuer: e.target.value })
            }}
          />
        </label>
        <label className="input input-bordered flex items-center gap-2">
          密钥
          <input
            type="text"
            className="grow"
            placeholder="例如：N2CNXXJV7GG75PUI"
            value={form.secret}
            onChange={(e) => {
              setForm({ ...form, secret: e.target.value })
            }}
          />
        </label>
        <label className="input input-bordered flex items-center gap-2">
          帐户
          <input
            type="text"
            className="grow"
            placeholder="例如：Dolov"
            value={form.account}
            onChange={(e) => {
              setForm({ ...form, account: e.target.value })
            }}
          />
        </label>
        <label className="input input-bordered flex items-center gap-2">
          备注
          <input
            type="text"
            className="grow"
            placeholder="例如：账户类型、用途等"
            value={form.remark}
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
