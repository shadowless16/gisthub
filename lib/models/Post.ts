import type { ObjectId } from "mongodb"

export interface Post {
  _id?: ObjectId
  userId: ObjectId
  content: string
  imageURL?: string
  videoURL?: string
  isAnonymous: boolean
  likes: ObjectId[]
  createdAt: Date
  taggedUserIds?: ObjectId[]
}

export interface PostResponse {
  _id: string
  userId: string
  content: string
  imageURL?: string
  videoURL?: string
  isAnonymous: boolean
  likes: string[]
  likesCount: number
  createdAt: string
  user?: {
    username: string
    profilePic?: string
  }
  taggedUserIds?: string[]
}

export function sanitizePost(post: Post, user?: { username: string; profilePic?: string }): PostResponse {
  return {
    _id: post._id?.toString() || "",
    userId: post.userId.toString(),
    content: post.content,
    imageURL: post.imageURL,
    videoURL: post.videoURL,
    isAnonymous: post.isAnonymous,
    likes: post.likes.map((id) => id.toString()),
    likesCount: post.likes.length,
    createdAt: post.createdAt.toISOString(),
    user: post.isAnonymous ? undefined : user,
    taggedUserIds: post.taggedUserIds ? post.taggedUserIds.map((id) => id.toString()) : undefined,
  }
}
