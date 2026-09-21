import { cn } from "~/utils/cn"
import React from "react"

import cloudflare from "~/assets/cloudflare.png"
import github from "~/assets/github.png"

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
import { Issuers, StorageKey } from "~/utils/types"

export const minimalIconMap: Record<
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

export const elegantImageMap: Record<string, string> = {
  github,
  cloudflare
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
  const img = elegantImageMap[vendor]
  if (img) {
    return (
      <img
        src={img}
        className={cn("w-[120px] absolute right-0 -top-4", className)}
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
