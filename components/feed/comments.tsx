// components/feed/comment.tsx
"use client"

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { CommentInput } from "@/components/ui/comment-input";
import { formatTimeAgo } from "@/lib/utils/time-formatter"; // Import utility
import type { CommentType } from "@/types/comment"; // Import CommentType

interface CommentProps {
  comment: CommentType;
  onReply: (content: string, parentId?: string, imageFile?: File) => void;
  level?: number;
  isReplying?: boolean;
}

const parseTaggedContent = (content: string) => {
  const parts = content.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      const username = part.slice(1);
      return (
        <a
          key={index}
          href={`/profile/${username}`}
          className="text-blue-600 hover:underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export const Comment = ({ comment, onReply, level = 0, isReplying = false }: CommentProps) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const handleReply = (content: string, imageFile?: File) => {
    onReply(content, comment._id, imageFile);
    setShowReplyInput(false); // Close reply input after submitting
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-start space-x-2 sm:space-x-3">
        <a
          href={comment.user?.username ? `/profile/${comment.user.username}` : undefined}
          tabIndex={comment.user?.username ? 0 : -1}
          aria-label="View user profile"
          onClick={e => e.stopPropagation()}
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
            <a
              href={comment.user?.username ? `/profile/${comment.user.username}` : undefined}
              className="font-semibold text-xs sm:text-sm hover:underline hover:text-blue-600 transition"
              tabIndex={comment.user?.username ? 0 : -1}
              aria-label="View user profile"
              onClick={e => e.stopPropagation()}
            >
              {comment.user?.username || "User"}
            </a>
            <div className="text-xs sm:text-sm break-words whitespace-pre-line">
              {parseTaggedContent(comment.content)}
            </div>
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
            isSubmitting={isReplying}
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
  );
};