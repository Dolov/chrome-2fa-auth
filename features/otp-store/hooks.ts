import React from "react"

import { useOtpList, useOtpMutators } from "./context"

/**
 * 当前 OTP 列表 + 把指定恢复码标记为已复制。
 *
 * 用法：`const [markCopied, items] = useUpdateCopiedCodeStatus()`
 */
export const useUpdateCopiedCodeStatus = () => {
  const items = useOtpList()
  const { markRecoveryCodeCopied } = useOtpMutators()

  const updater = React.useCallback(
    async (id: string, copiedCode: string) => {
      await markRecoveryCodeCopied(id, copiedCode)
    },
    [markRecoveryCodeCopied]
  )

  return [updater, items] as const
}
