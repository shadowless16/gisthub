"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Upload } from "lucide-react"

export default function SetupProfilePage() {
  const [profileData, setProfileData] = useState({
    profilePicture: "",
    bio: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle profile setup logic here
    console.log("Profile setup:", profileData)
    // Redirect to home feed after setup
    window.location.href = "/feed"
  }

  const handleSkip = () => {
    window.location.href = "/feed"
  }

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
                <Button
                  type="button"
                  size="sm"
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-vivid-teal hover:bg-vivid-teal/90"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
              <Label htmlFor="profilePicture" className="text-sm text-muted-foreground cursor-pointer">
                Click to upload profile picture
              </Label>
              <Input
                id="profilePicture"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (e) => {
                      setProfileData({ ...profileData, profilePicture: e.target?.result as string })
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself, your interests, or what you're studying..."
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={handleSkip}>
                Skip for now
              </Button>
              <Button type="submit" className="flex-1 bg-vivid-teal hover:bg-vivid-teal/90">
                Complete Setup
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
