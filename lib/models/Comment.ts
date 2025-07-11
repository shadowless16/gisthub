import type { ObjectId } from "mongodb"

export interface Comment {
  _id?: ObjectId
  postId: ObjectId
  userId: ObjectId
  content: string
  parentId?: ObjectId | null
  createdAt: Date
}

export interface CommentResponse {
  _id: string
  postId: string
  userId: string
  content: string
  parentId?: string | null
  createdAt: string
  user?: {
    username: string
    profilePic?: string
  }
  replies?: CommentResponse[]
}

export function sanitizeComment(comment: Comment, user?: { username: string; profilePic?: string }, replies?: CommentResponse[]): CommentResponse {
  return {
    _id: comment._id?.toString() || "",
    postId: comment.postId.toString(),
    userId: comment.userId.toString(),
    content: comment.content,
    parentId: comment.parentId ? comment.parentId.toString() : null,
    createdAt: comment.createdAt.toISOString(),
    user,
    replies,
  }
}
