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
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getPosts({ includeAnonymous: true, limit: 20 })
      setPosts(response.posts)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handlePostCreated = () => {
    fetchPosts() // Refresh posts when a new post is created
  }

  const handlePostUpdate = (postId: string, updates: Partial<Post>) => {
    setPosts((prevPosts) => prevPosts.map((post) => (post._id === postId ? { ...post, ...updates } : post)))
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchPosts} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
            Try Again
          </button>
        </div>
      </MainLayout>
    )
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
            posts.map((post) => (
              <PostCard key={post._id} post={post} onUpdate={(updates) => handlePostUpdate(post._id, updates)} />
            ))
          )}
        </div>
      </div>
    </MainLayout>
  )
}
