// hooks/use-add-comment.ts
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useToast } from "@/hooks/use-toast"; // Assuming useToast is also a hook
import { apiClient } from "@/lib/api-client";

export const useAddComment = (postId: string, onCommentAdded: () => void) => {
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