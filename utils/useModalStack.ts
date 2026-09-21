import React from "react"

/**
 * 多 modal 状态集中管理（候选 E / 简化版）
 *
 * 动机：原本每个 modal 一个 useState，n 个 modal 就要写 n 个 boolean；
 * 命名分散，且关闭逻辑（同时关父级 sheet）容易写漏。
 *
 * 这里把 modal 的可见性聚合成一个 `{ [K]: boolean }` map，
 * 调用方一次性声明 key 列表，hook 返回 open/close/closeAll。
 *
 * 这不是栈式管理（modal 之间互斥），而是**并行可见性聚合**——
 * 实际 UI 里多个 modal 可同时存在（item-actions.tsx 即如此），
 * 强行做栈会破坏现有交互。
 */
export type ModalState<K extends string> = Record<K, boolean>

export const useModalStack = <K extends string>(keys: readonly K[]) => {
  const initialState = React.useMemo(
    () =>
      Object.fromEntries(keys.map((key) => [key, false])) as ModalState<K>,
    [keys]
  )
  const [state, setState] = React.useState<ModalState<K>>(initialState)

  const open = React.useCallback((key: K) => {
    setState((prev) => ({ ...prev, [key]: true }))
  }, [])

  const close = React.useCallback((key: K) => {
    setState((prev) => ({ ...prev, [key]: false }))
  }, [])

  const toggle = React.useCallback((key: K) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const closeAll = React.useCallback(() => {
    setState(
      Object.fromEntries(keys.map((key) => [key, false])) as ModalState<K>
    )
  }, [keys])

  const isOpen = React.useCallback(
    (key: K) => state[key],
    [state]
  )

  return { state, open, close, toggle, closeAll, isOpen }
}
