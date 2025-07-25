import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/hooks/use-auth"
import { Toaster } from "@/components/ui/toaster"
import { EnforceProfileCompletion } from "@/components/enforce-profile-completion"
import { StoriesProvider } from "@/components/feed/stories-context"
import { ReactQueryProvider } from "@/components/react-query-provider";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NIIT SOCIAL HUB - Techies Social Platform",
  description: "Connect with fellow students, share experiences, and build your community",
    generator: 'Ak David'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        {/* <link rel="manifest" href="/favicon/site.webmanifest" /> */}
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <StoriesProvider>
            <AuthProvider>
              <EnforceProfileCompletion />
              <EnforceProfileCompletion />
              <ReactQueryProvider>
                {children}
                <Toaster />
              </ReactQueryProvider>
            </AuthProvider>
          </StoriesProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
