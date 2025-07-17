// C:/Users/Ak David/Downloads/gisthub-social-platform/types/story.ts
// Or wherever your central types file is located.
export interface Story {
  _id: string;
  userId: string;
  imageUrl?: string; // Corrected: ensure it's 'imageUrl' (lowercase 'u')
  text?: string;
  caption?: string;
  backgroundColor?: string;
  textColor?: string;
  createdAt: string;
  expiresAt: string; // Ensure this is present
  user?: {
    username: string;
    profilePic?: string;
  };
  views: number; // Ensure this is present
  likes: number; // Ensure this is present
  replies: number; // Ensure this is present
  shares: number; // Ensure this is present
}