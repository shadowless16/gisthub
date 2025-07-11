import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { type Story, sanitizeStory } from "@/lib/models/Story"
import { type User } from "@/lib/models/User"

export async function GET(request: NextRequest) {
  try {
    // Assume user is authenticated and userId is available from session/cookie
    // For demo, get userId from query param (replace with real auth in prod)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }
    const { db } = await connectToDatabase()
    const usersCollection = db.collection<User>("users")
    const storiesCollection = db.collection<Story>("stories")

    // Get the list of users this user is following
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const followingIds = user.following || []
    if (!followingIds.length) {
      return NextResponse.json({ stories: [] })
    }
    // Get the latest story for each followed user (not expired)
    const now = new Date()
    const stories = await storiesCollection
      .aggregate([
        { $match: { userId: { $in: followingIds }, expiresAt: { $gt: now } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$userId", story: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$story" } },
      ])
      .toArray()
    return NextResponse.json({ stories: stories.map(sanitizeStory) })
  } catch (error) {
    console.error("Error fetching following stories:", error)
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 })
  }
}
