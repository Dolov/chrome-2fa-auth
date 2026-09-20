import clsx from "clsx"
import { FileCog } from "lucide-react"
import React from "react"

import noData from "~/assets/no-data.svg"

import { useStorage } from "~/utils/storage-hook"

import { type DataProps } from "~/utils/constant"
import Favicon from "~/components/favicons"
import OtpRemaining from "~/components/otp-remaining"
import OtpText from "~/components/otp-text"
import { StorageKey } from "~/utils/constant"

import { GlobalContext } from "./context"
import ItemActions from "./item-actions"

interface ListProps {
  keyword: string
}

const List: React.FC<ListProps> = (props) => {
  const [data, setData] = useStorage<DataProps[]>(StorageKey.DATA, [])
  const { filter } = React.useContext(GlobalContext)

  const { keyword } = props

  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      // 先根据 filter 过滤
      const matchFilter = filter === "deleted" ? item.deleted : !item.deleted
      if (!matchFilter) return false
      // 再根据 keyword 过滤
      if (!keyword) return true
      const lKeyword = keyword.toLowerCase()
      // 检查 issuer 和 account 字段是否包含 keyword
      return (
        (item.issuer && item.issuer.toLowerCase().includes(lKeyword)) ||
        (item.account && item.account.toLowerCase().includes(lKeyword))
      )
    })
  }, [data, filter, keyword])

  return (
    <div className="flex-1 overflow-auto px-4">
      {filteredData.length === 0 && (
        <img
          src={noData}
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

const ListItem: React.FC<ListItemProps> = (props) => {
  const { data } = props
  const { pinned, issuer, secret, account, deleted } = data
  const [actionVisible, setActionVisible] = React.useState(false)

  return (
    <div
      className={clsx("group relative py-4 mb-4 rounded-btn overflow-hidden", {
        "shadow-lg": pinned,
        "bg-base-300": deleted,
        "bg-base-200": !deleted,
        "hover:shadow-lg": !deleted
      })}>
      <OtpRemaining deleted={deleted} className="absolute top-[0px] h-[3px]" />
      {pinned && <div className="absolute top-0 left-0 w-2 h-full bg-accent" />}
      <ItemActions
        visible={actionVisible}
        onClose={() => setActionVisible(false)}
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
                setActionVisible(true)
              }}>
              <FileCog size={16} />
            </button>
          </div>
          <Favicon className={clsx({ grayscale: deleted })} issuer={issuer} />
        </div>
        <div className="base-content font-medium -translate-y-[2px]">
          {account}
        </div>
        <div className="mt-2 flex justify-between items-center">
          <OtpText
            secret={secret}
            className={clsx("font-bold text-2xl", {
              "text-primary": !deleted,
              "text-base-content": deleted
            })}
          />
          <div>
            <div className="base-content text-[0.6rem] text-right">下一个</div>
            <OtpText
              next
              small
              secret={secret}
              className={clsx("text-sm font-medium", {
                "text-secondary": !deleted,
                "text-base-content": deleted
              })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default List
