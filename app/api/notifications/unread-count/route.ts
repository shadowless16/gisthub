
import { NextResponse } from "next/server";
import Notification from "@/lib/models/Notification";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";

import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || !user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();
  // Notification model expects userId as string
  const count = await Notification.countDocuments({ userId: user.userId, read: false });
  return NextResponse.json({ count });
}
