import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import { type Post, sanitizePost } from "@/lib/models/Post"
import UserModel from "@/lib/models/User"
import { isSunday } from "@/lib/utils/validation"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const includeAnonymous = searchParams.get("includeAnonymous") === "true";
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const skip = Number.parseInt(searchParams.get("skip") || "0");

    const { db } = await connectToDatabase();
    const postsCollection = db.collection("posts");
    const usersCollection = db.collection("users");

    // Build query
    const query = !includeAnonymous ? { isAnonymous: false } : {};

    // Only fetch needed fields
    const projection = {
      content: 1,
      imageURL: 1,
      isAnonymous: 1,
      likes: 1,
      likesCount: 1,
      createdAt: 1,
      userId: 1,
    };

    // Get posts with pagination and projection
    const t0 = Date.now();
    const posts = await postsCollection
      .find(query, { projection })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    console.log(`[API LOG] postsCollection.find took ${Date.now() - t0}ms`);


    // Get user data for non-anonymous posts (batch)
    const t1 = Date.now();
    const userIds = posts.filter(p => !p.isAnonymous && p.userId).map(p => p.userId);
    const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))];
    let userMap: Record<string, any> = {};
    if (uniqueUserIds.length > 0) {
      const users = await usersCollection
        .find({ _id: { $in: uniqueUserIds.map(id => new ObjectId(id)) } }, { projection: { username: 1, profilePic: 1 } })
        .toArray();
      userMap = Object.fromEntries(users.map(u => [u._id.toString(), { username: u.username, profilePic: u.profilePic }]));
    }
    console.log(`[API LOG] usersCollection.find took ${Date.now() - t1}ms`);

    const postsWithUsers = posts.map(post => {
      if (post.isAnonymous) return sanitizePost(post as any);
      const user = userMap[post.userId?.toString?.()];
      return sanitizePost(post as any, user);
    });

    const duration = Date.now() - start;
    console.log(`[API LOG] /api/posts GET took ${duration}ms, returned ${postsWithUsers.length} posts`);

    return NextResponse.json({
      posts: postsWithUsers,
      hasMore: posts.length === limit,
    });
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[API ERROR] /api/posts GET failed after ${duration}ms:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
      const usersCollection = db.collection("users")
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
