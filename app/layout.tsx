import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "RollerDeck - Map Your Network",
  description:
    "A digital network management app that reimagines how people connect and collaborate.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "RollerDeck" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0d0d0d",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="touch-pan-y">
      <body className={`${inter.variable} font-sans antialiased min-h-[100dvh] overscroll-none`}>
        {children}
      </body>
    </html>
  )
}
