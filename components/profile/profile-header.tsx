import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useRef } from "react"
import Cropper from "react-easy-crop"
import { Dialog as CropDialog, DialogContent as CropDialogContent } from "@/components/ui/dialog"
import getCroppedImg from "@/lib/utils/crop-image"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/lib/hooks/use-auth"

// Define the props interface for clarity and type safety
interface ProfileHeaderProps {
  user: {
    username: string
    profilePic?: string
    bio?: string
    followers?: string[]
    following?: string[]
  } | null
  postsCount?: number
  onFollowersClick?: () => void
  onFollowingClick?: () => void
}

// This is your functional component
export function ProfileHeader({ user, postsCount, onFollowersClick, onFollowingClick }: ProfileHeaderProps) {
  // All state, ref, and function declarations must be INSIDE this component
  const { user: authUser, refreshUser } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [username, setUsername] = useState(user?.username || "")
  const [bio, setBio] = useState(user?.bio || "")
  const [profilePic, setProfilePic] = useState<string | undefined>(user?.profilePic)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [rawImage, setRawImage] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setRawImage(e.target?.result as string)
        setCropOpen(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const onCropComplete = (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const handleCropSave = async () => {
    if (!rawImage || !croppedAreaPixels) return
    const croppedBlob = await getCroppedImg(rawImage, croppedAreaPixels)
    setProfilePic(URL.createObjectURL(croppedBlob))
    setSelectedFile(new File([croppedBlob], "profile.jpg", { type: croppedBlob.type }))
    setCropOpen(false)
    setRawImage(null)
  }

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authUser?._id) return
    setSaving(true)
    try {
      await apiClient.updateUser(authUser._id, {
        username,
        bio,
        profilePic: selectedFile,
      })
      await refreshUser()
      setEditOpen(false)
    } catch (err) {
      console.error("Profile update error:", err)
    } finally {
      setSaving(false)
    }
  }

  // --- END OF LOGIC, BEGIN RETURN ---
  return (
    <Card className="w-full max-w-full">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full">
          <Avatar className="w-20 h-20 sm:w-24 sm:h-24 relative group flex-shrink-0">
            <AvatarImage src={profilePic || "/placeholder.svg?height=96&width=96"} />
            <AvatarFallback className="text-2xl">{username?.slice(0,2).toUpperCase() || "U"}</AvatarFallback>
            <button
              type="button"
              className="absolute bottom-0 right-0 bg-primary/80 hover:bg-primary text-white rounded-full p-1 shadow group-hover:opacity-100 opacity-80 transition"
              onClick={() => fileInputRef.current?.click()}
              title="Change profile picture"
            >
              <Upload className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {/* Crop Dialog */}
            <CropDialog open={cropOpen} onOpenChange={setCropOpen}>
              <CropDialogContent className="max-w-md">
                {rawImage && (
                  <div className="relative w-full h-64 bg-black">
                    <Cropper
                      image={rawImage}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="secondary" onClick={() => setCropOpen(false)}>Cancel</Button>
                  <Button onClick={handleCropSave}>Save</Button>
                </div>
              </CropDialogContent>
            </CropDialog>
          </Avatar>

          <div className="flex-1 w-full min-w-0 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{username || "Unknown User"}</h1>
                <p className="text-muted-foreground break-all truncate">@{username || "unknown"}</p>
              </div>
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
                    <Edit className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={handleEditProfile}>
                    <div className="flex flex-col items-center space-y-2">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={profilePic || "/placeholder.svg?height=80&width=80"} />
                        <AvatarFallback className="text-xl">{username?.slice(0,2).toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Change Picture</span>
                      </Button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Username</label>
                      <Input value={username} onChange={e => setUsername(e.target.value)} required maxLength={32} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Bio</label>
                      <Textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={160} />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" className="bg-primary text-white" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <p className="text-sm leading-relaxed break-words max-w-full">
              {bio || "No bio yet."}
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <button
                type="button"
                className="focus:outline-none hover:underline"
                onClick={onFollowingClick}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <span className="font-semibold">{user?.following?.length ?? 0}</span>
                <span className="text-muted-foreground ml-1">Following</span>
              </button>
              <button
                type="button"
                className="focus:outline-none hover:underline"
                onClick={onFollowersClick}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <span className="font-semibold">{user?.followers?.length ?? 0}</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </button>
              <div>
                <span className="font-semibold">{postsCount ?? 0}</span>
                <span className="text-muted-foreground ml-1">Posts</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}