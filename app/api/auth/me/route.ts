
import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { getUserFromRequest, JWTPayload } from "@/lib/auth"
import UserModel, { sanitizeUser } from "@/lib/models/User"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  // Server-side verification of JWT
  const userPayload: JWTPayload | null = getUserFromRequest(request);

  if (!userPayload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userPayload.userId) });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
