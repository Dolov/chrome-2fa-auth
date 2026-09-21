import React from "react"

import { ContainerType } from "~/utils/types"

import Container from "./container"
import CreateFab from "./create-fab"
import Header from "./header"
import { HomeProvider } from "./home-context"
import List from "./list"

interface HomeProps {
  containerType: ContainerType
}

const Home: React.FC<HomeProps> = (props) => {
  const { containerType } = props

  const [keyword, setKeyword] = React.useState("")

  return (
    <HomeProvider containerType={containerType}>
      <Container>
        <Header keyword={keyword} setKeyword={setKeyword} />
        <List keyword={keyword} />
        <CreateFab />
      </Container>
    </HomeProvider>
  )
}

export default Home
