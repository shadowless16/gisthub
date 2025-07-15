"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Upload, Loader2 } from "lucide-react"
import Cropper from "react-easy-crop"

import { useAuth } from "@/lib/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"

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
  const [cropOpen, setCropOpen] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

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
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileData((prev) => ({ ...prev, profilePicture: e.target?.result as string }));
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (!profileData.profilePicture || !croppedAreaPixels) return;
    const createImage = (url: string) => new Promise<HTMLImageElement>((resolve) => {
      const img = new window.Image();
      img.src = url;
      img.onload = () => resolve(img);
    });
    const getCroppedImg = async (imageSrc: string, crop: any) => {
      const image = await createImage(imageSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = crop.width;
      canvas.height = crop.height;
      ctx?.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );
      return new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg');
      });
    };
    const croppedBlob = await getCroppedImg(profileData.profilePicture, croppedAreaPixels);
    const croppedFile = new File([croppedBlob], "profile-pic.jpg", { type: croppedBlob.type });
    setCropOpen(false);
    setIsLoading(true);
    try {
      const result = await apiClient.uploadImage(croppedFile);
      if (result?.url) {
        setProfileData((prevData) => ({ ...prevData, profilePicture: result.url }));
        toast({ title: "Profile picture uploaded!", description: "Image uploaded successfully." });
      } else {
        throw new Error("No image URL returned from Cloudinary.");
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
  };

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

                {/* Cropping Modal for Profile Picture */}
                {cropOpen && profileData.profilePicture && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                      <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Crop Profile Picture</h3>
                        <Button variant="ghost" size="icon" onClick={() => setCropOpen(false)}>
                          X
                        </Button>
                      </div>
                      <div className="relative w-full h-80 bg-black">
                        <Cropper
                          image={profileData.profilePicture}
                          crop={crop}
                          zoom={zoom}
                          aspect={1}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={onCropComplete}
                        />
                      </div>
                      <div className="flex justify-end gap-2 p-4 border-t">
                        <Button variant="secondary" onClick={() => setCropOpen(false)}>Cancel</Button>
                        <Button onClick={handleCropSave} className="bg-primary text-white">Save Crop</Button>
                      </div>
                    </div>
                  </div>
                )}
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