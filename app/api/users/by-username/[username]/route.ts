
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import mongoose from "mongoose";
import type { Model } from "mongoose";
let User: Model<any>;
try {
  User = mongoose.models.User || require("@/lib/models/User").default || require("@/lib/models/User");
} catch (e) {
  User = require("@/lib/models/User").default || require("@/lib/models/User");
}


export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  await dbConnect();
  const { username } = params;
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }
  try {
    const user = await User.findOne({ username }).select("-password");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[by-username] API error:", error);
    return NextResponse.json({ error: "Server error", details: (error as any)?.message || error }, { status: 500 });
  }
}
