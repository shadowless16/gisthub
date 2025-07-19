"use client"

import { useEffect, useState } from "react"
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { MainLayout } from "@/components/layout/main-layout"
import { StoriesSection } from "@/components/feed/stories-section"
import { PostCreator } from "@/components/feed/post-creator"
import { PostCard } from "@/components/feed/post-card"
import { apiClient } from "@/lib/api-client"
import { Loader2 } from "lucide-react"
import { Skeleton } from '@/components/ui/skeleton';

interface Post {
  _id: string
  userId: string
  content: string
  imageURL?: string
  isAnonymous: boolean
  likes: string[]
  likesCount: number
  createdAt: string
  user?: {
    username: string
    profilePic?: string
  }
}


interface CommentsByPost {
  [postId: string]: any[];
}

export default function FeedPage() {
  const limit = 20;


  const {
    data,
    error,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await apiClient.getPosts({ includeAnonymous: true, limit, skip: pageParam }) as any;
      let commentsByPost = {};
      if (response.posts.length > 0) {
        const postIds = response.posts.map((p: Post) => p._id).join(",");
        const commentsResp = await apiClient.getCommentsBatch(postIds) as { commentsByPost: CommentsByPost };
        commentsByPost = commentsResp.commentsByPost || {};
      }
      return { ...response, commentsByPost };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore) {
        return allPages.length * limit;
      }
      return undefined;
    },
    initialPageParam: 0,
  });

  const posts = data?.pages.flatMap(page => page.posts) || [];
  const commentsByPost: CommentsByPost = data?.pages.reduce((acc, page) => ({ ...acc, ...page.commentsByPost }), {}) || {};

  const handlePostCreated = () => {
    refetch();
  };

  const handlePostUpdate = (postId: string, updates: Partial<Post>) => {
    refetch();
  };

  const handlePostDelete = async (postId: string) => {
    await apiClient.deletePost(postId);
    refetch();
  };


  if (isLoading && posts.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <StoriesSection />
          <PostCreator onPostCreated={handlePostCreated} />
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error && posts.length === 0) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error instanceof Error ? error.message : 'Failed to load posts'}</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
            Try Again
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <StoriesSection />
        <PostCreator onPostCreated={handlePostCreated} />
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <div
                  key={post._id}
                  style={{ cursor: "pointer" }}
                  onClick={e => {
                    if ((e.target as HTMLElement).closest("button, a, input, textarea, svg")) return;
                    window.location.href = `/feed/${post._id}`;
                  }}
                >
                  <PostCard
                    post={post}
                    comments={commentsByPost[post._id] || []}
                    commentsLoading={isFetching}
                    onUpdate={() => handlePostUpdate(post._id, {})}
                    onDelete={handlePostDelete}
                    onCommentAdded={refetch}
                    disableDetailNavigation={false}
                  />
                </div>
              ))}
              {hasNextPage && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={() => fetchNextPage()}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    disabled={isFetching}
                  >
                    {isFetching ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}