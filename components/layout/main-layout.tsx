"use client"

import type React from "react"

import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { TopHeader } from "@/components/layout/top-header"
import { SuggestedAccounts } from "@/components/layout/suggested-accounts"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader />
          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>
            </main>
            <aside className="hidden xl:block w-80 border-l bg-card/50 overflow-auto">
              <div className="sticky top-0 p-6">
                <SuggestedAccounts />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
