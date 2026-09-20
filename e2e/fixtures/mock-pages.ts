/**
 * Mock 第三方页面 HTML
 * 通过 page.route 拦截 URL 返回这些 HTML，避免依赖真实 GitHub / NPM
 */

export const mockGitHubConfirmAccessPage = (username = "testuser") => `
<!doctype html>
<html lang="en">
<head>
  <meta property="profile:username" content="${username}" />
  <title>Confirm Access - GitHub</title>
</head>
<body>
  <h1>Confirm Access</h1>
  <form>
    <label for="app_totp">Authentication code</label>
    <input id="app_totp" name="app_otp" type="text" autocomplete="off" />
  </form>
</body>
</html>
`

export const mockGitHubQrSetupPage = (qrDataUrl: string, username = "testuser") => `
<!doctype html>
<html lang="en">
<head>
  <meta property="profile:username" content="${username}" />
  <title>Two-factor authentication - GitHub</title>
</head>
<body>
  <h1>Set up two-factor authentication</h1>
  <img class="qr-code-img" src="${qrDataUrl}" alt="qr" />
  <input data-target="two-factor-configure-otp-factor.appOtpInput" type="text" />
  <button data-target="two-factor-configure-otp-factor.saveButton" type="button">Save</button>
</body>
</html>
`

export const mockGitHubRecoveryCodesPage = (codes: string[]) => `
<!doctype html>
<html lang="en">
<head>
  <meta property="profile:username" content="testuser" />
  <title>Recovery codes - GitHub</title>
</head>
<body>
  <h1>Your recovery codes</h1>
  <ul class="two-factor-recovery-codes">
    ${codes.map((c) => `<li class="two-factor-recovery-code">${c}</li>`).join("")}
  </ul>
</body>
</html>
`

export const mockNpmLoginOtpPage = (username = "testuser") => `
<!doctype html>
<html lang="en">
<head>
  <title>Log in - NPM</title>
</head>
<body>
  <h1>Two-factor authentication</h1>
  <form>
    <label for="login_otp">Authentication code</label>
    <input id="login_otp" type="text" autocomplete="off" />
  </form>
</body>
</html>
`

export const mockNpmRecoveryCodesPage = (codes: string[]) => `
<!doctype html>
<html lang="en">
<head>
  <title>Recovery codes - NPM</title>
</head>
<body>
  <h1>Recovery codes</h1>
  <div role="button" tabindex="0">
    ${codes.map((c) => `<p>${c}</p>`).join("")}
  </div>
</body>
</html>
`

export const mockNpmSettings2faPage = (qrDataUrl: string) => `
<!doctype html>
<html lang="en">
<head>
  <title>Two-factor authentication - NPM</title>
</head>
<body>
  <h1>Set up two-factor authentication</h1>
  <canvas id="qr-canvas" width="200" height="200"></canvas>
  <input id="enable_otp" type="text" />
  <button type="submit">Enable</button>
</body>
</html>
`

export const mockGenericPageWithQrImg = (qrDataUrl: string) => `
<!doctype html>
<html>
<head><title>Generic</title></head>
<body>
  <h1>QR Code</h1>
  <img src="${qrDataUrl}" alt="qr" />
</body>
</html>
`

export const mockGenericPageWithQrCanvas = (qrDataUrl: string) => `
<!doctype html>
<html>
<head><title>Generic</title></head>
<body>
  <h1>QR Code</h1>
  <canvas id="qr" width="200" height="200"></canvas>
</body>
</html>
`