import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type Comment, sanitizeComment } from "@/lib/models/Comment"

// GET /api/comments?postId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const postId = searchParams.get("postId")
  if (!postId || !ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid postId" }, { status: 400 })
  }
  const { db } = await connectToDatabase()
  const commentsCollection = db.collection<Comment>("comments")
  const usersCollection = db.collection("users")

  // Fetch all comments for the post
  const comments = await commentsCollection.find({ postId: new ObjectId(postId) }).sort({ createdAt: 1 }).toArray()
  // Fetch all users for these comments
  const userIds = [...new Set(comments.map(c => c.userId.toString()))]
  const users = await usersCollection.find({ _id: { $in: userIds.map(id => new ObjectId(id)) } }).toArray()
  const userMap = Object.fromEntries(users.map(u => [u._id.toString(), { username: u.username, profilePic: u.profilePic }]))

  // Build nested replies
  const commentMap: Record<string, any> = {}
  comments.forEach(c => { commentMap[c._id!.toString()] = { ...c, replies: [] } })
  const roots: any[] = []
  comments.forEach(c => {
    if (c.parentId) {
      commentMap[c.parentId.toString()].replies.push(commentMap[c._id!.toString()])
    } else {
      roots.push(commentMap[c._id!.toString()])
    }
  })
  function toResponse(c: any): any {
    return sanitizeComment(c, userMap[c.userId.toString()], c.replies.map(toResponse))
  }
  return NextResponse.json({ comments: roots.map(toResponse) })
}

// POST /api/comments
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { postId, userId, content, parentId } = body
  if (!postId || !userId || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }
  const { db } = await connectToDatabase()
  const commentsCollection = db.collection<Comment>("comments")
  const now = new Date()
  const result = await commentsCollection.insertOne({
    postId: new ObjectId(postId),
    userId: new ObjectId(userId),
    content,
    parentId: parentId ? new ObjectId(parentId) : null,
    createdAt: now,
  })
  return NextResponse.json({ success: true, commentId: result.insertedId.toString() })
}
