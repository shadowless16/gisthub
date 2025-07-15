"use client"

import React, { useState, useEffect } from "react"
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

  // Initialize profileData with user's existing data if available
  const [profileData, setProfileData] = useState({
    profilePicture: user?.profilePic || "", // Pre-populate if user.profilePic exists
    bio: user?.bio || "",
    instagram: user?.socialLinks?.instagram || "",
    x: user?.socialLinks?.x || "",
    github: user?.socialLinks?.github || "",
    portfolio: user?.socialLinks?.portfolio || "",
    interests: user?.interests?.join(", ") || "", // Join array back to string for input
    location: user?.location || "",
  })
  const [isLoading, setIsLoading] = useState(false) // State for loading

  // Populate profileData when user data loads or changes
  useEffect(() => {
    if (user) {
      setProfileData({
        profilePicture: user.profilePic || "",
        bio: user.bio || "",
        instagram: user.socialLinks?.instagram || "",
        x: user.socialLinks?.x || "",
        github: user.socialLinks?.github || "",
        portfolio: user.socialLinks?.portfolio || "",
        interests: user.interests?.join(", ") || "",
        location: user.location || "",
      });
    }
  }, [user]); // Depend on user object


  // Upload profile picture to backend and set URL
  // This function now correctly accesses `setIsLoading` and `setProfileData`
  const handleProfilePictureUpload = async (file: File) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("profileImage", file) // 'profileImage' matches the backend's expected key

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData, // FormData automatically sets 'Content-Type: multipart/form-data'
      })

      if (!res.ok) {
        // Attempt to parse error message from backend
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to upload image.");
      }

      const data = await res.json();
      if (data?.imageUrl) {
        setProfileData((prevData) => ({ ...prevData, profilePicture: data.imageUrl }));
        toast({ title: "Profile picture uploaded!", description: "Image uploaded successfully." });
      } else {
        throw new Error("No image URL returned from server.");
      }
    } catch (err) {
      toast({
        title: "Image upload failed",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const requiredFields = ["profilePicture", "bio", "interests", "location"]
    for (const field of requiredFields) {
      const value = profileData[field as keyof typeof profileData];

      // Check if value is falsy (empty string)
      // For profilePicture, also check if it's a valid looking URL (starts with /uploads/ or http)
      if (!value || (field === "profilePicture" && typeof value === 'string' && (!value.startsWith("/uploads/") && !value.startsWith("http")))) {
        toast({
          title: "Missing field",
          description: `Please ${field === "profilePicture" ? "upload a profile picture" : `fill in your ${field}`}.`, // Improved message
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Special check for interests if it's supposed to be an array
      if (field === "interests" && typeof value === 'string') {
        const trimmedInterests = value.split(",").map(tag => tag.trim()).filter(Boolean);
        if (trimmedInterests.length === 0) {
          toast({
            title: "Missing field",
            description: "Please enter at least one interest.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }
    }

    try {
      // Prepare interests array
      const interestsArray = profileData.interests
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)

      // Prepare social links object, ensuring empty strings are not sent as fields
      const socialLinks = {
        ...(profileData.instagram && { instagram: profileData.instagram }),
        ...(profileData.x && { x: profileData.x }),
        ...(profileData.github && { github: profileData.github }),
        ...(profileData.portfolio && { portfolio: profileData.portfolio }),
      }

      await fetch(`/api/users/${user?._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profilePic: profileData.profilePicture, // This will now be the URL
          bio: profileData.bio,
          socialLinks: socialLinks,
          interests: interestsArray,
          location: profileData.location,
        }),
      })

      await refreshUser()
      toast({ title: "Profile updated!", description: "Your onboarding is complete." })
      router.push("/feed")
    } catch (err) {
      console.error("Profile update failed:", err)
      toast({
        title: "Failed to update profile",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-vivid-teal/10 via-background to-sunset-orange/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Add a profile picture and bio to help others connect with you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileData.profilePicture || "/placeholder.svg"} alt="Profile Picture" />
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
                      // Call the new upload handler directly
                      handleProfilePictureUpload(file)
                    }
                  }}
                />
                <Label
                  htmlFor="profilePicture"
                  className="absolute -bottom-2 -right-2 w-8 h-8 flex items-center justify-center rounded-full bg-vivid-teal hover:bg-vivid-teal/90 cursor-pointer"
                  style={{ zIndex: 1 }}
                >
                  <Upload className="w-4 h-4 text-white" />
                </Label>
              </div>
            </div>

            {/* ... rest of your form fields ... */}
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
              <Label htmlFor="instagram">Instagram (optional)</Label>
              <Input
                id="instagram"
                type="text"
                placeholder="Instagram username or link"
                value={profileData.instagram}
                onChange={(e) => setProfileData({ ...profileData, instagram: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="x">X (Twitter, optional)</Label>
              <Input
                id="x"
                type="text"
                placeholder="X username or link"
                value={profileData.x}
                onChange={(e) => setProfileData({ ...profileData, x: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub (optional)</Label>
              <Input
                id="github"
                type="text"
                placeholder="GitHub username or link"
                value={profileData.github}
                onChange={(e) => setProfileData({ ...profileData, github: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio (optional)</Label>
              <Input
                id="portfolio"
                type="text"
                placeholder="Portfolio link"
                value={profileData.portfolio}
                onChange={(e) => setProfileData({ ...profileData, portfolio: e.target.value })}
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