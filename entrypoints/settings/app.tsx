import React from "react"

import Main from "~/components/home"
import { OtpProvider } from "~/features/otp-store"
import { useStorage } from "~/features/ui-state/use-storage"
import { useThemeChange } from "~/features/ui-state/use-theme-change"
import { cn } from "~/utils/cn"
import { DEFAULT_SETTINGS } from "~/utils/constants"
import { ContainerType, StorageKey } from "~/utils/types"

const themes = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
  "dim",
  "nord",
  "sunset"
]

const ThemeList = () => {
  const [theme, setTheme] = useThemeChange()

  return (
    <div className="rounded-box grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {themes.map((item) => {
        const isChecked = theme === item
        return (
          <div
            key={item}
            onClick={() => setTheme(item)}
            className={cn("overflow-hidden rounded-lg item-border", {
              "item-border-active": isChecked
            })}>
            <div
              data-theme={item}
              className="bg-base-100 text-base-content w-full cursor-pointer font-sans">
              <div className="grid grid-cols-5 grid-rows-3">
                <div className="bg-base-200 col-start-1 row-span-2 row-start-1"></div>{" "}
                <div className="bg-base-300 col-start-1 row-start-3"></div>
                <div className="bg-base-100 col-span-4 col-start-2 row-span-3 row-start-1 flex flex-col gap-1 p-2">
                  <div className="font-bold">{item}</div>
                  <div className="flex flex-wrap gap-1">
                    <div className="bg-primary flex aspect-square w-5 items-center justify-center rounded lg:w-6">
                      <div className="text-primary-content text-sm font-bold">
                        A
                      </div>
                    </div>
                    <div className="bg-secondary flex aspect-square w-5 items-center justify-center rounded lg:w-6">
                      <div className="text-secondary-content text-sm font-bold">
                        A
                      </div>
                    </div>
                    <div className="bg-accent flex aspect-square w-5 items-center justify-center rounded lg:w-6">
                      <div className="text-accent-content text-sm font-bold">
                        A
                      </div>
                    </div>
                    <div className="bg-neutral flex aspect-square w-5 items-center justify-center rounded lg:w-6">
                      <div className="text-neutral-content text-sm font-bold">
                        A
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const ContainerList = () => {
  const [settings, setSettings] = useStorage(
    StorageKey.SETTINGS,
    DEFAULT_SETTINGS
  )

  const { containerType } = settings

  return (
    <div className=" flex gap-6">
      <div className="flex flex-col items-center gap-4">
        <input
          type="radio"
          name="container-type"
          className="radio"
          checked={containerType === ContainerType.DEFAULT}
          onChange={() => {
            setSettings({
              ...settings,
              containerType: ContainerType.DEFAULT
            })
          }}
        />
        <Main containerType={ContainerType.DEFAULT} />
      </div>
      <div className="flex flex-col items-center gap-4">
        <input
          type="radio"
          name="container-type"
          className="radio"
          checked={containerType === ContainerType.PHONE}
          onChange={() => {
            setSettings({
              ...settings,
              containerType: ContainerType.PHONE
            })
          }}
        />
        <Main containerType={ContainerType.PHONE} />
      </div>
    </div>
  )
}

const Setting: React.FC = () => {
  return (
    <OtpProvider>
      <div className="flex-1 overflow-auto">
        <div className="collapse bg-base-200 mb-4">
          <input type="radio" name="container" defaultChecked />
          <div className="collapse-title text-xl font-medium">布局模式</div>
          <div className="collapse-content">
            <ContainerList />
          </div>
        </div>
        <div className="collapse bg-base-200 mb-4">
          <input type="radio" name="theme" />
          <div className="collapse-title text-xl font-medium">主题</div>
          <div className="collapse-content">
            <ThemeList />
          </div>
        </div>
      </div>
    </OtpProvider>
  )
}

export default Setting
