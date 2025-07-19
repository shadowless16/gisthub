"use client"

import { useEffect, useState } from "react"
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from "@/components/layout/main-layout"
import { PostCard } from "@/components/feed/post-card"
import { apiClient } from "@/lib/api-client"
import { Loader2 } from "lucide-react"
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';

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
  taggedUserIds?: string[];
}

interface CommentType {
  _id: string;
  user?: {
    username: string;
    profilePic?: string;
  };
  content: string;
  createdAt: string;
  imageURL?: string;
  replies?: CommentType[];
}

export default function SinglePostPage() {
  const params = useParams();
  const postId = params.postId as string;

  const {
    data: postData,
    isLoading: isPostLoading,
    error: postError,
    refetch: refetchPost,
  } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) return null;
      const response = await apiClient.getPostById(postId) as { post: Post };
      return response.post;
    },
    enabled: !!postId,
  });

  const {
    data: commentsData,
    isLoading: isCommentsLoading,
    error: commentsError,
    refetch: refetchComments,
  } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      if (!postId) return null;
      const response = await apiClient.getComments(postId, { limit: 10, skip: 0 }) as { comments: CommentType[] };
      return response.comments;
    },
    enabled: !!postId && !!postData, // Only fetch comments if postData is available
  });

  // Debug log to check if imageURL is present in comments
  if (typeof window !== 'undefined') {
    // Only log in the browser
    console.log('commentsData:', commentsData);
  }

  const handlePostUpdate = () => {
    refetchPost();
    refetchComments();
  };

  const handleCommentAdded = () => {
    refetchComments();
    refetchPost(); // Refetch post to update comment count if it's part of post data
  };

  const handleDeletePost = async (id: string) => {
    await apiClient.deletePost(id);
    // Redirect or show a message after deletion
    // For now, simply refetching to show it's gone from the "single" view if not redirected
    refetchPost();
    // Potentially redirect to feed page after deletion
    window.location.href = '/feed';
  };


  if (isPostLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto py-8"> {/* Changed max-w-2xl to max-w-4xl */}
          <Skeleton className="h-60 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (postError) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{postError instanceof Error ? postError.message : 'Failed to load post'}</p>
          <button onClick={() => refetchPost()} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
            Try Again
          </button>
        </div>
      </MainLayout>
    );
  }

  if (!postData) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Post not found.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 py-6"> {/* Changed max-w-2xl to max-w-4xl */}
        <PostCard
          post={postData}
          comments={commentsData || []}
          commentsLoading={isCommentsLoading}
          onUpdate={handlePostUpdate}
          onDelete={handleDeletePost}
          onCommentAdded={handleCommentAdded}
          openCommentsByDefault={true} // Auto-open comments section
          disableDetailNavigation={true} // Disable further navigation from within this PostCard
        />
      </div>
    </MainLayout>
  );
}