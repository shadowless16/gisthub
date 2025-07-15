import { writeFile } from "fs/promises"
import path from "path"
import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import UserModel, { sanitizeUser } from "@/lib/models/User"
// Use a plain object type for users in MongoDB driver
type User = any
import { ObjectId } from "mongodb"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log("[PATCH USER] Looking for user with _id:", id)
    if (!ObjectId.isValid(id)) {
      console.log("[PATCH USER] Invalid user ID:", id)
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const usersCollection = db.collection<User>("users")
    const testUser = await usersCollection.findOne({ _id: new ObjectId(id) })
    console.log("[PATCH USER] User found before update?", !!testUser, testUser)

    // Cleaned: No debug logs for headers or raw body
    const rawText = await request.clone().text()

    let body: any = {}
    let isFormData = false
    // Try to parse as FormData first (for file uploads)
    try {
      const formData = await request.formData()
      isFormData = true
      body = {}
      for (const [key, value] of formData.entries()) {
        body[key] = value
      }
      // Handle profilePic file upload
      if (formData.get("profilePic") instanceof File) {
        const file = formData.get("profilePic") as File
        if (file && file.size > 0) {
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const ext = path.extname(file.name) || ".png"
          const fileName = `user_${id}_${Date.now()}${ext}`
          const uploadPath = path.join(process.cwd(), "public", "uploads", fileName)
          await writeFile(uploadPath, buffer)
          body.profilePic = `/uploads/${fileName}`
        }
      }
    } catch {
      // If FormData fails, try JSON
      try {
        body = JSON.parse(rawText)
      } catch {
        return NextResponse.json({ error: "Invalid request body", debug: { rawText } }, { status: 400 })
      }
    }

    // Allow partial updates for both JSON and FormData
    // If you want to require all fields for onboarding, handle that in a separate onboarding endpoint.

    // Build update object
    const update: any = {}
    if (body.username !== undefined) update.username = body.username
    if (body.bio !== undefined) update.bio = body.bio
    if (body.profilePic !== undefined) update.profilePic = body.profilePic
    if (body.socialLinks !== undefined) update.socialLinks = body.socialLinks
    if (body.interests !== undefined) update.interests = body.interests
    if (body.location !== undefined) update.location = body.location
    console.log("[PATCH USER] Update object:", update)

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    )
    console.log("[PATCH USER] findOneAndUpdate result:", result)

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