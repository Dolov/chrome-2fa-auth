import React from "react"

import { cn } from "~/utils/cn"
import { ContainerType } from "~/utils/types"

import { HomeContext } from "../home-context"
import Phone from "./phone"

export interface ContainerProps {
  children: React.ReactNode
  className?: string
}

const Container: React.FC<ContainerProps> = (props) => {
  const { children } = props
  const { containerType } = React.useContext(HomeContext)
  if (containerType === ContainerType.PHONE) {
    return <Phone className="relative w-[378px] h-[600px]">{children}</Phone>
  }
  return (
    <div
      className={cn(
        "relative w-[350px] h-[600px] bg-base-100 flex flex-col pb-4"
      )}>
      {children}
    </div>
  )
}

export default Container
