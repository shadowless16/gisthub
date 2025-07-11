import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { db } = await connectToDatabase();
    const postsCollection = db.collection("posts");
    const post = await postsCollection.findOne({ _id: new ObjectId(params.id) });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    // Defensive: ensure both IDs are strings before comparing, and only compare once
    const postUserId = post.userId?.toString?.() || post.userId || "";
    const requestUserId = user?.userId?.toString?.() || user?.userId || "";
    if (!postUserId || !requestUserId || postUserId !== requestUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await postsCollection.deleteOne({ _id: new ObjectId(params.id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
