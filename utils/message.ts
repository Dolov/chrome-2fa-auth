import { contentBaseZindex } from "./constant"

const baseDuration = 3000

const message = {
  warning(text, duration = baseDuration) {
    return showMessage("warn", text, duration)
  },
  info(text, duration = baseDuration) {
    return showMessage("info", text, duration)
  },
  error(text, duration = baseDuration) {
    return showMessage("error", text, duration)
  },
  success(text, duration = baseDuration) {
    return showMessage("success", text, duration)
  }
}

function showMessage(type, text, duration) {
  const message = document.createElement("div")
  message.style.position = "fixed"
  message.style.top = "20px"
  message.style.right = "20px"
  message.style.padding = "10px 20px"
  message.style.borderRadius = "8px"
  message.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)"
  message.style.color = "white"
  message.style.fontSize = "16px"
  message.style.transition = "transform 0.3s ease, opacity 0.3s ease"
  message.style.transform = "translateX(100%)"
  message.style.opacity = "0"
  message.style.zIndex = `${contentBaseZindex + 1}`

  const colors = {
    info: "#2196F3",
    warn: "#FFC107",
    error: "#F44336",
    success: "#4CAF50"
  }

  message.style.backgroundColor = colors[type] || "#333"
  message.textContent = text

  document.body.appendChild(message)

  setTimeout(() => {
    message.style.opacity = "1"
    message.style.transform = "translateX(0)"
  }, 10)

  const destroy = () => {
    message.style.transform = "translateX(100%)"
    message.style.opacity = "0"
    setTimeout(() => message.remove(), 300)
  }

  message.addEventListener("click", (e) => {})

  setTimeout(destroy, duration)

  return {
    destroy
  }
}

export default message
