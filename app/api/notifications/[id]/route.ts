
import { NextResponse, NextRequest } from "next/server";
import Notification from "@/lib/models/Notification";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(request);
  if (!user || !user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectToDatabase();
  const { id } = params;
  const { read } = await request.json();
  const notif = await Notification.findOneAndUpdate(
    { _id: id, userId: user.userId },
    { $set: { read } },
    { new: true }
  );
  if (!notif) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(notif);
}
