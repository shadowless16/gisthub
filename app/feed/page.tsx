"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { StoriesSection } from "@/components/feed/stories-section"
import { PostCreator } from "@/components/feed/post-creator"
import { PostCard } from "@/components/feed/post-card"
import { apiClient } from "@/lib/api-client"
import { Loader2 } from "lucide-react"

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


export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const limit = 20;

  const fetchPosts = async (append = false, customSkip?: number) => {
    try {
      setLoading(true);
      const response = await apiClient.getPosts({ includeAnonymous: true, limit, skip: customSkip ?? skip }) as any;
      if (append) {
        setPosts(prev => [...prev, ...response.posts]);
      } else {
        setPosts(response.posts);
      }
      setHasMore(response.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePostCreated = () => {
    setSkip(0);
    fetchPosts(false, 0); // Refresh posts when a new post is created
  };

  const handlePostUpdate = (postId: string, updates: Partial<Post>) => {
    setPosts((prevPosts) => prevPosts.map((post) => (post._id === postId ? { ...post, ...updates } : post)));
  };

  const handlePostDelete = async (postId: string) => {
    try {
      await apiClient.deletePost(postId);
      setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
    } catch (err) {
      setError("Failed to delete post.");
    }
  };

  const loadMore = () => {
    const newSkip = skip + limit;
    setSkip(newSkip);
    fetchPosts(true, newSkip);
  };

  if (loading && posts.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error && posts.length === 0) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => fetchPosts()} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
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
                <PostCard
                  key={post._id}
                  post={post}
                  onUpdate={() => handlePostUpdate(post._id, {})}
                  onDelete={handlePostDelete}
                />
              ))}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={loadMore}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More"}
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
