import { FileCog } from "lucide-react"
import React from "react"

import noData from "~/assets/no-data.svg"
import Favicon from "~/components/favicons"
import OtpRemaining from "~/components/otp-remaining"
import OtpText from "~/components/otp-text"
import { useOtpList } from "~/features/otp-store"
import { cn } from "~/utils/cn"
import type { DataProps } from "~/utils/types"

import { HomeContext, type FilterType } from "./home-context"
import ItemActions from "./item-actions"

interface ListProps {
  keyword: string
}

const matchesFilter = (item: DataProps, filter: FilterType): boolean =>
  filter === "deleted" ? Boolean(item.deleted) : !item.deleted

const matchesKeyword = (item: DataProps, loweredKeyword: string): boolean => {
  const issuerMatches = item.issuer
    ? item.issuer.toLowerCase().includes(loweredKeyword)
    : false
  const accountMatches = item.account
    ? item.account.toLowerCase().includes(loweredKeyword)
    : false
  return issuerMatches || accountMatches
}

const List: React.FC<ListProps> = (props) => {
  const data = useOtpList()
  const { filter } = React.useContext(HomeContext)

  const { keyword } = props
  // 搜索：输入保持即时响应，过滤结果延后到空闲时重算
  const deferredKeyword = React.useDeferredValue(keyword)

  const filteredData = React.useMemo(() => {
    const loweredKeyword = deferredKeyword.toLowerCase()

    return data.filter((item) => {
      if (!matchesFilter(item, filter)) return false
      if (!deferredKeyword) return true
      return matchesKeyword(item, loweredKeyword)
    })
  }, [data, filter, deferredKeyword])

  return (
    <div className="flex-1 overflow-auto px-4">
      {filteredData.length === 0 && (
        <img
          src={noData}
          alt="暂无账户"
          className="mt-14 w-full transition-transform duration-700 ease-in-out animate-pulse hover:scale-105"
        />
      )}
      {filteredData.map((item) => {
        const { id } = item
        return <ListItem key={id} data={item} />
      })}
    </div>
  )
}

interface ListItemProps {
  data: DataProps
}

const ListItem = React.memo(function ListItem(props: ListItemProps) {
  const { data } = props
  const { pinned, issuer, account, deleted, period } = data
  const [isActionVisible, setIsActionVisible] = React.useState(false)

  return (
    <div
      className={cn("group relative py-4 mb-4 rounded-btn overflow-hidden", {
        "shadow-lg": pinned,
        "bg-base-300": deleted,
        "bg-base-200": !deleted,
        "hover:shadow-lg": !deleted
      })}>
      <OtpRemaining
        period={period}
        deleted={deleted}
        className="absolute top-[0px] h-[3px]"
      />
      {pinned && <div className="absolute top-0 left-0 w-2 h-full bg-accent" />}
      <ItemActions
        isVisible={isActionVisible}
        onClose={() => setIsActionVisible(false)}
        itemData={data}
      />
      <div className="px-4 relative">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="base-content font-medium text-lg">{issuer}</span>
            <button
              className="btn btn-circle btn-ghost btn-sm ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              onClick={(e) => {
                e.stopPropagation()
                setIsActionVisible(true)
              }}>
              <FileCog size={16} />
            </button>
          </div>
          <Favicon className={cn({ grayscale: deleted })} issuer={issuer} />
        </div>
        <div className="base-content font-medium -translate-y-[2px]">
          {account}
        </div>
        <div className="mt-2 flex justify-between items-center">
          <OtpText
            config={data}
            className={cn("font-bold text-2xl", {
              "text-primary": !deleted,
              "text-base-content": deleted
            })}
          />
          <div>
            <div className="base-content text-[0.6rem] text-right">下一个</div>
            <OtpText
              next
              small
              config={data}
              className={cn("text-sm font-medium", {
                "text-secondary": !deleted,
                "text-base-content": deleted
              })}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

export default List
