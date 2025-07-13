import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const feedback = {
      name,
      email,
      message,
      createdAt: new Date(),
    };
    await db.collection("feedback").insertOne(feedback);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }
}
