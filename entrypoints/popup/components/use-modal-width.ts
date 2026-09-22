import React from "react"

import { ContainerType } from "~/utils/types"

import { PopupContext } from "./context"

export const useModalWidth = () => {
  const { containerType } = React.useContext(PopupContext)

  if (containerType === ContainerType.PHONE) {
    return {
      width: "85%",
      left: "15px",
      right: "15px",
      top: "14px",
      bottom: "18px",
      radius: "40px"
    }
  }

  return {
    width: "94%",
    left: "0",
    right: "0",
    top: "0",
    bottom: "0",
    radius: "0"
  }
}
