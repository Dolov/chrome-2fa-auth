import { cn } from "~/utils/cn"
import React from "react"

interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  disabled?: boolean
  onlyLoading?: boolean
  loadingClassName?: string
}

const Button = (props: ButtonProps) => {
  const {
    loading,
    disabled,
    children,
    onlyLoading,
    loadingClassName,
    ...otherProps
  } = props

  const buttonChildren = onlyLoading && loading ? null : children
  const loadingSize = loadingClassName?.includes?.("loading-xs")
    ? "loading-xs"
    : "loading-md"
  return (
    <button {...otherProps} disabled={loading || disabled}>
      {loading && (
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
