import React from "react"

import { ContainerType } from "~/utils/types"

export type FilterType = "deleted" | "normal"

export interface HomeContextValue {
  containerType: ContainerType
  filter: FilterType
  setFilter: (filter: FilterType) => void
}

const defaultContext: HomeContextValue = {
  containerType: ContainerType.DEFAULT,
  filter: "normal",
  setFilter: () => {}
}

export const HomeContext = React.createContext<HomeContextValue>(defaultContext)

interface HomeProviderProps {
  containerType: ContainerType
  children: React.ReactNode
}

export const HomeProvider = ({
  children,
  containerType
}: HomeProviderProps): JSX.Element => {
  const [filter, setFilter] = React.useState<FilterType>("normal")

  const value = React.useMemo<HomeContextValue>(
    () => ({ containerType, filter, setFilter }),
    [containerType, filter]
  )

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>
}
