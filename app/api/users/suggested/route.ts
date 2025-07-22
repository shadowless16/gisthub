import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getAuthSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get current user using session data
    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(session.userId)
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get users that the current user is not following
    // Exclude the current user from suggestions
    const suggestedUsers = await db.collection("users")
      .find({
        _id: { 
          $nin: [
            new ObjectId(currentUser._id),
            ...(currentUser.following || []).map((id: string) => new ObjectId(id))
          ]
        }
      })
      .project({
        password: 0, // Exclude sensitive data
        email: 0
      })
      .limit(8)
      .toArray();

    return NextResponse.json({
      users: suggestedUsers
    });
    
  } catch (error) {
    console.error("[GET /api/users/suggested]", error);
    return NextResponse.json(
      { error: "Failed to fetch suggested users" },
      { status: 500 }
    );
  }
}
