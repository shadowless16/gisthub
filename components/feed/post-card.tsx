// components/feed/post-card.tsx

"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, MoreHorizontal, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useLike } from "@/hooks/use-like";
import { useAuth } from "@/lib/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CustomModal } from "@/components/ui/custom-modal";
import React from "react";

import type { CommentType } from "@/types/comment";
import type { Post } from "@/types/posts";
import { useAddComment } from "@/lib/hooks/use-add-comment";
import { CommentInput } from "@/components/ui/comment-input";
import { Comment } from "@/components/feed/comments";
import { formatTimeAgo } from "@/lib/utils/time-formatter";
import { renderContentWithMentions } from "@/lib/utils/content-renderer";

import { apiClient } from "@/lib/api-client";

interface PostCardProps {
  post: Post;
  comments: CommentType[];
  commentsLoading: boolean;
  onUpdate?: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  className?: string;
  onProfileClick?: () => void;
  onCommentAdded: () => void;
  onPostCreated?: (newPost: Post) => void;
  openCommentsByDefault?: boolean;
  disableDetailNavigation?: boolean;
}

export function PostCard({
  post,
  comments,
  commentsLoading,
  onUpdate,
  onDelete,
  className,
  onCommentAdded,
  onPostCreated,
  openCommentsByDefault = false,
  disableDetailNavigation = false
}: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCommentsSection, setShowCommentsSection] = useState(openCommentsByDefault);
  const { isLiked, likesCount, isLiking, handleLike } = useLike(post, onUpdate ? () => onUpdate(post._id) : undefined);
  const { addComment, isCommenting } = useAddComment(post._id, onCommentAdded);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // This function only sets the modal open state
  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    // If already deleting, prevent further execution
    if (deleting) {
      return;
    }

    // Set deleting state to true to disable the button and show loading text
    setDeleting(true);

    try {
      await onDelete(post._id); // Execute the actual deletion
      toast({
        title: "Post deleted",
        description: "Your post was deleted successfully.",
      });
      setShowDeleteModal(false); // Close the modal on success
    } catch (err) {
      toast({
        title: "Failed to delete post",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
      // Optionally keep the modal open to show error, but usually better to close it
      setShowDeleteModal(false); // Close the modal even on error
    } finally {
      // Reset deleting state regardless of success or failure
      setDeleting(false);
    }
  };

  // This handlePostSubmit function typically belongs in PostCreator or the page that uses PostCreator.
  // Keeping it here only because it was present in your uploaded post-card.tsx
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
    <>
      <CustomModal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <div className="flex flex-col items-center gap-4 p-2">
          <div className="text-lg font-semibold text-center">Delete Post?</div>
          <div className="text-sm text-muted-foreground text-center">Are you sure you want to delete this post? This action cannot be undone.</div>
          <div className="flex gap-2 mt-2">
            <button
              className="px-4 py-2 rounded bg-destructive text-white disabled:opacity-60"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              className="px-4 py-2 rounded bg-muted text-foreground"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        </div>
      </CustomModal>
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
                          <DropdownMenuItem
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(); // Call the fixed handleDelete
                            }}
                            className="flex items-center text-red-600 cursor-pointer"
                          >
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
                                onReply={(content: string, parentId?: string, imageFile?: File) => addComment(content, parentId, imageFile)}
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
    </>
  );
}