import { Menu, Search, Trash, X } from "lucide-react"
import React from "react"

import Dropdown from "~/components/ui/dropdown"
import { useOtpList } from "~/features/otp-store"
import { openSettingsPage } from "~/features/runtime/open-settings"
import { cn } from "~/utils/cn"
import { ContainerType } from "~/utils/types"

import { HomeContext } from "./home-context"

interface HeaderProps {
  keyword: string
  setKeyword(value: string): void
}

const Header: React.FC<HeaderProps> = (props) => {
  const { containerType, filter, setFilter } = React.useContext(HomeContext)
  const accounts = useOtpList()
  const { keyword, setKeyword } = props
  const [isSearching, setIsSearching] = React.useState(false)

  const handleSearch = () => {
    setIsSearching((prev) => !prev)
    if (isSearching) {
      setKeyword("")
    }
  }

  // 一次遍历同时统计，避免两次 filter 扫描
  let deletedCount = 0
  let normalCount = 0
  for (const account of accounts) {
    if (account.deleted) {
      deletedCount += 1
    } else {
      normalCount += 1
    }
  }
  const isDeletedFilter = filter === "deleted"

  const menuItems = React.useMemo(() => {
    const items = []

    if (filter === "deleted") {
      items.push({
        key: "all",
        label: (
          <div>
            全部
            <div className="badge badge-primary ml-2">{normalCount}</div>
          </div>
        ),
        onClick: () => setFilter("normal")
      })
    }

    if (filter === "normal" && deletedCount > 0) {
      items.push({
        key: "deleted",
        label: (
          <div>
            已删除
            <div className="badge badge-neutral ml-2">{deletedCount}</div>
          </div>
        ),
        onClick: () => setFilter("deleted")
      })
    }

    items.push({
      key: "settings",
      label: "设置",
      onClick: openSettingsPage
    })

    return items
  }, [filter, normalCount, deletedCount, setFilter])

  return (
    <div
      className={cn("grid grid-cols-[1fr_2fr_1fr] items-center px-4 h-16", {
        "mt-4": containerType === ContainerType.PHONE
      })}>
      <Dropdown trigger="hover" menus={menuItems}>
        <button
          className="btn btn-sm btn-circle btn-ghost relative"
          tabIndex={0}>
          {isDeletedFilter && (
            <div>
              <Trash size={18} className="text-error" />
              <div className="badge badge-neutral absolute -right-4 -top-3">
                {deletedCount}
              </div>
            </div>
          )}
          {!isDeletedFilter && <Menu size={20} />}
        </button>
      </Dropdown>
      <div className="text-2xl font-bold text-center whitespace-nowrap">
        {isSearching && (
          <input
            autoFocus
            className="input input-sm input-ghost border-none !outline-none"
            placeholder="搜索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        )}
        {!isSearching && <span>2FA Auth</span>}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSearch}
          className="btn btn-ghost btn-sm btn-circle">
          {isSearching && <X size={20} />}
          {!isSearching && <Search size={20} />}
        </button>
      </div>
    </div>
  )
}

export default Header
