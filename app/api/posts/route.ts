import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import { type Post, sanitizePost } from "@/lib/models/Post"
import type { User } from "@/lib/models/User"
import { isSunday } from "@/lib/utils/validation"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeAnonymous = searchParams.get("includeAnonymous") === "true"
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const skip = Number.parseInt(searchParams.get("skip") || "0")

    const { db } = await connectToDatabase()
    const postsCollection = db.collection<Post>("posts")
    const usersCollection = db.collection<User>("users")

    // Build query
    const query: any = {}
    if (!includeAnonymous) {
      query.isAnonymous = false
    }

    // Get posts with pagination
    const posts = await postsCollection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray()

    // Get user data for non-anonymous posts
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        if (post.isAnonymous) {
          return sanitizePost(post)
        }

        const user = await usersCollection.findOne({ _id: post.userId })
        return sanitizePost(
          post,
          user
            ? {
                username: user.username,
                profilePic: user.profilePic,
              }
            : undefined,
        )
      }),
    )

    return NextResponse.json({
      posts: postsWithUsers,
      hasMore: posts.length === limit,
    })
  } catch (error) {
    console.error("Get posts error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, imageURL, isAnonymous } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: "Content must be less than 500 characters" }, { status: 400 })
    }

    // Check if anonymous posting is allowed (only on Sundays)
    if (isAnonymous && !isSunday()) {
      return NextResponse.json({ error: "Anonymous posting is only allowed on Sundays" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const postsCollection = db.collection<Post>("posts")

    const newPost: Post = {
      userId: new ObjectId(currentUser.userId),
      content: content.trim(),
      imageURL,
      isAnonymous: Boolean(isAnonymous),
      likes: [],
      createdAt: new Date(),
    }

    const result = await postsCollection.insertOne(newPost)
    const createdPost = await postsCollection.findOne({ _id: result.insertedId })

    if (!createdPost) {
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 })
    }

    // Get user data for response (if not anonymous)
    let userData
    if (!createdPost.isAnonymous) {
      const usersCollection = db.collection<User>("users")
      const user = await usersCollection.findOne({ _id: createdPost.userId })
      if (user) {
        userData = {
          username: user.username,
          profilePic: user.profilePic,
        }
      }
    }

    return NextResponse.json(
      {
        message: "Post created successfully",
        post: sanitizePost(createdPost, userData),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create post error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
