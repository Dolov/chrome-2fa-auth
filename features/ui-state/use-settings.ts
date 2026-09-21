import { useStorage } from "./use-storage"

import { DEFAULT_SETTINGS } from "~/utils/constants"
import type { Settings } from "~/utils/types"
import { StorageKey } from "~/utils/types"

/**
 * `settings` 键的读写入口：一次订阅，返回当前值与「按字段更新」函数。
 *
 * 目前只有设置页一个写入方，所以 patch 直接基于渲染时的快照合并；
 * 若将来 popup 也要写同一批字段，需要改成读存储后再合并。
 */
export const useSettings = () => {
  const [settings, setSettings] = useStorage<Settings>(
    StorageKey.SETTINGS,
    DEFAULT_SETTINGS
  )

  const patchSettings = (patch: Partial<Settings>) =>
    setSettings({ ...settings, ...patch })

  return [settings, patchSettings] as const
}
