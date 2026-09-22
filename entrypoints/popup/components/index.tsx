import React from "react"

import { ContainerType } from "~/utils/types"

import EntryActions from "./entry-actions"
import Header from "./header"
import Layout from "./layout"
import List from "./list"
import { PopupProvider } from "./context"

interface MainProps {
  containerType: ContainerType
}

/**
 * popup 主视图：搜索 / 列表 / 创建入口三段式骨架。
 *
 * 也被 settings 预览（`entrypoints/settings/components/preview.tsx`）
 * 1:1 渲染——预览本身就是说明书，因此这里不带任何条件分支或调试态。
 */
const Main: React.FC<MainProps> = (props) => {
  const { containerType } = props

  const [keyword, setKeyword] = React.useState("")

  return (
    <PopupProvider containerType={containerType}>
      <Layout>
        <Header keyword={keyword} setKeyword={setKeyword} />
        <List keyword={keyword} />
        <EntryActions />
      </Layout>
    </PopupProvider>
  )
}

export default Main
