// app/api/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { type Comment, sanitizeComment } from "@/lib/models/Comment";

// --- START CLOUDINARY IMPORTS & CONFIG ---
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
// --- END CLOUDINARY IMPORTS & CONFIG ---


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

  const comments = await commentsCollection.find({ postId: { $in: postIds } }).sort({ createdAt: 1 }).toArray();
  const userIds = [...new Set(comments.map(c => c.userId.toString()))];
  const users = await usersCollection.find({ _id: { $in: userIds.map(id => new ObjectId(id)) } }).toArray();
  const userMap = Object.fromEntries(users.map(u => [u._id.toString(), { username: u.username, profilePic: u.profilePic }]));

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
  if (postIds.length === 1) {
    return NextResponse.json({ comments: rootsByPost[postIds[0].toString()].map(toResponse) });
  }
  const result: Record<string, any[]> = {};
  for (const id of postIds) {
    result[id.toString()] = rootsByPost[id.toString()].map(toResponse);
  }
  return NextResponse.json({ commentsByPost: result });
}

// POST /api/comments
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const postId = formData.get("postId")?.toString();
    const userId = formData.get("userId")?.toString();
    const content = formData.get("content")?.toString();
    const parentId = formData.get("parentId")?.toString() || null;

    if (!postId || !userId || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const commentsCollection = db.collection<Comment>("comments");
    const postsCollection = db.collection("posts");
    const notificationsCollection = db.collection("notifications");
    const now = new Date();

    let uploadedImageURL: string | null = null;

    if (imageFile) {
      try {
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const uploadResult = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'gisthub_comments_uploads' },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                return reject(error);
              }
              resolve(result);
            }
          ).end(buffer);
        });
        if (!uploadResult || !uploadResult.secure_url) {
          console.error('Cloudinary upload failed: No URL returned', uploadResult);
          return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
        }
        uploadedImageURL = uploadResult.secure_url;
      } catch (err) {
        console.error('Cloudinary upload error:', err);
        return NextResponse.json({ error: 'Image upload failed', details: (err as any).message || 'Unknown error' }, { status: 500 });
      }
    }

    const result = await commentsCollection.insertOne({
      postId: new ObjectId(postId),
      userId: new ObjectId(userId),
      content,
      parentId: parentId ? new ObjectId(parentId) : null,
      imageURL: uploadedImageURL, // This will store the URL from Cloudinary
      createdAt: now,
    });

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

    return NextResponse.json({ success: true, commentId: result.insertedId.toString(), imageURL: uploadedImageURL });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Internal server error", details: (error as any).message || "Unknown error" }, { status: 500 });
  }
}