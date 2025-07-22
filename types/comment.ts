// types/comment.ts
export interface CommentType {
  _id: string;
  user?: {
    username: string;
    profilePic?: string;
  };
  content: string;
  createdAt: string;
  imageURL?: string; // Ensure this is present
  replies?: CommentType[];
  // Add any other comment properties if they exist, e.g., parentId, postId
  parentId?: string;
  postId?: string;
}