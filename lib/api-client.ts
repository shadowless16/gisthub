
const API_BASE_URL = typeof window !== "undefined"
  ? window.location.origin
  : process.env.NODE_ENV === "production"
    ? "https://gisthubsocial.vercel.app"
    : "http://localhost:3000"

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  async getUserByUsername(username: string) {
    const response = await fetch(`${API_BASE_URL}/api/users/by-username/${username}`, {
      headers: this.getAuthHeaders(),
      credentials: "include",
    });
    return this.handleResponse(response);
  }
  async deletePost(postId: string) {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
      method: "DELETE",
      credentials: "include",
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to delete post")
    return response.json()
  }

  async updateUser(userId: string, data: { username?: string; bio?: string; profilePic?: File | null }) {
    let body: BodyInit;
    let headers: HeadersInit = {};
    let isForm = false;
    if (data.profilePic) {
      // Use FormData if uploading a file
      isForm = true;
      const formData = new FormData();
      if (data.username) formData.append("username", data.username);
      if (data.bio !== undefined) formData.append("bio", data.bio);
      formData.append("profilePic", data.profilePic);
      body = formData;
    } else {
      // Use JSON for simple updates
      body = JSON.stringify({
        ...(data.username !== undefined ? { username: data.username } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {})
      });
      headers["Content-Type"] = "application/json";
    }
    const token = localStorage.getItem("auth-token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
    headers["Accept"] = "application/json";
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}` , {
      method: "PATCH",
      headers,
      body,
      credentials: "include",
    });
    return this.handleResponse(response);
  }
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("auth-token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }

    return data
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
      credentials: "include",
    })

    const data = await this.handleResponse<any>(response) as any
    if (data.token) {
      localStorage.setItem("auth-token", data.token)
    }
    return data
  }

  async login(credentials: { identifier: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      credentials: "include",
    })

    const data = await this.handleResponse(response) as any
    if (data.token) {
      localStorage.setItem("auth-token", data.token)
    }
    return data
  }

  async logout() {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    })

    localStorage.removeItem("auth-token")
    return this.handleResponse(response)
  }

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: this.getAuthHeaders(),
      credentials: "include",
    })
    return this.handleResponse(response)
  }

  // Bulk fetch users by IDs
  async getUsersByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];
    const params = new URLSearchParams();
    ids.forEach(id => params.append('ids', id));
    const response = await fetch(`/api/users/bulk?${params.toString()}`, {
      headers: this.getAuthHeaders(),
      credentials: "include",
    });
    return this.handleResponse(response);
  }

  // User methods
  async getUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse(response)
  }

  async followUser(targetUserId: string) {
    const response = await fetch(`${API_BASE_URL}/api/users/follow`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ targetUserId }),
      credentials: "include",
    })
    return this.handleResponse(response)
  }

  // Post methods
  async getPosts(options: { includeAnonymous?: boolean; limit?: number; skip?: number } = {}) {
    const params = new URLSearchParams()
    if (options.includeAnonymous) params.append("includeAnonymous", "true")
    if (options.limit) params.append("limit", options.limit.toString())
    if (options.skip) params.append("skip", options.skip.toString())

    const response = await fetch(`${API_BASE_URL}/api/posts?${params}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse(response)
  }

  async createPost(postData: { content: string; imageURL?: string; isAnonymous?: boolean }) {
    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(postData),
      credentials: "include",
    })
    return this.handleResponse(response)
  }

  async likePost(postId: string) {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      credentials: "include",
    })
    return this.handleResponse(response)
  }

  async getUserPosts(userId: string, options: { limit?: number; skip?: number } = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.append("limit", options.limit.toString())
    if (options.skip) params.append("skip", options.skip.toString())

    const response = await fetch(`${API_BASE_URL}/api/posts/user/${userId}?${params}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse(response)
  }


  async getStories() {
    const response = await fetch(`/api/stories`, {
      headers: this.getAuthHeaders(),
      credentials: "include",
    })
    return this.handleResponse(response)
  }

  async createStory({ image, text }: { image?: File; text?: string }) {
    let response;
    if (image) {
      const formData = new FormData();
      formData.append("image", image);
      if (text) formData.append("text", text);
      const token = localStorage.getItem("auth-token");
      response = await fetch(`/api/stories`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
        credentials: "include",
      });
    } else {
      response = await fetch(`/api/stories`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ text }),
        credentials: "include",
      });
    }
    return this.handleResponse(response);
  }

  async deleteStory(storyId: string) {
    const response = await fetch(`/api/stories/${storyId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
      credentials: "include",
    })
    return this.handleResponse(response)
  }

  // Comment methods
  async getComments(postId: string) {
    const response = await fetch(`/api/comments?postId=${postId}`)
    return this.handleResponse(response)
  }

  async addComment({ postId, userId, content, parentId, imageFile }: { postId: string, userId: string, content: string, parentId?: string, imageFile?: File }) {
    let response: Response;
    if (imageFile) {
      const formData = new FormData();
      formData.append("postId", postId);
      formData.append("userId", userId);
      formData.append("content", content);
      if (parentId) formData.append("parentId", parentId);
      formData.append("image", imageFile);
      const token = localStorage.getItem("auth-token");
      response = await fetch(`/api/comments`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
        credentials: "include",
      });
    } else {
      response = await fetch(`/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId, content, parentId }),
        credentials: "include",
      });
    }
    return this.handleResponse(response);
  }
}

export const apiClient = new ApiClient()
