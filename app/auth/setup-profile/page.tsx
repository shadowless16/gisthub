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
    branch: user?.branch || "",
    learningPath: user?.learningPath || "",
    dobMonth: user?.dateOfBirth?.split("-")[0] || "",
    dobDay: user?.dateOfBirth?.split("-")[1] || "",
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
        branch: user.branch || "",
        learningPath: user.learningPath || "",
        dobMonth: user.dateOfBirth?.split("-")[0] || "",
        dobDay: user.dateOfBirth?.split("-")[1] || "",
      });
    }
  }, [user]); // Depend on user object


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

    const requiredFields = ["profilePicture", "bio", "interests", "location", "branch", "learningPath", "dobMonth", "dobDay"];
    for (const field of requiredFields) {
      const value = profileData[field as keyof typeof profileData];
      if (!value || (field === "profilePicture" && typeof value === 'string' && (!value.startsWith("/uploads/") && !value.startsWith("http")))) {
        toast({
          title: "Missing field",
          description: `Please ${field === "profilePicture" ? "upload a profile picture" : `fill in your ${field}`}.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
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

    // Validate dateOfBirth format MM-DD
    const dobMonth = profileData.dobMonth;
    const dobDay = profileData.dobDay;
    const validMonth = /^(0[1-9]|1[0-2])$/.test(dobMonth);
    const validDay = /^(0[1-9]|[12][0-9]|3[01])$/.test(dobDay);
    if (!validMonth || !validDay) {
      toast({
        title: "Invalid Date of Birth",
        description: "Please select a valid month and day.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
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
          branch: profileData.branch,
          learningPath: profileData.learningPath,
          dateOfBirth: `${profileData.dobMonth}-${profileData.dobDay}`,
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
            <div className="space-y-2">
              <Label htmlFor="branch">NIIT Branch</Label>
              <select
                id="branch"
                value={profileData.branch}
                onChange={(e) => setProfileData({ ...profileData, branch: e.target.value })}
                required
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Select Branch</option>
                <option value="Ikeja">Ikeja</option>
                <option value="Surulere">Surulere</option>
                <option value="Ajah">Ajah</option>
                <option value="Abeokuta">Abeokuta</option>
                <option value="Ibadan">Ibadan</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="learningPath">Learning Path</Label>
              <select
                id="learningPath"
                value={profileData.learningPath}
                onChange={(e) => setProfileData({ ...profileData, learningPath: e.target.value })}
                required
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Select Learning Path</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Web Development">Web Development</option>
                <option value="Data Science">Data Science</option>
                <option value="Cloud & DevOps">Cloud & DevOps</option>
                <option value="UI/UX Design">UI/UX Design</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="AI & Machine Learning">AI & Machine Learning</option>
                <option value="Office Productivity (Basic IT)">Office Productivity (Basic IT)</option>
                <option value="Project Management">Project Management</option>
                <option value="Networking & Hardware">Networking & Hardware</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <div className="flex gap-2">
                <select
                  id="dobMonth"
                  value={profileData.dobMonth}
                  onChange={e => setProfileData({ ...profileData, dobMonth: e.target.value })}
                  required
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="">Month</option>
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <select
                  id="dobDay"
                  value={profileData.dobDay}
                  onChange={e => setProfileData({ ...profileData, dobDay: e.target.value })}
                  required
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="">Day</option>
                  {[...Array(31)].map((_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>
                  ))}
                </select>
              </div>
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

