"use client"

import { Search, Moon, Sun, Menu, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import React from "react"
import { useSearchUsers } from "@/hooks/use-search-users"
import { useTheme } from "next-themes"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter } from "next/navigation"

export function TopHeader() {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [searchValue, setSearchValue] = React.useState("")
  const [showDropdown, setShowDropdown] = React.useState(false)
  const { results, loading, error, search } = useSearchUsers()

  const handleLogout = async () => {
    await logout()
    router.push("/auth/login")
  }

  // Search when input changes
  React.useEffect(() => {
    if (searchValue.length > 1) {
      search(searchValue)
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }, [searchValue])

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4 flex-1">
          <SidebarTrigger className="lg:hidden">
            <Menu className="w-5 h-5" />
          </SidebarTrigger>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search GistHub"
              className="pl-10 bg-muted/30 border-muted-foreground/20 rounded-full h-10"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onFocus={() => searchValue.length > 1 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />
            {showDropdown && (
              <div className="absolute left-0 right-0 top-12 bg-white dark:bg-[#18181b] shadow-lg rounded-md z-50 max-h-64 overflow-auto border">
                {loading && <div className="p-3 text-sm text-muted-foreground">Searching...</div>}
                {error && <div className="p-3 text-sm text-red-500">{error}</div>}
                {!loading && results.length === 0 && <div className="p-3 text-sm text-muted-foreground">No users found</div>}
                {results.map((user: any) => (
                  <div
                    key={user._id}
                    className="p-3 cursor-pointer flex items-center gap-2 bg-white dark:bg-[#18181b]"
                    style={{ borderRadius: '0.375rem' }}
                    onClick={() => router.push(`/profile/${user.username}`)}
                  >
                    <img src={user.profilePic || "/placeholder-user.jpg"} alt="avatar" className="w-7 h-7 rounded-full" />
                    <span className="font-medium text-black dark:text-white">{user.username}</span>
                    {(user.firstName || user.lastName) && (
                      <span className="text-xs text-black dark:text-gray-300">
                        {user.firstName} {user.lastName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* ...existing code... */}
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="rounded-full"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="w-9 h-9 ring-2 ring-primary/20">
                  <AvatarImage src={user?.profilePic || "/placeholder.svg?height=36&width=36"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {user?.username?.slice(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{user?.username}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
