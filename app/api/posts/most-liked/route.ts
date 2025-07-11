import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { sanitizePost } from "@/lib/models/Post"
import type { Post } from "@/lib/models/Post"
import type { User } from "@/lib/models/User"

// GET /api/posts/most-liked
export async function GET() {
  try {
    const { db } = await connectToDatabase()
    const postsCollection = db.collection<Post>("posts")
    const usersCollection = db.collection<User>("users")

    // Find top 10 most liked posts
    const posts = await postsCollection
      .find({})
      .sort({ likes: -1 })
      .limit(10)
      .toArray()

    // Attach user data (if not anonymous)
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        if (post.isAnonymous) return sanitizePost(post)
        const user = await usersCollection.findOne({ _id: post.userId })
        return sanitizePost(
          post,
          user
            ? {
                id: user._id.toString(),
                username: user.username,
                name: user.name,
                avatar: user.avatar,
              }
            : undefined
        )
      })
    )

    return NextResponse.json({ posts: postsWithUsers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
