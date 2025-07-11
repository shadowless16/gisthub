import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CustomModal } from "@/components/ui/custom-modal";
import { Heart, MessageCircle, Send, MoreHorizontal, X, Volume2, VolumeX, Eye, Users, TrendingUp, ChevronUp, Share2 } from "lucide-react";

interface Story {
  _id: string;
  userId: string;
  imageUrl?: string;
  text?: string;
  createdAt: string;
  expiresAt: string;
  views: number;
  likes: number;
  replies: number;
  shares: number;
  user?: {
    username: string;
    profilePic?: string;
  };
}

interface StoryViewerModalProps {
  open: boolean;
  onClose: () => void;
  story: Story | null;
  onNext?: () => void;
  onPrev?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  stories?: Story[];
  currentIndex?: number;
}

export function StoryViewerModal({ 
  open, 
  onClose, 
  story, 
  onNext, 
  onPrev, 
  onDelete, 
  canDelete,
  stories = [],
  currentIndex = 0
}: StoryViewerModalProps) {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swipeY, setSwipeY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  // Auto-progress story every 6 seconds (cinematic timing)
  useEffect(() => {
    if (!open || isPaused || showAnalytics) return;
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 1.67; // Progress 1.67% every 100ms (6 seconds total)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [open, isPaused, showAnalytics]);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
  }, [story?._id]);

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      onNext?.();
      setIsTransitioning(false);
    }, 300);
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      onPrev?.();
      setIsTransitioning(false);
    }, 300);
  };

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
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    
    if (Math.abs(deltaY) > 10) {
      setSwipeY(deltaY);
      setIsPaused(true);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsPaused(false);
    
    if (swipeY > 100) {
      // Swipe down to close
      onClose();
    } else if (swipeY < -100) {
      // Swipe up to show analytics
      setShowAnalytics(true);
    }
    
    setSwipeY(0);
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const storyDate = new Date(date);
    const diff = now.getTime() - storyDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return "now";
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const formatNumber = (num: number) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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
              {story.text && (
                <div className="absolute bottom-24 left-0 w-full flex justify-center pointer-events-none z-40">
                  <div className="backdrop-blur-md bg-black/40 rounded-2xl px-6 py-4 max-w-md w-full mx-4 text-center">
                    <p className="text-white text-lg font-medium leading-relaxed drop-shadow-2xl">
                      {story.text}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 flex items-center justify-center">
              <div className="text-center px-8">
                <div className="text-white text-8xl mb-6 animate-pulse">✨</div>
                <div className="text-white text-3xl font-bold mb-4 drop-shadow-lg">Text Story</div>
                <div className="w-16 h-1 bg-white/50 rounded-full mx-auto"></div>
              </div>
            </div>
          )}
          
          {/* Navigation Zones */}
          <div className="absolute left-0 top-0 w-1/3 h-full" />
          <div className="absolute right-0 top-0 w-1/3 h-full" />
        </div>

        {/* Analytics Panel */}
        {showAnalytics && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent p-6 transform transition-all duration-300 ease-out">
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-xl font-bold">Story Analytics</h3>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <ChevronUp size={20} className="text-white" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={16} className="text-blue-400" />
                    <span className="text-white/80 text-sm">Views</span>
                  </div>
                  <div className="text-white text-2xl font-bold">{formatNumber(story.views)}</div>
                </div>
                
                <div className="bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={16} className="text-pink-400" />
                    <span className="text-white/80 text-sm">Likes</span>
                  </div>
                  <div className="text-white text-2xl font-bold">{formatNumber(story.likes)}</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle size={16} className="text-green-400" />
                    <span className="text-white/80 text-sm">Replies</span>
                  </div>
                  <div className="text-white text-2xl font-bold">{formatNumber(story.replies)}</div>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 size={16} className="text-yellow-400" />
                    <span className="text-white/80 text-sm">Shares</span>
                  </div>
                  <div className="text-white text-2xl font-bold">{formatNumber(story.shares)}</div>
                </div>
              </div>
              
              {/* Engagement Rate */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-purple-400" />
                  <span className="text-white/80 text-sm">Engagement Rate</span>
                </div>
                <div className="text-white text-2xl font-bold">
                  {((story.likes + story.replies + story.shares) / story.views * 100).toFixed(1)}%
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (story.likes + story.replies + story.shares) / story.views * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cinematic Bottom Actions */}
        <div className="absolute bottom-6 left-4 right-4 z-30">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className="transform transition-all duration-200 hover:scale-110 active:scale-125"
                >
                  <Heart 
                    size={28} 
                    className={`${isLiked ? 'fill-red-500 text-red-500' : 'text-white'} transition-colors drop-shadow-lg`}
                  />
                </button>
                <button
                  onClick={() => setShowReplyInput(!showReplyInput)}
                  className="transform transition-all duration-200 hover:scale-110 active:scale-125"
                >
                  <MessageCircle size={28} className="text-white drop-shadow-lg" />
                </button>
                <button className="transform transition-all duration-200 hover:scale-110 active:scale-125">
                  <Send size={28} className="text-white drop-shadow-lg" />
                </button>
              </div>
              
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="backdrop-blur-md bg-white/20 rounded-full p-3 hover:bg-white/30 transition-colors"
              >
                <TrendingUp size={20} className="text-white" />
              </button>
            </div>
            
            {/* Cinematic Reply Input */}
            {showReplyInput && (
              <div className="backdrop-blur-md bg-black/40 rounded-2xl p-3 transform transition-all duration-300 ease-out">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Send a message..."
                    className="flex-1 bg-transparent text-white placeholder-white/60 px-4 py-3 rounded-xl focus:outline-none text-lg"
                    onKeyPress={(e) => e.key === 'Enter' && replyText.trim() && console.log('Reply sent')}
                  />
                  <button
                    onClick={() => replyText.trim() && console.log('Reply sent')}
                    className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105"
                  >
                    <Send size={20} className="text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Pause Indicator */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-40">
            <div className="backdrop-blur-md bg-black/60 rounded-2xl p-6">
              <div className="flex gap-2">
                <div className="w-2 h-8 bg-white rounded-full animate-pulse" />
                <div className="w-2 h-8 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        
      </div>
    </div>
  );
}