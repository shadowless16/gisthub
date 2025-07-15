// app/api/upload-image/route.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import path from "path"
import fs from "fs/promises" // Using fs.promises for async/await

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
// Define the upload directory. process.cwd() is the current working directory (project root).
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "profile_pics")

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    // Get the file using the key 'profileImage' that the frontend sends
    const file = formData.get("profileImage") as File | null

    // 1. Basic File Existence Check
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // 2. File Type Validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, GIF, WebP are allowed." }, { status: 400 })
    }

    // 3. File Size Validation
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `File too large. Max size is ${MAX_SIZE / (1024 * 1024)}MB.` }, { status: 400 })
    }

    // 4. Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true })

    // 5. Generate unique filename to prevent conflicts and ensure clean URLs
    const ext = path.extname(file.name) || ".jpg" // Get extension, default to .jpg if none
    // Sanitize base name: replace non-alphanumeric/hyphen/underscore with underscore
    const base = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_")
    const filename = `${base}_${Date.now()}${ext}` // Combine sanitized base, timestamp, and extension
    const filePath = path.join(UPLOAD_DIR, filename)

    // 6. Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 7. Write file to disk
    await fs.writeFile(filePath, buffer)

    // 8. Return public URL
    // The URL will be relative to your public directory, accessible via your domain
    const imageUrl = `/uploads/profile_pics/${filename}`
    return NextResponse.json({ imageUrl })

  } catch (err: any) {
    console.error("File upload error:", err); // Log the detailed error on the server
    return NextResponse.json({ error: err?.message || "Upload failed due to an internal server error." }, { status: 500 })
  }
}