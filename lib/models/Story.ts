import type { ObjectId } from "mongodb"


export interface Story {
  _id?: ObjectId
  userId: ObjectId
  imageUrl?: string
  text?: string
  createdAt: Date
  expiresAt: Date
}


export interface StoryResponse {
  _id: string
  userId: string
  imageUrl?: string
  text?: string
  createdAt: string
  expiresAt: string
}

export function sanitizeStory(story: Story): StoryResponse {
  return {
    _id: story._id?.toString() || "",
    userId: story.userId.toString(),
    imageUrl: story.imageUrl,
    text: story.text,
    createdAt: story.createdAt.toISOString(),
    expiresAt: story.expiresAt.toISOString(),
  }
}
