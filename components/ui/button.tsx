import React from "react"

interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  disabled?: boolean
  isLoadingOnly?: boolean
}

const Button = (props: ButtonProps) => {
  const { isLoading, disabled, children, isLoadingOnly, ...otherProps } = props

  const buttonChildren = isLoadingOnly && isLoading ? null : children

  return (
    <button {...otherProps} disabled={isLoading || disabled}>
      {isLoading && (
        <span className="loading loading-spinner loading-md" />
      )}
      {buttonChildren}
    </button>
  )
}

export default Button
