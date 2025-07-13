import { NextResponse } from "next/server"
import Notification from "@/lib/models/Notification"
import dbConnect from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function PATCH() {
  await dbConnect()
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  await Notification.updateMany({ userId, read: false }, { $set: { read: true } })
  return NextResponse.json({ success: true })
}
