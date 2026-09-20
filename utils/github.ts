export const getGitHubUserName = (): string => {
  const selectors = [
    'meta[property="profile:username"]',
    'meta[name="user-login"]'
  ]

  const meta = selectors
    .map((selector) => document.querySelector(selector))
    .find((el): el is HTMLMetaElement => el !== null)

  return meta?.getAttribute("content") || ""
}
