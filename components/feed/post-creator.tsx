"use client"

import type React from "react"

import { useState } from "react"
import Cropper from "react-easy-crop"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { ImageIcon, Video, ToggleLeft, ToggleRight, Smile, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/lib/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

interface PostCreatorProps {
  onPostCreated?: () => void
}

export function PostCreator({ onPostCreated }: PostCreatorProps) {
  const [postContent, setPostContent] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [cropAspect, setCropAspect] = useState(16/9)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  const { user } = useAuth()
  const { toast } = useToast()

  // Check if it's Sunday for anonymous posting
  const isSunday = new Date().getDay() === 0

  const handlePost = async () => {
    if (!postContent.trim()) return;
    setIsLoading(true);
    try {
      await apiClient.createPost({
        content: postContent.trim(),
        imageFile: selectedImageFile || undefined,
        isAnonymous: isSunday ? isAnonymous : false,
      });
      toast({
        title: "Post created!",
        description: "Your post has been shared successfully.",
      });
      setPostContent("");
      setIsAnonymous(false);
      setSelectedImage(null);
      setSelectedImageFile(null);
      setIsDialogOpen(false);
      onPostCreated?.();
    } catch (error) {
      toast({
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }  

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  }  

  const onCropComplete = (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (!selectedImage || !croppedAreaPixels) return;
    // Convert cropped area to blob
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
    const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels);
    setSelectedImageFile(new File([croppedBlob], "post-image.jpg", { type: croppedBlob.type }));
    setCropOpen(false);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedVideo(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEmojiClick = () => {
    toast({
      title: "Emoji picker coming soon!",
      description: "We're working on adding emoji support.",
    })
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12 ring-2 ring-primary/10">
              <AvatarImage src={user?.profilePic || "/placeholder.svg?height=48&width=48"} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {user?.username?.slice(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex-1 text-left px-6 py-4 bg-muted/50 rounded-full text-muted-foreground hover:bg-muted/70 transition-colors border border-muted-foreground/10">
                  {"What's happening on campus?"}
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Create a Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-12 h-12 ring-2 ring-primary/10">
                      <AvatarImage src={user?.profilePic || "/placeholder.svg?height=48&width=48"} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user?.username?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        placeholder="What's happening on campus?"
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        className="min-h-[120px] border-none resize-none focus-visible:ring-0 p-0 text-base"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {selectedImage && (
                    <div className="relative">
                      <img
                        src={selectedImage || "/placeholder.svg"}
                        alt="Selected"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setSelectedImage(null); setSelectedImageFile(null); }}
                        className="absolute top-2 right-2"
                        disabled={isLoading}
                      >
                        Remove
                      </Button>
                    </div>
                  )}

                  {/* Cropping Modal */}
                  {cropOpen && selectedImage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
                      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Crop Image</h3>
                          <Button variant="ghost" size="icon" onClick={() => setCropOpen(false)}>
                            X
                          </Button>
                        </div>
                        <div className="flex gap-2 px-4 py-2 border-b">
                          <span className="text-xs font-medium">Aspect Ratio:</span>
                          <Button size="sm" variant={cropAspect === 1 ? "default" : "secondary"} onClick={() => setCropAspect(1)}>1:1</Button>
                          <Button size="sm" variant={cropAspect === 4/5 ? "default" : "secondary"} onClick={() => setCropAspect(4/5)}>4:5</Button>
                          <Button size="sm" variant={cropAspect === 16/9 ? "default" : "secondary"} onClick={() => setCropAspect(16/9)}>16:9</Button>
                        </div>
                        <div className="relative w-full h-80 bg-black">
                          <Cropper
                            image={selectedImage}
                            crop={crop}
                            zoom={zoom}
                            aspect={cropAspect}
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

                  {isSunday && (
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                      <div>
                        <span className="text-sm font-medium">Post Anonymously</span>
                        <p className="text-xs text-muted-foreground">Available on Sundays only</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAnonymous(!isAnonymous)}
                        className="p-0 h-auto"
                        disabled={isLoading}
                      >
                        {isAnonymous ? (
                          <ToggleRight className="w-8 h-8 text-primary" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:bg-primary/10"
                        disabled={isLoading}
                      >
                        <label htmlFor="image-upload" className="flex items-center cursor-pointer">
                          <ImageIcon className="w-5 h-5" />
                        </label>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isLoading}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:bg-primary/10"
                        disabled={isLoading}
                      >
                        <label htmlFor="video-upload" className="flex items-center cursor-pointer">
                          <Video className="w-5 h-5" />
                        </label>
                        <input
                          id="video-upload"
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                          disabled={isLoading}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:bg-primary/10"
                        disabled={isLoading}
                        onClick={handleEmojiClick}
                      >
                        <Smile className="w-5 h-5" />
                      </Button>
                    </div>
                    <Button
                      onClick={handlePost}
                      disabled={!postContent.trim() || isLoading}
                      className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 font-medium"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        "Post"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
