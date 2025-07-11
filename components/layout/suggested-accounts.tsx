"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/lib/hooks/use-auth.tsx"
import { useToast } from "@/hooks/use-toast"

interface SuggestedUser {
  _id: string
  username: string
  email: string
  profilePic?: string
  bio?: string
  followers: string[]
  following: string[]
  isFollowing?: boolean
}

export function SuggestedAccounts() {
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({})

  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      setLoading(true)
      try {
        const response = await apiClient.getSuggestedUsers()
        if (Array.isArray(response)) {
          setSuggestedUsers(response)
        } else if (response && Array.isArray(response.users)) {
          setSuggestedUsers(response.users)
        } else {
          setSuggestedUsers([])
        }
      } catch (err) {
        setSuggestedUsers([])
      } finally {
        setLoading(false)
      }
    }
    fetchSuggestedUsers()
  }, [])

  const handleFollow = async (targetUserId: string) => {
    if (!user) return

    setFollowingStates((prev) => ({ ...prev, [targetUserId]: true }))

    try {
      const response = await apiClient.followUser(targetUserId)

      // Update the user's following status
      setSuggestedUsers((prev) =>
        prev.map((suggestedUser) =>
          suggestedUser._id === targetUserId ? { ...suggestedUser, isFollowing: response.isFollowing } : suggestedUser,
        ),
      )

      toast({
        title: response.isFollowing ? "Followed!" : "Unfollowed!",
        description: response.message,
      })
    } catch (error) {
      toast({
        title: "Failed to follow user",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setFollowingStates((prev) => ({ ...prev, [targetUserId]: false }))
    }
  }

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm w-full max-w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Suggested Accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestedUsers.map((suggestedUser) => (
          <div
            key={suggestedUser._id}
            className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 group w-full"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0 w-full">
              <Avatar className="w-10 h-10 sm:w-11 sm:h-11 ring-2 ring-primary/10 flex-shrink-0">
                <AvatarImage src={suggestedUser.profilePic || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {suggestedUser.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">{suggestedUser.username}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">@{suggestedUser.username}</p>
                <p className="text-xs text-muted-foreground">{suggestedUser.followers.length} followers</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleFollow(suggestedUser._id)}
              disabled={followingStates[suggestedUser._id]}
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-4 py-1 text-xs font-medium shrink-0 w-full xs:w-auto"
            >
              {followingStates[suggestedUser._id] ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : suggestedUser.isFollowing ? (
                "Following"
              ) : (
                "Follow"
              )}
            </Button>
          </div>
        ))}
        <Button variant="ghost" className="w-full text-primary hover:text-primary/80 text-sm">
          See more suggestions
        </Button>
      </CardContent>
    </Card>
  )
}
