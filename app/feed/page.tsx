// app/feed/page.tsx
"use client"

import { useInfiniteQuery } from '@tanstack/react-query';
import { MainLayout } from "@/components/layout/main-layout"
import { StoriesSection } from "@/components/feed/stories-section"
import { PostCreator } from "@/components/feed/post-creator" // Import PostCreator from its dedicated file
import { PostCard } from "@/components/feed/post-card"     // Import PostCard from its dedicated file
import { apiClient } from "@/lib/api-client"
import { Loader2 } from "lucide-react"
import { Skeleton } from '@/components/ui/skeleton';

// Import types from their dedicated files
import type { Post } from "@/types/posts";
import type { CommentType } from "@/types/comment";

interface CommentsByPost {
  [postId: string]: CommentType[];
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
      let commentsByPost: CommentsByPost = {};
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

  // For PostCreator, we need a function to handle submission (creating a new post)
  // This logic should be here, not within PostCreator itself, or PostCreator should handle it internally
  // and just notify this page of a successful creation to refetch.
  const handlePostCreationSubmit = async (content: string, imageFile?: File, taggedUserIds?: string[]) => {
    try {
      await apiClient.createPost({
        content,
        imageFile,
        isAnonymous: false, // Assuming posts from PostCreator are not anonymous by default
        taggedUserIds: taggedUserIds,
      });
      refetch(); // Refetch posts to show the new one
    } catch (error) {
      console.error("Failed to create post:", error);
      // You might want to add a toast message here
    }
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
          {/* Use the new PostCreator component and pass the submit handler */}
          <PostCreator onSubmit={handlePostCreationSubmit} />
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
        {/* Use the new PostCreator component and pass the submit handler */}
        <PostCreator onSubmit={handlePostCreationSubmit} />
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