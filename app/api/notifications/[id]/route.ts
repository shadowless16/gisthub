import { NextResponse } from "next/server"
import Notification from "@/lib/models/Notification"
import dbConnect from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function PATCH(req, { params }) {
  await dbConnect()
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { id } = params
  const { read } = await req.json()
  const notif = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { $set: { read } },
    { new: true }
  )
  if (!notif) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(notif)
}
