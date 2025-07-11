import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import type { User } from "@/lib/models/User"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { targetUserId } = await request.json()

    if (!targetUserId || !ObjectId.isValid(targetUserId)) {
      return NextResponse.json({ error: "Invalid target user ID" }, { status: 400 })
    }

    if (currentUser.userId === targetUserId) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const usersCollection = db.collection<User>("users")

    const currentUserDoc = await usersCollection.findOne({ _id: new ObjectId(currentUser.userId) })
    const targetUserDoc = await usersCollection.findOne({ _id: new ObjectId(targetUserId) })

    if (!currentUserDoc || !targetUserDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const targetObjectId = new ObjectId(targetUserId)
    const currentUserObjectId = new ObjectId(currentUser.userId)

    // Check if already following
    const isFollowing = currentUserDoc.following.some((id) => id.equals(targetObjectId))

    // Prevent unfollowing AkD
    const adminUser = await usersCollection.findOne({ username: "AkD" })
    if (adminUser && adminUser._id && targetUserId === adminUser._id.toString()) {
      return NextResponse.json({ error: "You cannot unfollow AkD." }, { status: 403 })
    }

    if (isFollowing) {
      // Unfollow: Remove from following and followers
      await usersCollection.updateOne({ _id: currentUserObjectId }, { $pull: { following: targetObjectId } })
      await usersCollection.updateOne({ _id: targetObjectId }, { $pull: { followers: currentUserObjectId } })

      return NextResponse.json({
        message: "Unfollowed successfully",
        isFollowing: false,
      })
    } else {
      // Follow: Add to following and followers
      await usersCollection.updateOne({ _id: currentUserObjectId }, { $addToSet: { following: targetObjectId } })
      await usersCollection.updateOne({ _id: targetObjectId }, { $addToSet: { followers: currentUserObjectId } })

      return NextResponse.json({
        message: "Followed successfully",
        isFollowing: true,
      })
    }
  } catch (error) {
    console.error("Follow/unfollow error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
