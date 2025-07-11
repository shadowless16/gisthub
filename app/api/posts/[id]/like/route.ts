import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import type { Post } from "@/lib/models/Post"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = getUserFromRequest(request)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const postsCollection = db.collection<Post>("posts")

    const post = await postsCollection.findOne({ _id: new ObjectId(id) })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const currentUserObjectId = new ObjectId(currentUser.userId)

    // Check if user already liked the post
    const hasLiked = post.likes.some((likeId) => likeId.equals(currentUserObjectId))

    if (hasLiked) {
      // Unlike: Remove user from likes array
      await postsCollection.updateOne({ _id: new ObjectId(id) }, { $pull: { likes: currentUserObjectId } })

      return NextResponse.json({
        message: "Post unliked successfully",
        isLiked: false,
        likesCount: post.likes.length - 1,
      })
    } else {
      // Like: Add user to likes array
      await postsCollection.updateOne({ _id: new ObjectId(id) }, { $addToSet: { likes: currentUserObjectId } })

      return NextResponse.json({
        message: "Post liked successfully",
        isLiked: true,
        likesCount: post.likes.length + 1,
      })
    }
  } catch (error) {
    console.error("Like/unlike post error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
