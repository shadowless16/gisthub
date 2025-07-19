// app/api/posts/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } // Use 'id' here
) {
  const start = Date.now();
  try {
    const { id } = params; // Extract 'id' directly from path parameters

    if (!id) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const postsCollection = db.collection("posts");
    const usersCollection = db.collection("users");

    const post = await postsCollection.findOne({ _id: new ObjectId(id) }); // Use 'id' here

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let userData = null;
    if (!post.isAnonymous && post.userId) {
      const user = await usersCollection.findOne({ _id: new ObjectId(post.userId) });
      if (user) {
        userData = {
          username: user.username,
          profilePic: user.profilePic,
        };
      }
    }

    const sanitizedPost = {
      ...post,
      user: userData
    };

    const duration = Date.now() - start;
    console.log(`[API LOG] /api/posts/${id} GET took ${duration}ms`);

    return NextResponse.json({ post: sanitizedPost });
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[API ERROR] /api/posts/[id] GET failed after ${duration}ms:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}