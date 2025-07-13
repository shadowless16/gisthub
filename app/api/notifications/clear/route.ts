import { NextResponse } from "next/server"
import Notification from "@/lib/models/Notification"
import dbConnect from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function DELETE() {
  await dbConnect()
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  await Notification.deleteMany({ userId })
  return NextResponse.json({ success: true })
}
