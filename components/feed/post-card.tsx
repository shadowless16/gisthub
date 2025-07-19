// components/feed/post-card.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, Share, MoreHorizontal, Send, Loader2, Trash2, Paperclip } from "lucide-react"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useLike } from "@/hooks/use-like";
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/lib/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import React from "react" // Explicitly import React for JSX
import type { CommentType } from "../../types/comment";

// Interface for Post data
interface Post {
  _id: string;
  userId: string;
  content: string;
  imageURL?: string;
  isAnonymous: boolean;
  createdAt: string;
  user?: {
    username: string;
    profilePic?: string;
  };
  likes: string[];
  likesCount: number;
  taggedUserIds?: string[];
}

// AddComment hook for single post
const useAddComment = (postId: string, onCommentAdded: () => void) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCommenting, setIsCommenting] = useState(false);

  const addComment = async (content: string, parentId?: string, imageFile?: File) => {
    if (!user?._id || (!content.trim() && !imageFile)) {
      toast({
        title: "Comment content missing",
        description: "Please write a comment or attach an image.",
        variant: "destructive",
      });
      return;
    }

    setIsCommenting(true);
    try {
      await apiClient.addComment({ postId, userId: user._id, content, parentId, imageFile });
      onCommentAdded();
      toast({
        title: "Comment added",
        description: "Your comment was posted successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to add comment",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsCommenting(false);
    }
  };
  return { addComment, isCommenting };
};

// Reusable Comment Input Component
interface CommentInputProps {
  onSubmit: (content: string, imageFile?: File) => void;
  placeholder?: string;
  className?: string;
  isSubmitting?: boolean;
}

export const CommentInput = ({ onSubmit, placeholder = "Write a comment...", className = "", isSubmitting = false }: CommentInputProps) => {
  const { user } = useAuth()
  const [content, setContent] = useState<string>("")
  const [showEmoji, setShowEmoji] = useState<boolean>(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedImage(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  const handleSubmit = () => {
    if (!content.trim() && !selectedImage) return
    onSubmit(content, selectedImage ?? undefined)
    setContent("")
    setSelectedImage(null)
    setImagePreview(null)
    setShowEmoji(false); // Hide emoji picker after submitting
  }

  return (
    <div className={`flex items-start space-x-2 sm:space-x-3 ${className}`}>
      <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
        <AvatarImage src={user?.profilePic || "/placeholder.svg"} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {user?.username?.slice(0, 2).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-2 relative"> {/* Added relative for emoji picker positioning */}
        <div className="flex gap-1 sm:gap-2 items-center">
          <Textarea
            placeholder={placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[50px] sm:min-h-[60px] resize-none text-sm"
            rows={1} // Start with 1 row and let it expand
          />
          <div className="flex flex-col gap-1 flex-shrink-0">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowEmoji(!showEmoji)}>
              😊
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => document.getElementById('comment-img-input')?.click()}>
              <Paperclip className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
          <input
            id="comment-img-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
        {showEmoji && (
          <div className="absolute z-50 mt-2 right-0 top-full"> {/* Positioned relative to the parent div */}
            <Picker data={data} onEmojiSelect={(e: any) => setContent(content + (e.native || e.shortcodes || ""))} theme="auto" />
          </div>
        )}
        {imagePreview && (
          <div className="mt-2 relative">
            <img src={imagePreview} alt="preview" className="max-h-24 sm:max-h-32 rounded object-cover" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 rounded-full"
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={(!content.trim() && !selectedImage) || isSubmitting}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm"
          >
            {isSubmitting ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 animate-spin" /> : <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
            Post
          </Button>
        </div>
      </div>
    </div>
  )
}

// Instagram-style Comment Component
interface CommentProps {
  comment: CommentType;
  onReply: (content: string, parentId?: string, imageFile?: File) => void;
  level?: number;
  isReplying?: boolean; // Added for loading state on replies
}

export const Comment = ({ comment, onReply, level = 0, isReplying = false }: CommentProps) => {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [showReplies, setShowReplies] = useState(false)

  const handleReply = (content: string, imageFile?: File) => {
    onReply(content, comment._id, imageFile)
    setShowReplyInput(false) // Close reply input after submitting
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-start space-x-2 sm:space-x-3">
        {/* Wrap Avatar with a link to profile */}
        <a
          href={comment.user?.username ? `/profile/${comment.user.username}` : undefined}
          tabIndex={comment.user?.username ? 0 : -1}
          aria-label="View user profile"
          onClick={e => e.stopPropagation()} // Prevent parent click from interfering
        >
          <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
            <AvatarImage src={comment.user?.profilePic || "/placeholder.svg"} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {comment.user?.username?.slice(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </a>
        <div className="flex-1 min-w-0">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2">
            {/* Wrap Username with a link to profile */}
            <a
              href={comment.user?.username ? `/profile/${comment.user.username}` : undefined}
              className="font-semibold text-xs sm:text-sm hover:underline hover:text-blue-600 transition"
              tabIndex={comment.user?.username ? 0 : -1}
              aria-label="View user profile"
              onClick={e => e.stopPropagation()} // Prevent parent click from interfering
            >
              {comment.user?.username || "User"}
            </a>
            <div className="text-xs sm:text-sm break-words whitespace-pre-line">{comment.content}</div>
            {comment.imageURL && (
              <div className="mt-2">
                <Image src={comment.imageURL} alt="comment image" width={100} height={100} className="max-h-24 sm:max-h-32 rounded object-cover" />
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4 mt-1 px-2">
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(comment.createdAt)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs px-2 py-0.5 sm:py-1 h-auto font-semibold text-muted-foreground hover:text-foreground"
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              Reply
            </Button>
            {comment.replies && comment.replies.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs px-2 py-0.5 sm:py-1 h-auto font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? 'Hide' : 'View'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {showReplyInput && (
        <div className="ml-6 sm:ml-11">
          <CommentInput
            onSubmit={handleReply}
            placeholder={`Reply to ${comment.user?.username || "User"}...`}
            isSubmitting={isReplying} // Pass the submitting state to the input
          />
        </div>
      )}

      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 sm:ml-11 space-y-2 sm:space-y-3 border-l-2 border-gray-200 dark:border-gray-700 pl-3 sm:pl-4">
          {comment.replies.map((reply: CommentType) => (
            <Comment key={reply._id} comment={reply} onReply={onReply} level={level + 1} isReplying={isReplying} />
          ))}
        </div>
      )}
    </div>
  )
}

// Utility function to format time ago
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago` // Less than 30 days
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago` // Less than 12 months
  return `${Math.floor(diffInSeconds / 31536000)}y ago`
}

// Utility to parse @username and link to profile
function renderContentWithMentions(content: string) {
  if (!content) return null;
  const mentionRegex = /@([a-zA-Z0-9_]{2,})/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = mentionRegex.exec(content)) !== null) {
    const [full, username] = match;
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <a
        key={`mention-${key++}`}
        href={`/profile/${username}`}
        className="text-blue-600 hover:underline font-semibold"
      >
        @{username}
      </a>
    );
    lastIndex = match.index + full.length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts;
}

interface UserSearchResult {
  _id: string;
  username: string;
  profilePic?: string;
}

// New: useMentions hook
const useMentions = (textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const { toast } = useToast();

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
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestions.length > 0) {
        e.preventDefault();
        const selectedUsername = suggestions[selectedIndex].username;
        const textarea = textareaRef.current;
        if (textarea && searchTerm !== null && mentionStartIndex !== -1) {
          const start = textarea.value.substring(0, mentionStartIndex);
          const end = textarea.value.substring(mentionStartIndex + 1 + searchTerm.length);
          const newValue = `${start}@${selectedUsername} ${end}`;
          textarea.value = newValue;
          const newCursorPos = start.length + 1 + selectedUsername.length + 1;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
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
      const end = textarea.value.substring(mentionStartIndex + 1 + searchTerm.length);
      const newValue = `${start}@${username} ${end}`;
      textarea.value = newValue;
      const newCursorPos = start.length + 1 + username.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
    setShowSuggestions(false);
    setSearchTerm(null);
    setSuggestions([]);
  }, [searchTerm, mentionStartIndex, textareaRef]);

  return {
    searchTerm,
    suggestions,
    showSuggestions,
    selectedIndex,
    handleInputChange,
    handleKeyDown,
    handleSelectSuggestion,
    setShowSuggestions
  };
};

// New: PostCreator Component
interface PostCreatorProps {
  onSubmit: (content: string, imageFile?: File, taggedUserIds?: string[]) => void;
  isSubmitting?: boolean;
}

export const PostCreator = ({ onSubmit, isSubmitting = false }: PostCreatorProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    searchTerm,
    suggestions,
    showSuggestions,
    selectedIndex,
    handleInputChange,
    handleKeyDown,
    handleSelectSuggestion,
    setShowSuggestions: setMentionSuggestionsVisibility
  } = useMentions(textareaRef);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const extractTaggedUsernames = (text: string): string[] => {
    const mentionRegex = /@([a-zA-Z0-9_]{2,})/g;
    const matches = text.match(mentionRegex);
    if (!matches) return [];
    return [...new Set(matches.map(match => match.substring(1)))];
  };

  const handleSubmit = async () => {
    if (!content.trim() && !selectedImage) return;

    let taggedUserIds: string[] = [];
    const usernamesToLookup = extractTaggedUsernames(content);

    if (usernamesToLookup.length > 0) {
      try {
        const response = await apiClient.getUsersByUsernames(usernamesToLookup) as { results: UserSearchResult[] };
        taggedUserIds = response.results.map((u: UserSearchResult) => u._id);
      } catch (error) {
        console.error("Error looking up tagged users:", error);
      }
    }

    onSubmit(content, selectedImage ?? undefined, taggedUserIds.length > 0 ? taggedUserIds : undefined);
    setContent("");
    setSelectedImage(null);
    setImagePreview(null);
    setShowEmoji(false);
    setMentionSuggestionsVisibility(false);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    handleInputChange(e);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(event.target as Node)) {
        setMentionSuggestionsVisibility(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setMentionSuggestionsVisibility, textareaRef]);


  return (
    <div className="flex items-start space-x-2 sm:space-x-3 w-full">
      <Avatar className="w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0">
        <AvatarImage src={user?.profilePic || "/placeholder.svg"} />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
          {user?.username?.slice(0, 2).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-2 relative">
        <div className="flex gap-1 sm:gap-2 items-center relative">
          <Textarea
            ref={textareaRef}
            placeholder="What's on your mind?"
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] sm:min-h-[120px] resize-none text-base pr-12"
            rows={4}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 bg-popover border rounded-md shadow-lg py-1 w-full max-h-48 overflow-y-auto"
                 style={{ top: textareaRef.current?.offsetHeight ? `${textareaRef.current.offsetHeight + 8}px` : 'auto' }}
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
          <div className="absolute right-2 top-2 flex flex-col gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowEmoji(!showEmoji)}>
              😊
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => document.getElementById('post-img-input')?.click()}>
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>
          <input
            id="post-img-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {showEmoji && (
          <div className="absolute z-50 mt-2 right-0 top-full">
            <Picker data={data} onEmojiSelect={(e: any) => setContent(prev => prev + (e.native || e.shortcodes || ""))} theme="auto" />
          </div>
        )}
        {imagePreview && (
          <div className="mt-2 relative">
            <Image src={imagePreview} alt="preview" width={200} height={150} className="max-h-32 rounded object-cover" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 rounded-full"
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSubmit}
            disabled={(!content.trim() && !selectedImage) || isSubmitting}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
};


// Main PostCard Component (for feed display)
interface PostCardProps {
  post: Post;
  comments: CommentType[]; // Still keeps comments for feed view's comment section
  commentsLoading: boolean;
  onUpdate?: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  className?: string;
  onProfileClick?: () => void;
  onCommentAdded: () => void;
  onPostCreated?: (newPost: Post) => void;
  openCommentsByDefault?: boolean;
  disableDetailNavigation?: boolean; // Prevents navigation when clicking on parts of the card
}

export function PostCard({ post, comments, commentsLoading, onUpdate, onDelete, className, onCommentAdded, onPostCreated, openCommentsByDefault = false, disableDetailNavigation = false }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCommentsSection, setShowCommentsSection] = useState(openCommentsByDefault);
  const { isLiked, likesCount, isLiking, handleLike } = useLike(post, onUpdate ? () => onUpdate(post._id) : undefined);
  const { addComment, isCommenting } = useAddComment(post._id, onCommentAdded);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return
    try {
      await onDelete(post._id)
      toast({
        title: "Post deleted",
        description: "Your post was deleted successfully.",
      })
    } catch (err) {
      toast({
        title: "Failed to delete post",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      })
    }
  }

  const handlePostSubmit = async (content: string, imageFile?: File, taggedUserIds?: string[]) => {
    try {
      const newPostResp = await apiClient.createPost({
        content,
        imageFile,
        isAnonymous: false,
        taggedUserIds: taggedUserIds,
      }) as { post: Post };
      const newPost = newPostResp.post;
      toast({
        title: "Post created",
        description: "Your post was published successfully.",
      });
      onPostCreated?.(newPost);
    } catch (error) {
      toast({
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };


  return (
    <div className={`w-full px-2 sm:px-4 ${className}`}>
      <Card className="w-full border border-primary/40 dark:border-primary/60 bg-background rounded-lg sm:rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-3 sm:p-6 w-full">
          {/* Post Header */}
          <div className="flex items-start space-x-2 sm:space-x-4">
            <div className="flex items-start gap-2 flex-1">
              {post.isAnonymous ? (
                <Avatar className="w-8 h-8 sm:w-12 sm:h-12 ring-1 sm:ring-2 ring-primary/10 flex-shrink-0">
                  <AvatarFallback className="bg-muted text-xs">?</AvatarFallback>
                </Avatar>
              ) : (
                <a
                  href={post.user?.username ? `/profile/${post.user.username}` : undefined}
                  tabIndex={post.user?.username ? 0 : -1}
                  aria-label="View profile"
                  onClick={e => disableDetailNavigation && e.stopPropagation()}
                >
                  <Avatar className="w-8 h-8 sm:w-12 sm:h-12 ring-1 sm:ring-2 ring-primary/10 flex-shrink-0 hover:ring-primary/40 transition">
                    {post.user?.profilePic && (
                      <AvatarImage src={post.user.profilePic || "/placeholder.svg"} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
                      {post.user?.username?.slice(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </a>
              )}
              <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    {post.isAnonymous ? (
                      <p className="font-semibold text-sm sm:text-base truncate">Anonymous Student</p>
                    ) : (
                      <a
                        href={post.user?.username ? `/profile/${post.user.username}` : undefined}
                        className="font-semibold text-sm sm:text-base truncate hover:underline hover:text-blue-600 transition"
                        tabIndex={post.user?.username ? 0 : -1}
                        aria-label="View profile"
                        onClick={e => disableDetailNavigation && e.stopPropagation()}
                      >
                        {post.user?.username || "Unknown User"}
                      </a>
                    )}
                    <p className="text-xs sm:text-sm text-muted-foreground">{formatTimeAgo(post.createdAt)}</p>
                  </div>
                  {user?._id === post.userId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={handleDelete} className="flex items-center text-red-600 cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Post Content */}
                <p className="text-sm sm:text-base leading-relaxed break-words whitespace-pre-line hyphens-auto">
                  {renderContentWithMentions(post.content)}
                </p>

                {/* Post Image */}
                {post.imageURL && (
                  <div className="rounded-lg sm:rounded-xl overflow-hidden border border-primary/30 dark:border-primary/50 -mx-1 sm:mx-0">
                    <Image
                      src={post.imageURL}
                      alt="Post image"
                      width={0}
                      height={0}
                      sizes="(max-width: 640px) 100vw, 600px"
                      className="w-full h-auto max-h-60 sm:max-h-80 object-contain"
                    />
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-primary/20 dark:border-primary/30">
                  <div className="flex items-center space-x-3 sm:space-x-6 overflow-x-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => { e.stopPropagation(); handleLike(); }}
                      disabled={isLiking}
                      className={`flex items-center space-x-1 sm:space-x-2 hover:bg-red-50 hover:text-red-500 flex-shrink-0 ${
                        isLiked ? "text-red-500" : "text-muted-foreground"
                      }`}
                    >
                      {isLiking ? (
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? "fill-current" : ""}`} />
                      )}
                      <span className="text-xs sm:text-sm font-medium">{likesCount}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => { e.stopPropagation(); setShowCommentsSection(!showCommentsSection); }}
                      className="flex items-center space-x-1 sm:space-x-2 hover:bg-blue-50 hover:text-blue-500 text-muted-foreground flex-shrink-0"
                    >
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-xs sm:text-sm font-medium">
                        Comment{comments.length > 0 && ` (${comments.length})`}
                      </span>
                    </Button>

                  </div>
                </div>

                {/* Comments Section */}
                {showCommentsSection && (
                  <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
                    <CommentInput
                      onSubmit={(content, imageFile) => addComment(content, undefined, imageFile)}
                      placeholder="Write a comment..."
                      isSubmitting={isCommenting}
                    />
                    {commentsLoading ? (
                      <div className="text-center text-xs sm:text-sm text-muted-foreground py-4">
                        Loading comments...
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {comments.length > 0 ? (
                          comments.map(comment => (
                            <Comment
                              key={comment._id}
                              comment={comment}
                              onReply={(content, parentId, imageFile) => addComment(content, parentId, imageFile)}
                              isReplying={isCommenting}
                            />
                          ))
                        ) : (
                          <div className="text-center text-xs sm:text-sm text-muted-foreground py-4">
                            No comments yet. Be the first to comment!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}