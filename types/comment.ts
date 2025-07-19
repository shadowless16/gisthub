export interface CommentType {
  _id: string;
  user?: {
    username: string;
    profilePic?: string;
  };
  content: string;
  imageURL?: string;
  createdAt: string;
  replies?: CommentType[];
}
