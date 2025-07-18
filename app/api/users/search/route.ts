import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { sanitizeUser } from "@/lib/models/User"
import { ObjectId } from "mongodb"

// Use a plain object type for users in MongoDB driver
// You may want to replace 'any' with your actual User type
export type User = any

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const usersCollection = db.collection<User>("users")

    // Get search query from URL
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()
    const usernamesParam = searchParams.get("usernames")

    if (usernamesParam) {
      // Bulk lookup by usernames (for tagging extraction)
      const usernames = usernamesParam.split(",").map(u => u.trim()).filter(Boolean)
      if (usernames.length === 0) {
        return NextResponse.json({ results: [] })
      }
      // Added case-insensitive search for usernames
      const users = await usersCollection.find({ username: { $in: usernames.map(u => new RegExp(`^${u}$`, 'i')) } }).toArray()
      return NextResponse.json({ results: users.map(sanitizeUser) })
    }

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Case-insensitive search by username, firstName, or lastName
    const users = await usersCollection
      .find({
        $or: [
          { username: { $regex: q, $options: "i" } },
          { firstName: { $regex: q, $options: "i" } },
          { lastName: { $regex: q, $options: "i" } }
        ]
      })
      .limit(10)
      .toArray()

    return NextResponse.json({ results: users.map(sanitizeUser) })
  } catch (error) {
    console.error("User search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}