import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "智能题库系统",
  description: "基于 AI 的智能题库应用",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
