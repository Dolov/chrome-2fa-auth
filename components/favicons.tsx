import { cn } from "~/utils/cn"
import React from "react"

import { useStorage } from "~/features/ui-state/use-storage"

import {
  DeviconAzure,
  DeviconCloudflare,
  DeviconDigitalocean,
  DeviconGooglecloud,
  DeviconLinkedin,
  DeviconNpm,
  LogosAws,
  LogosBitbucket,
  LogosDockerIcon,
  LogosFacebook,
  LogosGitlab,
  LogosRedditIcon,
  LogosTwitter,
  MdiGithub,
  SkillIconsDiscord,
  SkillIconsGmailLight,
  SkillIconsInstagram,
  VscodeIconsFileTypeOutlook
} from "~/components/ui/icon"
import { DEFAULT_SETTINGS } from "~/utils/constants"
import { StorageKey } from "~/utils/types"

const minimalIconMap: Record<
  string,
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  github: MdiGithub,
  npm: DeviconNpm,
  gitlab: LogosGitlab,
  bitbucket: LogosBitbucket,
  docker: LogosDockerIcon,
  aws: LogosAws,
  googlecloud: DeviconGooglecloud,
  azure: DeviconAzure,
  cloudflare: DeviconCloudflare,
  digitalocean: DeviconDigitalocean,
  twitter: LogosTwitter,
  facebook: LogosFacebook,
  instagram: SkillIconsInstagram,
  linkedin: DeviconLinkedin,
  discord: SkillIconsDiscord,
  reddit: LogosRedditIcon,
  gmail: SkillIconsGmailLight,
  outlook: VscodeIconsFileTypeOutlook
}

/**
 * elegant 模式的装饰性大图标。
 *
 * 取代原来的两张位图贴纸（github.png 3840×2160 / cloudflare.png 1256×632，
 * 共 505 KB，占扩展下载体积 37%），改用 icon.tsx 里已有的品牌 SVG。
 * 尺寸取 72px 是为了对齐旧图的垂直占用：旧图 w-[120px] × 16:9 ≈ 67.5px 高。
 */
const elegantIconMap: Record<
  string,
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  github: MdiGithub,
  cloudflare: DeviconCloudflare
}

const Favicon = ({
  issuer,
  className
}: {
  issuer: string
  className?: string
}) => {
  const [settings] = useStorage(StorageKey.SETTINGS, DEFAULT_SETTINGS)
  const minimal = settings?.faviconType === "minimal"
  const vendor = issuer.toLowerCase()
  const Icon = minimalIconMap[vendor]

  // 未知 issuer 降级：不渲染图标（避免 React #130: element type undefined）
  if (!Icon) return null

  if (minimal) {
    return <Icon className={cn("text-xl", className)} />
  }

  const ElegantIcon = elegantIconMap[vendor]
  if (ElegantIcon) {
    return (
      <ElegantIcon
        className={cn("w-[72px] h-[72px] absolute right-0 -top-4", className)}
      />
    )
  }

  return <Icon className={cn("text-2xl", className)} />
}

export const FaviconMinimal = ({
  issuer,
  className
}: {
  issuer: string
  className?: string
}) => {
  const vendor = issuer.toLowerCase()
  const Icon = minimalIconMap[vendor]

  if (Icon) {
    return <Icon className={cn("text-xl", className)} />
  }

  return issuer
}

export default Favicon
