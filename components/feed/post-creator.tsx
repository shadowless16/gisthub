// components/feed/post-creator.tsx
"use client"

import type React from "react"
import type { User } from "@/types/user"

import { useState, useCallback, useRef, useEffect } from "react" // Import useCallback, useRef, useEffect
import Cropper from "react-easy-crop"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { ImageIcon, Video, ToggleLeft, ToggleRight, Smile, Loader2, Trash2 } from "lucide-react" // Added Trash2
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/lib/hooks/use-auth"
import { apiClient } from "@/lib/api-client" // Ensure this is correctly imported
import { useToast } from "@/hooks/use-toast"
import Picker from '@emoji-mart/react' // Import emoji picker
import data from '@emoji-mart/data' // Emoji data

// Interface for UserSearchResult - this is what your API should return
interface UserSearchResult {
  _id: string;
  username: string;
  profilePic?: string;
}

// Helper function to create image from URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on canvas
    image.src = url;
  });

// Helper function to get cropped image
async function getCroppedImg(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}


// Custom hook for managing mention functionality (copied from previous response)
const useMentions = (textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const { toast } = useToast();
  const suggestionListRef = useRef<HTMLDivElement>(null); // Ref for the suggestion list

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const response = await apiClient.getUsersBySearch(query) as { results: UserSearchResult[] };
      setSuggestions(response.results);
      setShowSuggestions(response.results.length > 0);
      setSelectedIndex(0);
    } catch (error) {
      toast({
        title: "Error fetching users",
        description: error instanceof Error ? error.message : "Failed to fetch user suggestions.",
        variant: "destructive",
      });
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [toast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value, selectionStart } = e.target;
    let newSearchTerm: string | null = null;
    let newMentionStartIndex = -1;

    const textBeforeCursor = value.substring(0, selectionStart);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const potentialMention = textBeforeCursor.substring(lastAtIndex + 1);
      const usernameMatch = potentialMention.match(/^([a-zA-Z0-9_]*)$/);

      if (usernameMatch && usernameMatch[1] !== undefined) {
        newSearchTerm = usernameMatch[1];
        newMentionStartIndex = lastAtIndex;
      }
    }

    setSearchTerm(newSearchTerm);
    setMentionStartIndex(newMentionStartIndex);

    if (newSearchTerm) {
      fetchSuggestions(newSearchTerm);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [fetchSuggestions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
      if (suggestionListRef.current) {
        const item = suggestionListRef.current.children[selectedIndex];
        item?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      if (suggestionListRef.current) {
        const item = suggestionListRef.current.children[selectedIndex];
        item?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestions.length > 0) {
        e.preventDefault();
        const selectedUsername = suggestions[selectedIndex].username;
        const textarea = textareaRef.current;
        if (textarea && searchTerm !== null && mentionStartIndex !== -1) {
          const start = textarea.value.substring(0, mentionStartIndex);
          const afterMention = textarea.value.substring(mentionStartIndex + 1 + searchTerm.length);
          const newValue = `${start}@${selectedUsername} ${afterMention}`;
          textarea.value = newValue;
          textarea.setSelectionRange(start.length + 1 + selectedUsername.length + 1, start.length + 1 + selectedUsername.length + 1);
          // Update React state if a setter is provided (for controlled Textarea)
          if (typeof (window as any).setPostContent === 'function') {
            (window as any).setPostContent(newValue);
          }
          const event = new Event('input', { bubbles: true });
          textarea.dispatchEvent(event);
        }
        setShowSuggestions(false);
        setSearchTerm(null);
        setSuggestions([]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSearchTerm(null);
      setSuggestions([]);
    }
  }, [showSuggestions, suggestions, selectedIndex, searchTerm, mentionStartIndex, textareaRef]);

  const handleSelectSuggestion = useCallback((username: string) => {
    const textarea = textareaRef.current;
    if (textarea && searchTerm !== null && mentionStartIndex !== -1) {
      const start = textarea.value.substring(0, mentionStartIndex);
      const afterMention = textarea.value.substring(mentionStartIndex + 1 + searchTerm.length);
      const newValue = `${start}@${username} ${afterMention}`;
      textarea.value = newValue;
      textarea.setSelectionRange(start.length + 1 + username.length + 1, start.length + 1 + username.length + 1);
      // Update React state if a setter is provided (for controlled Textarea)
      if (typeof (window as any).setPostContent === 'function') {
        (window as any).setPostContent(newValue);
      }
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
    setShowSuggestions(false);
    setSearchTerm(null);
    setSuggestions([]);
  }, [searchTerm, mentionStartIndex, textareaRef]);

  // Add this alias to avoid the "Cannot find name" error
  const setMentionSuggestionsVisibility = setShowSuggestions;

  return {
    searchTerm,
    suggestions,
    showSuggestions,
    selectedIndex,
    handleInputChange,
    handleKeyDown,
    handleSelectSuggestion,
    setShowSuggestions: setMentionSuggestionsVisibility, // Changed name to avoid conflict
    suggestionListRef
  };
};


export interface PostCreatorProps {
  onSubmit: (content: string, imageFile?: File, taggedUserIds?: string[]) => Promise<void>;
}

export function PostCreator({ onSubmit }: PostCreatorProps) {
  const [postContent, setPostContent] = useState("");
  // Expose setPostContent globally for mention hook to update state (only in browser)
  if (typeof window !== "undefined") {
    (window as any).setPostContent = setPostContent;
  }
  // Removed tagQuery, taggedUsers, and search related states as they are replaced by useMentions
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [cropAspect, setCropAspect] = useState(16 / 9);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State for emoji picker

  const { user } = useAuth();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for the main post textarea

  // Integrate useMentions hook
  const {
    searchTerm, // Not directly used in JSX, but useful for debugging
    suggestions,
    showSuggestions,
    selectedIndex,
    handleInputChange: handleMentionsInputChange, // Renamed to avoid conflict
    handleKeyDown: handleMentionsKeyDown, // Renamed to avoid conflict
    handleSelectSuggestion,
    setShowSuggestions: setMentionSuggestionsVisibility,
    suggestionListRef
  } = useMentions(textareaRef);


  // Check if it's Sunday for anonymous posting
  const isSunday = new Date().getDay() === 0;

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setCropOpen(true); // Open crop dialog after image is loaded
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, just set the selected video URL for preview if you have one.
      // Actual video upload logic will depend on your backend/storage solution.
      setSelectedVideo(URL.createObjectURL(file));
      // You might also want to set a File object for actual upload later
      // setSelectedVideoFile(file);
    }
  };

  // Callback for when cropping is complete
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Save cropped image
  const handleCropSave = useCallback(async () => {
    if (selectedImage && croppedAreaPixels) {
      try {
        const croppedImageBlob = await getCroppedImg(selectedImage, croppedAreaPixels);
        if (croppedImageBlob) {
          const croppedFile = new File([croppedImageBlob], "cropped_image.jpeg", { type: "image/jpeg" });
          setSelectedImageFile(croppedFile);
          setSelectedImage(URL.createObjectURL(croppedImageBlob)); // Update preview with cropped image
          setCropOpen(false); // Close crop dialog
        }
      } catch (e) {
        console.error("Error cropping image:", e);
        toast({
          title: "Image Cropping Failed",
          description: "Could not crop the image. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [selectedImage, croppedAreaPixels, toast]);

  // Combined content change handler for textarea and mentions
  const handlePostContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPostContent(e.target.value);
    handleMentionsInputChange(e); // Pass the event to the mentions hook
  };

  // Extract tagged usernames from content
  const extractTaggedUsernames = (text: string): string[] => {
    // Regex to find @usernames. It ensures the username part is at least 2 characters long
    // and consists of alphanumeric characters and underscores.
    const mentionRegex = /@([a-zA-Z0-9_]{2,})\b/g; // \b ensures whole word match
    const matches = text.match(mentionRegex);
    if (!matches) return [];
    // Extract unique usernames without the '@' symbol
    return [...new Set(matches.map(match => match.substring(1)))];
  };

  const handlePost = async () => {
    if (!postContent.trim() && !selectedImageFile && !selectedVideo) {
      toast({
        title: "Content missing",
        description: "Please write something or attach an image/video to your post.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    let taggedUserIds: string[] = [];
    const usernamesToLookup = extractTaggedUsernames(postContent);

    if (usernamesToLookup.length > 0) {
      try {
        const response = await apiClient.getUsersByUsernames(usernamesToLookup) as { results: UserSearchResult[] };
        const resolvedUserIds = response.results
          .filter((u: UserSearchResult) => usernamesToLookup.includes(u.username))
          .map((u: UserSearchResult) => u._id);
        taggedUserIds = resolvedUserIds;
      } catch (error) {
        console.error("Error looking up tagged users:", error);
        toast({
          title: "Mention resolution failed",
          description: "Some mentioned users could not be found.",
          variant: "destructive",
        });
      }
    }

    try {
      await apiClient.createPost({
        content: postContent.trim(),
        imageFile: selectedImageFile === null ? undefined : selectedImageFile, // Fixed: Explicitly convert null to undefined
        // videoFile: selectedVideo ? new File([], "video.mp4") : undefined, // Remove or implement if video upload is supported
        isAnonymous: isSunday ? isAnonymous : false,
        taggedUserIds: taggedUserIds.length > 0 ? taggedUserIds : undefined,
      } as any); // Type assertion as 'any' might be needed depending on apiClient types
      toast({
        title: "Post created!",
        description: "Your post has been shared successfully.",
      });
      setPostContent("");
      setIsAnonymous(false);
      setSelectedImage(null);
      setSelectedImageFile(null);
      setSelectedVideo(null); // Clear selected video
      // Removed tag-related state resets as they are now handled by content reset
      setIsDialogOpen(false);
      setShowEmojiPicker(false); // Close emoji picker
      setMentionSuggestionsVisibility(false); // Close mention suggestions
      onSubmit(postContent.trim(), selectedImageFile || undefined, taggedUserIds); // Pass undefined if selectedImageFile is null
    } catch (error) {
      toast({
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Close suggestions if clicking outside the textarea/suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node) &&
        suggestionListRef.current &&
        !suggestionListRef.current.contains(event.target as Node)
      ) {
        setMentionSuggestionsVisibility(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setMentionSuggestionsVisibility, textareaRef, suggestionListRef]);


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
                    <div className="flex-1 min-w-0 relative"> {/* Added relative positioning */}
                      <Textarea
                        ref={textareaRef}
                        placeholder="What's happening on campus?"
                        value={postContent}
                        onChange={handlePostContentChange} // Use combined handler
                        onKeyDown={handleMentionsKeyDown} // Use mentions keydown handler
                        className="min-h-[120px] border-none resize-none focus-visible:ring-0 p-0 text-base"
                        disabled={isLoading}
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <div
                          ref={suggestionListRef}
                          className="absolute z-50 bg-popover border rounded-md shadow-lg py-1 w-full max-h-48 overflow-y-auto mt-1"
                          // Position it right below the textarea
                          style={{
                            top: textareaRef.current ? `${textareaRef.current.offsetHeight + textareaRef.current.offsetTop + 5}px` : 'auto',
                            left: textareaRef.current ? `${textareaRef.current.offsetLeft}px` : 'auto',
                            width: textareaRef.current ? `${textareaRef.current.offsetWidth}px` : 'auto',
                          }}
                        >
                          {suggestions.map((user, index) => (
                            <div
                              key={user._id}
                              className={`flex items-center space-x-2 p-2 cursor-pointer hover:bg-accent ${
                                index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
                              }`}
                              onClick={() => handleSelectSuggestion(user.username)}
                            >
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={user.profilePic || "/placeholder.svg"} />
                                <AvatarFallback className="text-xs">{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span>@{user.username}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {(selectedImage || selectedVideo) && (
                    <div className="relative ml-14 mt-4"> {/* Adjusted margin to align with avatar */}
                      {selectedImage && (
                        <img
                          src={selectedImage}
                          alt="Selected"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      )}
                      {selectedVideo && (
                        <video
                          src={selectedVideo}
                          controls
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setSelectedImage(null); setSelectedImageFile(null); setSelectedVideo(null); }}
                        className="absolute top-2 right-2 rounded-full h-8 w-8 p-0" // Adjusted size
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4" /> {/* Use Trash2 icon */}
                      </Button>
                    </div>
                  )}

                  {/* Cropping Modal - remains unchanged, just its trigger flow changes */}
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
                          <Button size="sm" variant={cropAspect === 4 / 5 ? "default" : "secondary"} onClick={() => setCropAspect(4 / 5)}>4:5</Button>
                          <Button size="sm" variant={cropAspect === 16 / 9 ? "default" : "secondary"} onClick={() => setCropAspect(16 / 9)}>16:9</Button>
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

                  {/* Removed Tagging UI */}
                  {/* <div className="flex gap-2 flex-wrap mb-2">
                    {taggedUsers.map(u => (
                      <span key={u._id} className="bg-muted px-2 py-1 rounded flex items-center gap-1">
                        @{u.username}
                        <button type="button" onClick={() => handleRemoveTag(u._id)} className="ml-1 text-xs">×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagQuery}
                    onChange={handleTagSearch}
                    placeholder="Tag users..."
                    className="mb-2 px-2 py-1 border rounded w-full"
                  />
                  {tagQuery.length > 1 && (
                    <div className="bg-white border rounded shadow p-2 mb-2">
                      {searchLoading ? (
                        <span>Searching...</span>
                      ) : (
                        searchResults
                          .filter((u: User) => !taggedUsers.some(tu => tu._id === u._id))
                          .map((u: User) => (
                            <div key={u._id} className="cursor-pointer hover:bg-muted px-2 py-1" onClick={() => handleAddTag(u)}>
                              @{u.username}
                            </div>
                          ))
                      )}
                    </div>
                  )} */}

                  <div className="flex items-center justify-between pt-4 border-t relative"> {/* Added relative for emoji picker */}
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
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)} // Toggle emoji picker
                      >
                        <Smile className="w-5 h-5" />
                      </Button>
                      {showEmojiPicker && (
                        <div className="absolute z-50 bottom-12 left-0"> {/* Positioned relative to the parent div */}
                          <Picker
                            data={data}
                            onEmojiSelect={(e: any) => {
                              setPostContent(prev => prev + (e.native || e.shortcodes || ""));
                              setShowEmojiPicker(false); // Close after selecting emoji
                            }}
                            theme="auto"
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handlePost}
                      disabled={(!postContent.trim() && !selectedImageFile && !selectedVideo) || isLoading}
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
  );
}