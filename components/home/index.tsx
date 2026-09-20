import React from "react"

import { ContainerType, SourceType } from "~/utils/constant"

import Container from "./container"
import { Provider } from "./context"
import Create from "./create"
import Header from "./header"
import List from "./list"

interface HomeProps {
  source: SourceType
  containerType: ContainerType
}

const Home: React.FC<HomeProps> = (props) => {
  const { containerType, source } = props

  const [keyword, setKeyword] = React.useState("")

  return (
    <Provider value={{ source, containerType }}>
      <Container>
        <Header keyword={keyword} setKeyword={setKeyword} />
        <List keyword={keyword} />
        <Create />
      </Container>
    </Provider>
  )
}

export default Home
