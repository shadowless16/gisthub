// app/feed/[postId]/page.tsx
"use client"

import { useQuery } from '@tanstack/react-query';
import { MainLayout } from "@/components/layout/main-layout"
import { PostCard } from "@/components/feed/post-card" // Corrected import path
import { apiClient } from "@/lib/api-client"
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';

// Import types from their dedicated files
import type { Post } from "@/types/posts"; // Corrected import path
import type { CommentType } from "@/types/comment"; // Corrected import path

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
    enabled: !!postId && !!postData,
  });

  if (typeof window !== 'undefined') {
    console.log('commentsData:', commentsData);
  }

  const handlePostUpdate = () => {
    refetchPost();
    refetchComments();
  };

  const handleCommentAdded = () => {
    refetchComments();
    refetchPost();
  };

  const handleDeletePost = async (id: string) => {
    await apiClient.deletePost(id);
    // Optionally, you can set a state here to show a message or trigger a refetch, or let the page show a not found/empty state.
  };

  if (isPostLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto py-8">
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
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <PostCard
          post={postData}
          comments={commentsData || []}
          commentsLoading={isCommentsLoading}
          onUpdate={handlePostUpdate}
          onDelete={handleDeletePost}
          onCommentAdded={handleCommentAdded}
          openCommentsByDefault={true}
          disableDetailNavigation={true}
          // The onPostCreated prop is removed as PostCard should not create posts directly.
        />
      </div>
    </MainLayout>
  );
}