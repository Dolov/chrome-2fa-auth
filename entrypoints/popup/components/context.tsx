import React from "react"

import { ContainerType } from "~/utils/types"

export type FilterType = "deleted" | "normal"

export interface PopupContextValue {
  containerType: ContainerType
  filter: FilterType
  setFilter: (filter: FilterType) => void
}

const defaultContext: PopupContextValue = {
  containerType: ContainerType.DEFAULT,
  filter: "normal",
  setFilter: () => {}
}

export const PopupContext = React.createContext<PopupContextValue>(defaultContext)

interface PopupProviderProps {
  containerType: ContainerType
  children: React.ReactNode
}

export const PopupProvider = ({
  children,
  containerType
}: PopupProviderProps): JSX.Element => {
  const [filter, setFilter] = React.useState<FilterType>("normal")

  const value = React.useMemo<PopupContextValue>(
    () => ({ containerType, filter, setFilter }),
    [containerType, filter]
  )

  return <PopupContext.Provider value={value}>{children}</PopupContext.Provider>
}
