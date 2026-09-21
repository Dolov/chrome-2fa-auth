import { cn } from "~/utils/cn"
import React from "react"
import { createRoot } from "react-dom/client"

const containerId = "github-2fa-message"

interface MessageRef {
  addMessage: (type: string, content: string, duration?: number) => void
}

interface MessageProps {
  type: string
  content: string
  duration?: number
}

const defaultDuration = 3000

export const Message = (props: MessageProps, ref) => {
  const [messages, setMessages] = React.useState([])

  React.useImperativeHandle(
    ref,
    () => ({
      addMessage
    }),
    []
  )

  // 添加新消息
  const addMessage = (
    type: string,
    content: string,
    duration: number = defaultDuration
  ) => {
    const newMessage = { type, content, id: Date.now(), duration }
    setMessages((prevMessages) => [...prevMessages, newMessage])

    // 自动消失
    setTimeout(() => {
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== newMessage.id)
      )
    }, duration)
  }

  return (
    <div className="toast toast-top toast-center">
      {messages.map((message) => {
        const { id, type, content, duration } = message
        return (
          <div
            key={id}
            className={cn(
              "flex alert transition-opacity opacity-100 duration-500 ease-in-out py-2",
              {
                "alert-error": type === "error",
                "alert-success": type === "success",
                "alert-info": type === "info",
                "alert-warning": type === "warning"
              }
            )}
            style={{
              animation: `fadeInDown 0.5s ease-in-out, fadeOutUp 0.5s ease-in-out ${duration - 500}ms forwards`
            }}>
            <span>{content}</span>
          </div>
        )
      })}
    </div>
  )
}

const MessageWithRef = React.forwardRef<MessageRef>(Message)

const initMessage = () => {
  const messageRef = React.createRef<MessageRef>()
  let messageContainer = document.getElementById(containerId)

  if (!messageContainer) {
    messageContainer = document.createElement("div")
    messageContainer.id = containerId
    messageContainer.style.zIndex = "100000"
    messageContainer.style.position = "fixed"
    document.body.appendChild(messageContainer)
  }

  const root = createRoot(messageContainer)
  root.render(<MessageWithRef ref={messageRef} />)

  return {
    success(content: string, duration?: number) {
      const instance: MessageRef = messageRef.current
      if (instance) {
        instance.addMessage("success", content, duration)
      }
    },
    error(content: string, duration?: number) {
      const instance: MessageRef = messageRef.current
      if (instance) {
        instance.addMessage("error", content, duration)
      }
    },
    info(content: string, duration?: number) {
      const instance: MessageRef = messageRef.current
      if (instance) {
        instance.addMessage("info", content, duration)
      }
    },
    warning(content: string, duration?: number) {
      const instance: MessageRef = messageRef.current
      if (instance) {
        instance.addMessage("warning", content, duration)
      }
    }
  }
}

export default initMessage()
