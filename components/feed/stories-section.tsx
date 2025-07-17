import { useEffect, useState, useRef } from "react";
import { useStories } from "./stories-context";
import { StoryViewerModal } from "./story-viewer-modal"; // Assuming this path is correct relative to stories-section.tsx
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Camera,
  X,
  Image as ImageIcon,
  Type,
  Palette,
  StopCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Import the shared Story interface from the central types file
import { Story } from "@/types/story"; // Adjust path if needed

// Remove interface GetStoriesResponse if it's not explicitly needed elsewhere
// The type for the response is already handled in stories-context.tsx

export function StoriesSection() {
  const { user } = useAuth();
  const { stories, loading, error, refreshStories } = useStories();

  // State declarations
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [storyType, setStoryType] = useState<"camera" | "text" | "image">(
    "camera"
  );
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [backgroundColor, setBackground] = useState(
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  );
  const [caption, setCaption] = useState("");
  const [storyText, setStoryText] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gradientBackgrounds = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #91a7ff 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  ];

  useEffect(() => {
    if (viewerOpen || createModalOpen) {
      document.body.style.pointerEvents = "auto";
    } else {
      document.body.style.pointerEvents = "";
    }
    return () => {
      document.body.style.pointerEvents = "";
    };
  }, [viewerOpen, createModalOpen]);

  // Camera functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      setIsCameraOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg");
        setSelectedImage(imageData);
        setStoryType("image");
        stopCamera();
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setStoryType("image");
      };
      reader.readAsDataURL(file);
    }
  };

  const resetModal = () => {
    setSelectedImage(null);
    setSelectedImageFile(null);
    setStoryType("camera");
    setTextColor("#FFFFFF");
    setBackground("linear-gradient(135deg, #667eea 0%, #764ba2 100%)");
    setCaption("");
    setStoryText("");
    stopCamera();
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let storyData: any = {}; 

      if (storyType === "text") {
        if (!storyText.trim()) {
          alert("Please enter some text for your story");
          setIsUploading(false);
          return;
        }
        storyData = {
          text: storyText,
          backgroundColor,
          textColor,
        };
      } else if (storyType === "image" && selectedImageFile) {
        storyData = {
          image: selectedImageFile,
          caption: caption.trim() || undefined,
        };
      } else {
        alert("No story content to share!");
        setIsUploading(false);
        return;
      }

      await apiClient.createStory(storyData);
      await refreshStories();

      resetModal();
      setCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating story:", error);
      alert("Failed to create story. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="flex space-x-4 overflow-x-auto pb-4 px-4 scrollbar-hide">
        <div className="flex flex-col items-center space-y-2 min-w-fit">
          <div
            className="relative cursor-pointer"
            onClick={() => setCreateModalOpen(true)}
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user?.profilePic} className="object-cover" />
                <AvatarFallback className="bg-gray-100 text-gray-600">
                  {user?.username
                    ? user.username.split(" ").map((n) => n[0]).join("")
                    : "U"}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 shadow-lg flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>

          <span className="text-xs text-center max-w-16 truncate font-medium text-gray-700">
            Your Story
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4 px-2">
            <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse"></div>
          </div>
        ) : stories.length === 0 ? (
          <div className="flex items-center justify-center py-4 px-2 text-muted-foreground text-xs">
            No stories yet
          </div>
        ) : (
          stories.map((story, idx) => (
            <div
              key={story._id}
              className="flex flex-col items-center space-y-2 min-w-fit cursor-pointer"
              onClick={() => {
                setActiveStoryIdx(idx);
                setViewerOpen(true);
              }}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  {story.imageUrl ? (
                    <Avatar className="w-full h-full">
                      <AvatarImage
                        src={story.imageUrl}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {story.user?.username
                          ? story.user.username.split(" ").map((n) => n[0]).join("")
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center rounded-full text-xs font-medium text-center p-1"
                      style={{
                        background: story.backgroundColor || "#f3f4f6",
                        color: story.textColor || "#000000",
                      }}
                    >
                      {story.text?.slice(0, 10) || "Story"}
                    </div>
                  )}
                </div>
              </div>

              <span className="text-xs text-center max-w-16 truncate font-medium text-gray-700">
                {story.user?.username || "User"}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Enhanced Create Story Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-white rounded-xl shadow-2xl w-96 max-w-sm mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Create Story
              </h3>
              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  resetModal();
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Story Type Selection */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setStoryType("camera")}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  storyType === "camera"
                    ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <Camera className="w-4 h-4 mx-auto mb-1" />
                Camera
              </button>
              <button
                onClick={() => setStoryType("text")}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  storyType === "text"
                    ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <Type className="w-4 h-4 mx-auto mb-1" />
                Text
              </button>
              <button
                onClick={() => setStoryType("image")}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  storyType === "image"
                    ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <ImageIcon className="w-4 h-4 mx-auto mb-1" />
                Photo
              </button>
            </div>

            {/* Story Content */}
            <div className="p-4">
              {/* Camera Section */}
              {storyType === "camera" && (
                <div className="space-y-4">
                  {!isCameraOpen && !selectedImage && (
                    <div className="text-center">
                      <button
                        onClick={startCamera}
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center mx-auto space-x-2"
                      >
                        <Camera className="w-5 h-5" />
                        <span>Open Camera</span>
                      </button>
                    </div>
                  )}

                  {isCameraOpen && (
                    <div className="space-y-4">
                      <div className="relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-64 object-cover rounded-lg bg-black"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={capturePhoto}
                          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Capture Photo
                        </button>
                        <button
                          onClick={stopCamera}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          <StopCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Image Preview and Caption */}
              {(storyType === "image" ||
                (storyType === "camera" && selectedImage)) && (
                <div className="space-y-4">
                  {selectedImage && (
                    <div className="w-full h-64 rounded-lg overflow-hidden">
                      <img
                        src={selectedImage}
                        alt="Story preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {!selectedImage && storyType === "image" && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="block w-full p-6 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Choose Photo
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Caption Input */}
                  <div>
                    <input
                      type="text"
                      placeholder="Add a caption..."
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={100}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {caption.length}/100 characters
                    </div>
                  </div>
                </div>
              )}

              {/* Text Story */}
              {storyType === "text" && (
                <div className="space-y-4">
                  <div
                    className="w-full h-64 rounded-lg flex items-center justify-center p-6"
                    style={{ background: backgroundColor }}
                  >
                    <p
                      className="text-lg font-medium text-center"
                      style={{ color: textColor }}
                    >
                      {storyText || "Your story text will appear here"}
                    </p>
                  </div>

                  <div>
                    <textarea
                      placeholder="What's on your mind?"
                      value={storyText}
                      onChange={(e) => setStoryText(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      maxLength={120}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {storyText.length}/120 characters
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Background
                    </label>
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                      {gradientBackgrounds.map((bg, idx) => (
                        <button
                          key={idx}
                          onClick={() => setBackground(bg)}
                          className={`w-8 h-8 rounded-full flex-shrink-0 border-2 ${
                            backgroundColor === bg
                              ? "border-blue-500"
                              : "border-gray-300"
                          }`}
                          style={{ background: bg }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text Color
                    </label>
                    <div className="flex space-x-2">
                      {[
                        "#FFFFFF",
                        "#000000",
                        "#FF6B6B",
                        "#4ECDC4",
                        "#45B7D1",
                        "#FFA07A",
                      ].map((color) => (
                        <button
                          key={color}
                          onClick={() => setTextColor(color)}
                          className={`w-8 h-8 rounded-full border-2 ${
                            textColor === color
                              ? "border-blue-500"
                              : "border-gray-300"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    resetModal();
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStory}
                  disabled={isUploading || (!storyText && !selectedImageFile)} // Corrected condition: use selectedImageFile
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? "Sharing..." : "Share Story"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <StoryViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        story={activeStoryIdx !== null ? stories[activeStoryIdx] : null}
        stories={stories} // Pass the full stories array
        currentIndex={activeStoryIdx !== null ? activeStoryIdx : 0} // Pass the current index
        onNext={() =>
          setActiveStoryIdx((idx) => {
            if (idx === null) return null;
            return idx < stories.length - 1 ? idx + 1 : 0; // Loop back to start
          })
        }
        onPrev={() =>
          setActiveStoryIdx((idx) => {
            if (idx === null) return null;
            return idx > 0 ? idx - 1 : stories.length - 1; // Loop to end
          })
        }
        onDelete={async () => {
          if (activeStoryIdx === null) return;
          const storyToDelete = stories[activeStoryIdx];
          if (user && storyToDelete.userId === user._id) {
            await apiClient.deleteStory(storyToDelete._id);
            await refreshStories(); 
            // After deleting, decide what to show next
            // If it was the last story, close. Otherwise, try to stay on the next available story.
            const newStoriesCount = stories.length - 1;
            if (newStoriesCount === 0) {
                setViewerOpen(false);
                setActiveStoryIdx(null); // No stories left
            } else if (activeStoryIdx >= newStoriesCount) {
                setActiveStoryIdx(newStoriesCount - 1); // If last story deleted, go to new last
            }
            // If a middle story was deleted, activeStoryIdx will still point to the correct next story
          }
        }}
        canDelete={
          activeStoryIdx !== null && user && stories[activeStoryIdx]?.userId === user._id
            ? true
            : false // Explicitly boolean
        }
      />
    </>
  );
}