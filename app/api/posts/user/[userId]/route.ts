import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { type Post, sanitizePost } from "@/lib/models/Post"
import type { User } from "@/lib/models/User"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = Number.parseInt(searchParams.get("skip") || "0")

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const postsCollection = db.collection<Post>("posts")
    const usersCollection = db.collection<User>("users")

    // Get user data
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get user's posts (excluding anonymous ones for privacy)
    const posts = await postsCollection
      .find({
        userId: new ObjectId(userId),
        isAnonymous: false,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const postsWithUser = posts.map((post) =>
      sanitizePost(post, {
        username: user.username,
        profilePic: user.profilePic,
      }),
    )

    return NextResponse.json({
      posts: postsWithUser,
      hasMore: posts.length === limit,
    })
  } catch (error) {
    console.error("Get user posts error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
