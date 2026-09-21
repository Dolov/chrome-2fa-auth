/**
 * 二维码 PNG fixture 路径。
 *
 * 黑盒：不 import 项目内任何代码。路径按仓库根解析 —— Playwright 的 cwd 即仓库根
 * （与 `fixtures/extension.ts` 的 `EXT_PATH` 同一约定）。
 *
 * PNG 由 `npx qrcode -w 320 -e M` 生成、`no-qr.png` 由脚本手写纯色 PNG；
 * 三个文件都用 jsQR 直接解码自检过内容。
 */
import { resolve } from "node:path"

const QR_DIR = "e2e/fixtures/qr"

/** 内容 = TEST_OTPAUTH_URL（有效 otpauth URL，含 account） */
export const OTPAUTH_QR_PATH = resolve(QR_DIR, "otpauth-valid.png")

/** 内容 = 普通 https URL：能解码，但不是 otpauth */
export const NOT_OTPAUTH_QR_PATH = resolve(QR_DIR, "not-otpauth.png")

/** 纯色图：不含二维码，解码应返回 null */
export const NO_QR_IMAGE_PATH = resolve(QR_DIR, "no-qr.png")
