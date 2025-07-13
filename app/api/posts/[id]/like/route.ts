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

    const { id } = params;
    // Cleaned up: removed debug logs

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const postsCollection = db.collection<Post>("posts");

    // Use classic $addToSet/$pull logic for like/unlike
    const currentUserObjectId = new ObjectId(currentUser.userId);
    const filter = { _id: new ObjectId(id) };
    // Check if the post is visible to the backend before update
    const foundDoc = await postsCollection.findOne(filter);
    if (!foundDoc) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    // Ensure all likeId values are ObjectId for comparison
    const likesArray = Array.isArray(foundDoc.likes) ? foundDoc.likes.map((id: any) => new ObjectId(id)) : [];
    const hasLiked = likesArray.some((likeId: ObjectId) => likeId.equals(currentUserObjectId));
    let update;
    if (hasLiked) {
      update = { $pull: { likes: currentUserObjectId } };
    } else {
      update = { $addToSet: { likes: currentUserObjectId } };
    }
    const updateResult = await postsCollection.findOneAndUpdate(
      filter,
      update,
      { returnDocument: "after" }
    );
    let updatedDoc = (updateResult as any)?.value;
    // Fallback: if update failed, re-query the post and return its state
    if (!updatedDoc) {
      updatedDoc = await postsCollection.findOne(filter);
      if (!updatedDoc) {
        return NextResponse.json({ error: "Post not found after update" }, { status: 404 });
      }
    }
    const updatedLikes = Array.isArray(updatedDoc.likes) ? updatedDoc.likes.map((id: any) => new ObjectId(id)) : [];
    const isLiked = updatedLikes.some((likeId: ObjectId) => likeId.equals(currentUserObjectId));
    return NextResponse.json({
      message: isLiked ? "Post liked successfully" : "Post unliked successfully",
      isLiked,
      likesCount: updatedLikes.length,
    });
  } catch (error) {
    console.error("Like/unlike post error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
