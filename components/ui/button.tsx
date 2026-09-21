import React from "react"

import { cn } from "~/utils/cn"

interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  disabled?: boolean
  isLoadingOnly?: boolean
  loadingClassName?: string
}

const Button = (props: ButtonProps) => {
  const {
    isLoading,
    disabled,
    children,
    isLoadingOnly,
    loadingClassName,
    ...otherProps
  } = props

  const hasSmallSpinner = loadingClassName?.includes("loading-xs") ?? false
  const loadingSize = hasSmallSpinner ? "loading-xs" : "loading-md"
  const buttonChildren = isLoadingOnly && isLoading ? null : children

  return (
    <button {...otherProps} disabled={isLoading || disabled}>
      {isLoading && (
        <span
          className={cn(
            "loading loading-spinner",
            loadingSize,
            loadingClassName
          )}
        />
      )}
      {buttonChildren}
    </button>
  )
}

export default Button
