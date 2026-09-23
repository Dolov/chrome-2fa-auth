import React from "react"

import { FaviconMinimal } from "~/components/favicons"
import Modal from "~/components/ui/modal"
import { useOtpMutators } from "~/features/otp-store"
import { i18n } from "#i18n"
import type { DataProps } from "~/utils/types"

import { useModalWidth } from "./use-modal-width"

interface DeleteModalProps {
  data: DataProps
  isVisible: boolean
  onClose: () => void
}

const DeleteModal: React.FC<DeleteModalProps> = (props) => {
  const { isVisible, onClose, data } = props
  const { width } = useModalWidth()
  const { softDelete, hardDelete } = useOtpMutators()

  const { issuer, account, deleted } = data

  const handleDelete = async () => {
    if (deleted) {
      await hardDelete(data.id)
    } else {
      await softDelete(data.id)
    }
    onClose()
  }

  const text = deleted
    ? i18n.t("popup_modal_delete_hard_text")
    : i18n.t("popup_modal_delete_soft_text")

  return (
    <Modal
      width={width}
      title={
        <div className="flex items-center gap-2">
          <FaviconMinimal className="text-2xl!" issuer={issuer} />
          <span>{account}</span>
        </div>
      }
      isVisible={isVisible}
      onClose={onClose}
      onOk={handleDelete}
      okText={i18n.t("popup_modal_delete_ok")}
      confirmButtonClassName="btn-error">
      <div
        data-testid="delete-modal"
        data-confirm-kind={deleted ? "hard" : "soft"}
        className="font-bold text-lg flex items-center gap-2">
        {text}
      </div>
    </Modal>
  )
}

export default DeleteModal
