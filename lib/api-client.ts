// lib/api-client.ts

const API_BASE_URL = typeof window !== "undefined"
  ? window.location.origin
  : process.env.NODE_ENV === "production"
  ? "https://gisthubsocial.vercel.app"
  : "http://localhost:3000";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Interface for UserSearchResult - to match what your API returns for user searches
interface UserSearchResult {
  _id: string;
  username: string;
  profilePic?: string;
}

class ApiClient {
  // Fetch a single post by ID
  async getPost(postId: string) {
    const response = await fetch(`${API_BASE_URL}/api/posts?id=${postId}`, {
      headers: this.getAuthHeaders('none'),
      credentials: "include",
    });
    const data = await this.handleResponse<any>(response);
    return data.post;
  }
  // Renamed getPost to getPostById for clarity and consistency
  async getPostById(postId: string) {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
      headers: this.getAuthHeaders('none'),
      credentials: "include",
    });
    const data = await this.handleResponse<any>(response);
    return data; // Assuming data itself contains the post object, e.g., { post: {...} }
  }


  private getAuthHeaders(contentType: 'json' | 'formData' | 'none' = 'json'): HeadersInit {
    const token = localStorage.getItem("auth-token");
    const headers: HeadersInit = {};

    if (contentType === 'json') {
      headers["Content-Type"] = "application/json";
    }
    // For formData, browser sets Content-Type, so we don't add it here.
    // For 'none', no content type is added.

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
      // Check if data.error exists, otherwise use a generic message
      throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
    }

    // Assuming your successful responses also contain a 'results' or 'data' field
    // Adjust this based on your actual API response structure for success
    return data;
  }

  // Auth methods
  async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    branch: string;
    isAlumni: boolean;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: this.getAuthHeaders('json'),
      body: JSON.stringify(userData),
      credentials: "include",
    });
    const data = await this.handleResponse<any>(response);
    if (data.token) {
      localStorage.setItem("auth-token", data.token);
    }
    return data;
  }

  async login(credentials: { identifier: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: this.getAuthHeaders('json'),
      body: JSON.stringify(credentials),
      credentials: "include",
    });
    const data = await this.handleResponse<any>(response);
    if (data.token) {
      localStorage.setItem("auth-token", data.token);
    }
    return data;
  }

  async logout() {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: this.getAuthHeaders('none'), // No specific content type needed for logout POST
    });
    localStorage.removeItem("auth-token");
    return this.handleResponse(response);
  }

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: this.getAuthHeaders('none'),
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  // User methods
  async getUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      headers: this.getAuthHeaders('none'),
    });
    return this.handleResponse(response);
  }

  async getUserByUsername(username: string) {
    const response = await fetch(`${API_BASE_URL}/api/users/by-username/${username}`, {
      headers: this.getAuthHeaders('none'),
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  // Bulk fetch users by IDs
  async getUsersByIds(ids: string[]): Promise<{ results: UserSearchResult[] }> {
    if (!ids || ids.length === 0) return { results: [] };
    const params = new URLSearchParams();
    ids.forEach(id => params.append('ids', id));
    // Assuming your backend supports GET with multiple 'ids' query params
    const response = await fetch(`${API_BASE_URL}/api/users/bulk?${params.toString()}`, {
      headers: this.getAuthHeaders('none'),
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  // Search users by query string (for mentions/autocomplete)
  async getUsersBySearch(query: string): Promise<{ results: UserSearchResult[] }> {
    const params = new URLSearchParams();
    params.append('q', query);
    // This is a GET request, so no 'Content-Type' header for JSON body
    const response = await fetch(`${API_BASE_URL}/api/users/search?${params.toString()}`, {
      headers: this.getAuthHeaders('none'), // Only Authorization needed
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  // Bulk fetch users by usernames (for tagging extraction)
  // This method now correctly sends a POST request with JSON body
  async getUsersByUsernames(usernames: string[]): Promise<{ results: UserSearchResult[] }> {
    if (!usernames || usernames.length === 0) return { results: [] };

    const response = await fetch(`${API_BASE_URL}/api/users/by-usernames`, {
      method: "POST", // Changed to POST
      headers: this.getAuthHeaders('json'), // Ensure Content-Type: application/json
      body: JSON.stringify({ usernames }), // Send as JSON body
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  async uploadImage(imageFile: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);
    // No 'Content-Type' header when using FormData; browser sets it.
    // Just need Authorization header.
    const token = localStorage.getItem("auth-token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: headers, // Pass headers directly
    });
    return this.handleResponse(response);
  }

  async updateUser(userId: string, data: { username?: string; bio?: string; profilePic?: File | null }) {
    let profilePicUrl: string | null | undefined;
    if (data.profilePic instanceof File) {
      const uploadResult = await this.uploadImage(data.profilePic);
      profilePicUrl = uploadResult.url;
    } else if (data.profilePic === null) {
      profilePicUrl = null;
    }

    const payload: { username?: string; bio?: string; profilePic?: string | null } = {
      ...(data.username !== undefined ? { username: data.username } : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
    };
    if (profilePicUrl !== undefined) {
      payload.profilePic = profilePicUrl;
    }

    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders('json'),
      body: JSON.stringify(payload),
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  async followUser(targetUserId: string) {
    const response = await fetch(`${API_BASE_URL}/api/users/follow`, {
      method: "POST",
      headers: this.getAuthHeaders('json'),
      body: JSON.stringify({ targetUserId }),
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  // Post methods
  async getPosts(options: { includeAnonymous?: boolean; limit?: number; skip?: number } = {}) {
    const params = new URLSearchParams();
    if (options.includeAnonymous) params.append("includeAnonymous", "true");
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.skip) params.append("skip", options.skip.toString());

    const response = await fetch(`${API_BASE_URL}/api/posts?${params}`, {
      headers: this.getAuthHeaders('none'),
    });
    return this.handleResponse(response);
  }

  async createPost(postData: { content: string; imageFile?: File; videoFile?: File; isAnonymous?: boolean; taggedUserIds?: string[] }) {
    const formData = new FormData();
    formData.append('content', postData.content);

    if (postData.imageFile) {
      formData.append('image', postData.imageFile);
    }
    if (postData.videoFile) {
      formData.append('video', postData.videoFile);
    }
    if (postData.isAnonymous !== undefined) {
      formData.append('isAnonymous', String(postData.isAnonymous));
    }
    if (postData.taggedUserIds && postData.taggedUserIds.length > 0) {
      // Send as a JSON string if your backend expects it this way for FormData
      formData.append('taggedUserIds', JSON.stringify(postData.taggedUserIds));
    }

    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: this.getAuthHeaders('formData'), // Only Authorization needed, no Content-Type
    });
    return this.handleResponse(response);
  }

  async deletePost(postId: string) {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
      method: "DELETE",
      credentials: "include",
      headers: this.getAuthHeaders('none'),
    });
    if (!response.ok) throw new Error("Failed to delete post");
    return response.json(); // Assuming delete returns a simple success object
  }

  async likePost(postId: string) {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
      method: "POST",
      headers: this.getAuthHeaders('json'),
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  async getUserPosts(userId: string, options: { limit?: number; skip?: number } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.skip) params.append("skip", options.skip.toString());

    const response = await fetch(`${API_BASE_URL}/api/posts/user/${userId}?${params}`, {
      headers: this.getAuthHeaders('none'),
    });
    return this.handleResponse(response);
  }

  // Story methods
  async getStories() {
    const response = await fetch(`${API_BASE_URL}/api/stories`, { // Added API_BASE_URL for consistency
      headers: this.getAuthHeaders('none'),
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  async createStory({ image, text }: { image?: File; text?: string }) {
    const formData = new FormData();
    if (image) {
      formData.append('image', image);
    }
    if (text) {
      formData.append('text', text);
    }

    const response = await fetch(`${API_BASE_URL}/api/stories`, { // Added API_BASE_URL for consistency
      method: "POST",
      body: formData,
      headers: this.getAuthHeaders('formData'), // Only Authorization needed, no Content-Type
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  async deleteStory(storyId: string) {
    const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}`, { // Added API_BASE_URL for consistency
      method: "DELETE",
      headers: this.getAuthHeaders('none'),
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  // Comment methods
  async getCommentsBatch(postIds: string) { // Assuming postIds is comma-separated string for GET
    const response = await fetch(`${API_BASE_URL}/api/comments?postIds=${postIds}`, { // Added API_BASE_URL for consistency
      headers: this.getAuthHeaders('none'),
    });
    return this.handleResponse(response);
  }

  // Added getComments for single post page
  async getComments(postId: string, options: { limit?: number; skip?: number } = {}) {
    const params = new URLSearchParams();
    params.append('postId', postId);
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.skip) params.append("skip", options.skip.toString());

    const response = await fetch(`${API_BASE_URL}/api/comments?${params}`, {
      headers: this.getAuthHeaders('none'),
    });
    return this.handleResponse(response);
  }

  // Updated addComment to support image upload
  async addComment({ postId, userId, content, parentId, imageFile }: { postId: string, userId: string, content: string, parentId?: string, imageFile?: File }) {
    const formData = new FormData();
    formData.append('postId', postId);
    formData.append('userId', userId);
    formData.append('content', content);
    if (parentId) formData.append('parentId', parentId);
    if (imageFile) {
      formData.append('image', imageFile); // 'image' should match your backend's expected field name for file uploads
    }

    const response = await fetch(`${API_BASE_URL}/api/comments`, {
      method: "POST",
      body: formData, // Send as FormData
      credentials: "include",
      headers: this.getAuthHeaders('formData'), // Only Authorization needed, no Content-Type for FormData
    });
    return this.handleResponse(response);
  }
}

export const apiClient = new ApiClient();