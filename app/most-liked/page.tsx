"use client"
import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { PostCard } from "@/components/feed/post-card"
import { Trophy } from "lucide-react"

export default function MostLikedPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/posts/most-liked")
        if (!res.ok) throw new Error("Failed to fetch posts")
        const data = await res.json()
        setPosts(data.posts || [])
      } catch (err: any) {
        setError(err.message || "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-6 h-6 text-sunset-orange" />
          <h1 className="text-2xl font-bold">Most Liked Posts</h1>
        </div>
        <div className="space-y-4">
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-500">{error}</div>}
          {!loading && !error && posts.length === 0 && <div>No posts found.</div>}
          {!loading && !error && posts.map((post, index) => (
            <div key={post.id} className="relative">
              {index < 3 && (
                <div className="absolute -left-4 top-4 z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-amber-600"
                    }`}
                  >
                    {index + 1}
                  </div>
                </div>
              )}
              <PostCard post={post} />
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
