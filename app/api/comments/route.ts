import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { type Comment, sanitizeComment } from "@/lib/models/Comment";

// GET /api/comments?postId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  const postIdsParam = searchParams.get("postIds");
  let postIds: ObjectId[] = [];
  if (postIdsParam) {
    postIds = postIdsParam.split(",").filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
    if (postIds.length === 0) {
      return NextResponse.json({ error: "Invalid postIds" }, { status: 400 });
    }
  } else if (postId && ObjectId.isValid(postId)) {
    postIds = [new ObjectId(postId)];
  } else {
    return NextResponse.json({ error: "Invalid postId(s)" }, { status: 400 });
  }

  const { db } = await connectToDatabase();
  const commentsCollection = db.collection<Comment>("comments");
  const usersCollection = db.collection("users");

  // Fetch all comments for the given postIds
  const comments = await commentsCollection.find({ postId: { $in: postIds } }).sort({ createdAt: 1 }).toArray();
  // Fetch all users for these comments
  const userIds = [...new Set(comments.map(c => c.userId.toString()))];
  const users = await usersCollection.find({ _id: { $in: userIds.map(id => new ObjectId(id)) } }).toArray();
  const userMap = Object.fromEntries(users.map(u => [u._id.toString(), { username: u.username, profilePic: u.profilePic }]));

  // Build nested replies for each postId
  const commentMap: Record<string, any> = {};
  comments.forEach(c => { commentMap[c._id!.toString()] = { ...c, replies: [] }; });
  const rootsByPost: Record<string, any[]> = {};
  postIds.forEach(id => { rootsByPost[id.toString()] = []; });
  comments.forEach(c => {
    if (c.parentId) {
      commentMap[c.parentId.toString()].replies.push(commentMap[c._id!.toString()]);
    } else {
      rootsByPost[c.postId.toString()].push(commentMap[c._id!.toString()]);
    }
  });
  function toResponse(c: any): any {
    return sanitizeComment(c, userMap[c.userId.toString()], c.replies.map(toResponse));
  }
  // If only one postId, keep old response shape for compatibility
  if (postIds.length === 1) {
    return NextResponse.json({ comments: rootsByPost[postIds[0].toString()].map(toResponse) });
  }
  // Otherwise, return a map of postId -> comments
  const result: Record<string, any[]> = {};
  for (const id of postIds) {
    result[id.toString()] = rootsByPost[id.toString()].map(toResponse);
  }
  return NextResponse.json({ commentsByPost: result });
}

// POST /api/comments
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { postId, userId, content, parentId, imageURL } = body; // Destructure imageURL here

  if (!postId || !userId || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { db } = await connectToDatabase();
  const commentsCollection = db.collection<Comment>("comments");
  const postsCollection = db.collection("posts");
  const notificationsCollection = db.collection("notifications");
  const now = new Date();

  const result = await commentsCollection.insertOne({
    postId: new ObjectId(postId),
    userId: new ObjectId(userId),
    content,
    parentId: parentId ? new ObjectId(parentId) : null,
    imageURL: imageURL || null, // Include imageURL, defaulting to null if not provided
    createdAt: now,
  });

  // Create notification for post owner if not commenting own post
  const post = await postsCollection.findOne({ _id: new ObjectId(postId) });
  if (post && post.userId && post.userId.toString() !== userId) {
    const fromUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    await notificationsCollection.insertOne({
      userId: post.userId,
      type: "comment",
      fromUser: {
        name: fromUser?.username || "",
        avatar: fromUser?.profilePic || "",
        _id: fromUser?._id,
      },
      message: `${fromUser?.username || "Someone"} commented on your post`,
      link: `/post/${post._id?.toString()}`,
      read: false,
      createdAt: new Date(),
    });
  }

  return NextResponse.json({ success: true, commentId: result.insertedId.toString() });
}