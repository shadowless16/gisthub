import { writeFile } from "fs/promises"
import path from "path"
import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { type User, sanitizeUser } from "@/lib/models/User"
import { ObjectId } from "mongodb"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const usersCollection = db.collection<User>("users")

    // Parse form data
    const formData = await request.formData()
    const username = formData.get("username") as string | null
    const bio = formData.get("bio") as string | null
    let profilePicUrl: string | undefined

    // Handle profile picture upload
    const file = formData.get("profilePic") as File | null
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const ext = path.extname(file.name) || ".png"
      const fileName = `user_${id}_${Date.now()}${ext}`
      const uploadPath = path.join(process.cwd(), "public", "uploads", fileName)
      await writeFile(uploadPath, buffer)
      profilePicUrl = `/uploads/${fileName}`
    }

    // Build update object
    const update: any = {}
    if (username) update.username = username
    if (bio !== null) update.bio = bio
    if (profilePicUrl) update.profilePic = profilePicUrl

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    )

    if (!result.value) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: sanitizeUser(result.value) })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const usersCollection = db.collection<User>("users")

    const user = await usersCollection.findOne({ _id: new ObjectId(id) })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: sanitizeUser(user),
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}