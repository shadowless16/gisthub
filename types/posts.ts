// types/post.ts
export interface Post {
  _id: string;
  userId: string;
  content: string;
  imageURL?: string;
  isAnonymous: boolean;
  createdAt: string;
  user?: {
    username: string;
    profilePic?: string;
  };
  likes: string[];
  likesCount: number;
  taggedUserIds?: string[];
}

export interface UserSearchResult {
  _id: string;
  username: string;
  profilePic?: string;
}