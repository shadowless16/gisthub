"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, Share, MoreHorizontal, Send, Loader2, Trash2, Paperclip } from "lucide-react"
import Image from "next/image"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/lib/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

// Custom hook for managing like functionality
interface Post {
  _id: string;
  userId: string;
  content: string;
  imageURL?: string;
  isAnonymous: boolean;
  likes: string[];
  likesCount: number;
  createdAt: string;
  user?: {
    username: string;
    profilePic?: string;
  };
}

const useLike = (post: Post, onUpdate?: (id: string) => void) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLiked, setIsLiked] = useState(Array.isArray(post.likes) ? post.likes.includes(user?._id || "") : false)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [isLiking, setIsLiking] = useState(false)

  const handleLike = async (): Promise<void> => {
    if (!user || isLiking) return
    
    setIsLiking(true)
    const previousLiked = isLiked
    const previousCount = likesCount

    // Optimistic update
    setIsLiked(!isLiked)
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1)

    try {
      const response = await apiClient.likePost(post._id) as any
      setIsLiked(response.isLiked)
      setLikesCount(response.likesCount)
      onUpdate?.(post._id)
    } catch (error) {
      setIsLiked(previousLiked)
      setLikesCount(previousCount)
      toast({
        title: "Failed to update like",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLiking(false)
    }
  }

  return { isLiked, likesCount, isLiking, handleLike }
}

// Custom hook for managing comments
const useComments = (postId: string) => {
  const [comments, setComments] = useState<CommentType[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const { user } = useAuth()

  const fetchComments = async (): Promise<void> => {
    setCommentsLoading(true)
    try {
      const response = await apiClient.getComments(postId) as any
      setComments(response.comments || [])
    } catch {
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  const addComment = async (content: string, parentId?: string, imageFile?: File) => {
    if (!user?._id || !content.trim()) return
    await apiClient.addComment({ postId, userId: user._id, content, parentId, imageFile })
    await fetchComments()
  }

  return { comments, commentsLoading, fetchComments, addComment }
}

// Reusable Comment Input Component
interface CommentInputProps {
  onSubmit: (content: string, imageFile?: File) => void;
  placeholder?: string;
  className?: string;
}
const CommentInput = ({ onSubmit, placeholder = "Write a comment...", className = "" }: CommentInputProps) => {
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
    if (!content.trim()) return
    onSubmit(content, selectedImage ?? undefined)
    setContent("")
    setSelectedImage(null)
    setImagePreview(null)
  }

  return (
    <div className={`flex items-start space-x-2 sm:space-x-3 ${className}`}>
      <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
        <AvatarImage src={user?.profilePic || "/placeholder.svg"} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {user?.username?.slice(0, 2).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex gap-1 sm:gap-2 items-center">
          <Textarea
            placeholder={placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[50px] sm:min-h-[60px] resize-none text-sm"
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
          <div className="absolute z-50 mt-2 right-2">
            <Picker data={data} onEmojiSelect={(e: any) => setContent(content + (e.native || e.shortcodes || ""))} theme="auto" />
          </div>
        )}
        {imagePreview && (
          <div className="mt-2">
            <img src={imagePreview} alt="preview" className="max-h-24 sm:max-h-32 rounded" />
          </div>
        )}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!content.trim()}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm"
          >
            <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            Post
          </Button>
        </div>
      </div>
    </div>
  )
}

// Instagram-style Comment Component
interface CommentType {
  _id: string;
  user?: {
    username?: string;
    profilePic?: string;
  };
  content: string;
  createdAt: string;
  replies?: CommentType[];
}
interface CommentProps {
  comment: CommentType;
  onReply: (content: string, parentId?: string, imageFile?: File) => void;
  level?: number;
}
const Comment = ({ comment, onReply, level = 0 }: CommentProps) => {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [showReplies, setShowReplies] = useState(false)

  const handleReply = (content: string, imageFile?: File) => {
    onReply(content, comment._id, imageFile)
    setShowReplyInput(false)
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-start space-x-2 sm:space-x-3">
        <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
          <AvatarImage src={comment.user?.profilePic || "/placeholder.svg"} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {comment.user?.username?.slice(0, 2).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2">
            <div className="font-semibold text-xs sm:text-sm">{comment.user?.username || "User"}</div>
            <div className="text-xs sm:text-sm break-words whitespace-pre-line">{comment.content}</div>
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
          />
        </div>
      )}

      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 sm:ml-11 space-y-2 sm:space-y-3 border-l-2 border-gray-200 dark:border-gray-700 pl-3 sm:pl-4">
          {comment.replies.map((reply: CommentType) => (
            <Comment key={reply._id} comment={reply} onReply={onReply} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// Utility function
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

// Main PostCard Component
interface PostCardProps {
  post: Post;
  onUpdate?: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  className?: string;
  onProfileClick?: () => void;
}
export function PostCard({ post, onUpdate, onDelete, className, onProfileClick }: PostCardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [showReplies, setShowReplies] = useState(false)
  
  const { isLiked, likesCount, isLiking, handleLike } = useLike(post, onUpdate)
  const { comments, commentsLoading, fetchComments, addComment } = useComments(post._id)

  useEffect(() => {
    if (showReplies) fetchComments()
  }, [showReplies])

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

  return (
    <div className="w-full px-2 sm:px-4">
      <Card className="w-full max-w-none sm:max-w-xl mx-auto border border-primary/40 dark:border-primary/60 bg-background rounded-lg sm:rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-3 sm:p-6 w-full">
          {/* Post Header */}
          <div className="flex items-start space-x-2 sm:space-x-4">
            <div className="flex items-start gap-2">
              {post.isAnonymous ? (
                <Avatar className="w-8 h-8 sm:w-12 sm:h-12 ring-1 sm:ring-2 ring-primary/10 flex-shrink-0">
                  <AvatarFallback className="bg-muted text-xs">?</AvatarFallback>
                </Avatar>
              ) : (
                <a href={post.user?.username ? `/profile/${post.user.username}` : undefined} tabIndex={post.user?.username ? 0 : -1} aria-label="View profile">
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
                      <DropdownMenuItem onClick={handleDelete} className="flex items-center text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Post Content */}
              <p className="text-sm sm:text-base leading-relaxed break-words whitespace-pre-line hyphens-auto">
                {post.content}
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
                    onClick={handleLike}
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
                    onClick={() => setShowReplies(!showReplies)}
                    className="flex items-center space-x-1 sm:space-x-2 hover:bg-blue-50 hover:text-blue-500 text-muted-foreground flex-shrink-0"
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-medium">Comment</span>
                  </Button>

                  {/* <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-1 sm:space-x-2 hover:bg-green-50 hover:text-green-500 text-muted-foreground flex-shrink-0"
                  >
                    <Share className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-medium">Share</span>
                  </Button> */}
                </div>
              </div>

              {/* Comments Section */}
              {showReplies && (
                <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
                  <CommentInput 
                    onSubmit={(content, imageFile) => addComment(content, undefined, imageFile)}
                    placeholder="Write a comment..."
                  />
                  {commentsLoading ? (
                    <div className="text-center text-xs sm:text-sm text-muted-foreground py-4">
                      Loading comments...
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {comments.map(comment => (
                        <Comment key={comment._id} comment={comment} onReply={(content, parentId, imageFile) => addComment(content, parentId, imageFile)} />
                      ))}
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