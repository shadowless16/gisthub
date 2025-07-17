import React, { useState, useEffect, useRef, useCallback } from "react"; // Added useCallback
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CustomModal } from "@/components/ui/custom-modal"; // Not used in this snippet, but kept if you have it
import { Heart, MessageCircle, Send, MoreHorizontal, X, Volume2, VolumeX, Eye, Users, TrendingUp, ChevronUp, Share2, Trash2 } from "lucide-react";

import { Story } from "@/types/story"; // Import the shared Story interface

interface StoryViewerModalProps {
  open: boolean;
  onClose: () => void;
  story: Story | null;
  onNext?: () => void;
  onPrev?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  stories?: Story[]; // Ensure this is present and used for progress bars
  currentIndex?: number; // Ensure this is present and used for progress bars
}

export function StoryViewerModal({ 
  open, 
  onClose, 
  story, 
  onNext, 
  onPrev, 
  onDelete, 
  canDelete,
  stories = [], // Default to empty array
  currentIndex = 0 // Default to 0
}: StoryViewerModalProps) {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isLiked, setIsLiked] = useState(false); // Assuming initial state is not liked
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swipeY, setSwipeY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  // Memoize handleNext and handlePrev to prevent re-creation on every render
  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      onNext?.();
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning, onNext]);

  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      onPrev?.();
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning, onPrev]);

  // Auto-progress story every 6 seconds (cinematic timing)
  useEffect(() => {
    if (!open || isPaused || showAnalytics) return;
    
    // Reset progress to 0 when opening or changing story if not paused
    if (progress === 0 && !isPaused && !showAnalytics) {
        setProgress(0);
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0; // Reset progress for the next story
        }
        return prev + (100 / 60); // Progress 1.67% every 100ms (6 seconds total: 100% / 6 seconds = 16.66% per second; 1.66% per 100ms)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [open, isPaused, showAnalytics, handleNext, story?._id]); // Added story?._id to dependencies

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
    setIsLiked(false); // Reset like state for new story
  }, [story?._id]);

  const handleStoryClick = (e: React.MouseEvent) => {
    if (showAnalytics) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const halfWidth = rect.width / 2;
    
    if (clickX < halfWidth) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
    setIsPaused(true); // Pause story when dragging starts
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX.current;

    // Prioritize vertical swipe for closing/analytics, horizontal for next/prev
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
      setSwipeY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsPaused(false); // Resume story when dragging ends
    
    if (swipeY > 100) {
      // Swipe down to close
      onClose();
    } else if (swipeY < -100) {
      // Swipe up to show analytics
      setShowAnalytics(true);
    }
    
    setSwipeY(0); // Reset swipe position
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const storyDate = new Date(date);
    const diff = now.getTime() - storyDate.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  };

  const formatNumber = (num: number | undefined) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    // In a real app, you'd send an API call here to update the like count
  };

  const handleSendReply = () => {
    if (replyText.trim()) {
      console.log("Sending reply:", replyText);
      setReplyText("");
      setShowReplyInput(false);
      // In a real app, you'd send an API call here
    }
  };

  if (!story) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-black transition-all duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className="relative w-full h-full flex items-center justify-center"
        style={{ transform: `translateY(${Math.max(0, swipeY)}px)` }}
      >
        {/* Cinematic Progress Bars */}
        <div className="absolute top-4 left-4 right-4 z-30 flex gap-1">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-100 ease-linear rounded-full"
                style={{ 
                  width: index < currentIndex ? '100%' : 
                         index === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Cinematic Header */}
        <div className="absolute top-8 left-4 right-4 z-30 flex items-center justify-between">
          <div className="flex items-center gap-3 backdrop-blur-md bg-black/20 rounded-full px-4 py-2">
            <Avatar className="w-10 h-10 ring-2 ring-white/50">
              <AvatarImage src={story.user?.profilePic || "/placeholder.svg"} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                {story.user?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-white font-bold text-base drop-shadow-lg">
                {story.user?.username || "User"}
              </span>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <span>{timeAgo(story.createdAt)}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Eye size={12} />
                  <span>{formatNumber(story.views)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 backdrop-blur-md bg-black/20 rounded-full px-2 py-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              {isMuted ? <VolumeX size={20} className="text-white" /> : <Volume2 size={20} className="text-white" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Main Story Content */}
        <div 
          className={`relative w-full max-w-md h-full cursor-pointer select-none transition-all duration-300 ${
            isTransitioning ? 'scale-95 opacity-80' : 'scale-100 opacity-100'
          }`}
          onClick={handleStoryClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Cinematic Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-pink-900/30 to-orange-900/30" />
          
          {story.imageUrl ? (
            <>
              <img 
                src={story.imageUrl} 
                alt="story" 
                className="w-full h-full object-cover"
                draggable={false}
              />
              {story.caption && ( // Changed from story.text to story.caption for image stories
                <div className="absolute bottom-24 left-0 w-full flex justify-center pointer-events-none z-40">
                  <div className="backdrop-blur-md bg-black/40 rounded-2xl px-6 py-4 max-w-md w-full mx-4 text-center">
                    <p className="text-white text-lg font-medium leading-relaxed drop-shadow-2xl">
                      {story.caption}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center p-8"
              style={{ background: story.backgroundColor || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
            >
              <div className="text-center">
                <p 
                  className="text-3xl font-bold leading-tight drop-shadow-lg"
                  style={{ color: story.textColor || "#FFFFFF" }}
                >
                  {story.text || "No text content"}
                </p>
              </div>
            </div>
          )}

          {/* Swipe Up Indicator */}
          {!showAnalytics && (
            <div className={`absolute bottom-20 left-0 right-0 text-center text-white text-sm animate-bounce ${isPaused ? 'hidden' : ''}`}>
              <ChevronUp size={24} className="mx-auto" />
              <span className="mt-1">Swipe up for more</span>
            </div>
          )}

          {/* Cinematic Footer */}
          <div className="absolute bottom-0 left-0 right-0 z-30 p-4 flex items-center gap-3">
            {!showReplyInput ? (
              <>
                <button
                  onClick={() => setShowReplyInput(true)}
                  className="flex-1 px-4 py-2 bg-white/20 text-white rounded-full backdrop-blur-md hover:bg-white/30 transition-colors text-left"
                >
                  Send message...
                </button>
                <button
                  onClick={handleLike}
                  className={`p-2 rounded-full backdrop-blur-md ${isLiked ? 'bg-red-500' : 'bg-white/20'} text-white hover:bg-white/30 transition-colors`}
                >
                  <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => setShowAnalytics(true)}
                  className="p-2 rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-colors"
                >
                  <MoreHorizontal size={20} />
                </button>
              </>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 px-4 py-2 bg-white/20 text-white rounded-full backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white/50"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSendReply();
                  }}
                />
                <button
                  onClick={handleSendReply}
                  className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                  disabled={!replyText.trim()}
                >
                  <Send size={20} />
                </button>
                <button
                  onClick={() => setShowReplyInput(false)}
                  className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Analytics Overlay */}
        {showAnalytics && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 z-40">
            <button
              onClick={() => setShowAnalytics(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-bold text-white mb-6">Story Analytics</h3>
            <div className="grid grid-cols-2 gap-6 text-white text-center">
              <div className="flex flex-col items-center">
                <Eye size={36} className="text-blue-400 mb-2" />
                <span className="text-3xl font-bold">{formatNumber(story.views)}</span>
                <span className="text-sm text-gray-300">Views</span>
              </div>
              <div className="flex flex-col items-center">
                <Heart size={36} className="text-red-400 mb-2" />
                <span className="text-3xl font-bold">{formatNumber(story.likes)}</span>
                <span className="text-sm text-gray-300">Likes</span>
              </div>
              <div className="flex flex-col items-center">
                <MessageCircle size={36} className="text-green-400 mb-2" />
                <span className="text-3xl font-bold">{formatNumber(story.replies)}</span>
                <span className="text-sm text-gray-300">Replies</span>
              </div>
              <div className="flex flex-col items-center">
                <Share2 size={36} className="text-purple-400 mb-2" />
                <span className="text-3xl font-bold">{formatNumber(story.shares)}</span>
                <span className="text-sm text-gray-300">Shares</span>
              </div>
            </div>

            {canDelete && (
              <button
                onClick={() => {
                  onDelete?.();
                  setShowAnalytics(false);
                  onClose(); // Close the viewer after deleting
                }}
                className="mt-8 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 size={20} />
                Delete Story
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}