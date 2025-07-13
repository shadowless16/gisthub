"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Upload, Loader2 } from "lucide-react"

import { useAuth } from "@/lib/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function SetupProfilePage() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [profileData, setProfileData] = useState({
    profilePicture: "",
    bio: "",
    instagram: "",
    x: "",
    github: "",
    portfolio: "",
    interests: "",
    location: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Validate required fields
    const requiredFields = ["profilePicture", "bio", "instagram", "x", "github", "portfolio", "interests", "location"]
    for (const field of requiredFields) {
      if (!profileData[field as keyof typeof profileData] || (Array.isArray(profileData[field as keyof typeof profileData]) ? (profileData[field as keyof typeof profileData] as any).length === 0 : false)) {
        toast({ title: "Missing field", description: `Please fill in your ${field}.`, variant: "destructive" })
        setIsLoading(false)
        return
      }
    }
    try {
      // Update user profile
      await fetch(`/api/users/${user?._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profilePic: profileData.profilePicture,
          bio: profileData.bio,
          socialLinks: {
            instagram: profileData.instagram,
            x: profileData.x,
            github: profileData.github,
            portfolio: profileData.portfolio,
          },
          interests: profileData.interests.split(",").map(tag => tag.trim()),
          location: profileData.location,
        }),
      })
      await refreshUser()
      toast({ title: "Profile updated!", description: "Your onboarding is complete." })
      router.push("/feed")
    } catch (err) {
      toast({ title: "Failed to update profile", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  // Remove skip option (all fields required)

  return (
    <div className="min-h-screen bg-gradient-to-br from-vivid-teal/10 via-background to-sunset-orange/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>Add a profile picture and bio to help others connect with you</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileData.profilePicture || "/placeholder.svg"} />
                  <AvatarFallback className="text-lg">
                    <Camera className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <Input
                  id="profilePicture"
                  type="file"
                  accept="image/*"
                  className="absolute -bottom-2 -right-2 w-8 h-8 opacity-0 cursor-pointer"
                  style={{ zIndex: 2 }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        setProfileData({ ...profileData, profilePicture: ev.target?.result as string })
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <Label htmlFor="profilePicture" className="absolute -bottom-2 -right-2 w-8 h-8 flex items-center justify-center rounded-full bg-vivid-teal hover:bg-vivid-teal/90 cursor-pointer" style={{ zIndex: 1 }}>
                  <Upload className="w-4 h-4" />
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself, your interests, or what you're studying..."
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                type="text"
                placeholder="Instagram username or link"
                value={profileData.instagram}
                onChange={(e) => setProfileData({ ...profileData, instagram: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="x">X (Twitter)</Label>
              <Input
                id="x"
                type="text"
                placeholder="X username or link"
                value={profileData.x}
                onChange={(e) => setProfileData({ ...profileData, x: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub</Label>
              <Input
                id="github"
                type="text"
                placeholder="GitHub username or link"
                value={profileData.github}
                onChange={(e) => setProfileData({ ...profileData, github: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio</Label>
              <Input
                id="portfolio"
                type="text"
                placeholder="Portfolio link"
                value={profileData.portfolio}
                onChange={(e) => setProfileData({ ...profileData, portfolio: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interests">Interests (comma separated)</Label>
              <Input
                id="interests"
                type="text"
                placeholder="#design, #backend, #cybersecurity"
                value={profileData.interests}
                onChange={(e) => setProfileData({ ...profileData, interests: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location (State or City)</Label>
              <Input
                id="location"
                type="text"
                placeholder="e.g. Lagos, Abuja, Ibadan"
                value={profileData.location}
                onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1 bg-vivid-teal hover:bg-vivid-teal/90" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Complete Setup
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
