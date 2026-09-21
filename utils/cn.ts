import { clsx, type ClassValue } from "clsx"

/**
 * 统一 className 拼接工具
 *
 * 个人编码规则：`[REACT][TAILWIND]` className 必须用 cn()。
 * 项目实现：clsx 的轻量封装，互斥样式用对象语法：cn("opacity", { "opacity-0": !isLoaded })。
 */
export const cn = (...inputs: ClassValue[]) => clsx(inputs)