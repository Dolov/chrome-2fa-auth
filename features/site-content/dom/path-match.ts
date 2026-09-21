/**
 * 用 `*` 占位的 URL 模板提取动态段
 *
 * content script 专用：SiteAdapter 用它从 location.href 判别路由。
 */
export const extractDynamicSegment = (
  url: string,
  template: string | string[]
): string | null => {
  const templates = Array.isArray(template) ? template : [template]

  for (const templateEntry of templates) {
    const templateRegex = templateEntry
      .replace(/\//g, "\\/")
      .replace(/\*/g, "([^/]+)")

    const match = url.match(new RegExp(templateRegex))
    if (match?.[1]) return match[1]
  }

  return null
}
