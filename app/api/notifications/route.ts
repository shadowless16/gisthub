
import { connectToDatabase } from "@/lib/mongodb"
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"


export async function GET(request: NextRequest) {
  // TODO: Replace with real authentication/session logic
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { db } = await connectToDatabase()
  const notifications = await db
    .collection("notifications")
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray()
  return NextResponse.json(notifications)
}
