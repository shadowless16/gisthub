import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export function useLike(post: any, onUpdate?: () => void) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(
    Array.isArray(post.likes)
      ? post.likes.includes(user?._id)
      : false
  );
  const [likesCount, setLikesCount] = useState(post.likesCount || post.likes?.length || 0);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (!user?._id) {
      toast({
        title: "Login required",
        description: "You must be logged in to like posts.",
        variant: "destructive",
      });
      return;
    }
    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    try {
      const res = await apiClient.likePost(post._id) as { isLiked: boolean; likesCount: number };
      setIsLiked(res.isLiked);
      setLikesCount(res.likesCount);
      if (onUpdate) onUpdate();
    } catch (error) {
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      toast({
        title: "Failed to update like",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  return { isLiked, likesCount, isLiking, handleLike };
}
