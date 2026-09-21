import React from "react"

import { ContainerType, SourceType } from "~/utils/types"

export interface GlobalContextProps {
  source: SourceType
  containerType: ContainerType
  filter: "deleted" | "normal"
  setFilter: (filter: "deleted" | "normal") => void
}

const defaultContext: GlobalContextProps = {
  source: SourceType.POPUP,
  containerType: ContainerType.DEFAULT,
  filter: "normal",
  setFilter: () => {}
}

export const GlobalContext =
  React.createContext<GlobalContextProps>(defaultContext)

interface ProviderProps {
  value: Omit<GlobalContextProps, "setFilter" | "filter">
  children: React.ReactNode
}

export const Provider = ({ children, value }: ProviderProps): JSX.Element => {
  const [filter, setFilter] = React.useState<"deleted" | "normal">("normal")

  const contextValue: GlobalContextProps = React.useMemo(
    () => ({
      ...value,
      filter,
      setFilter
    }),
    [value, filter]
  )

  return React.createElement(
    GlobalContext.Provider,
    { value: contextValue },
    children
  )
}

export const Consumer = GlobalContext.Consumer
