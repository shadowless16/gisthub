"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { Story } from "@/types/story";


interface StoriesContextType {
  stories: Story[];
  loading: boolean;
  error: string | null;
  refreshStories: () => Promise<void>;
}

const StoriesContext = createContext<StoriesContextType | undefined>(undefined);

export const StoriesProvider = ({ children }: { children: React.ReactNode }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const response = (await apiClient.getStories()) as { stories?: Story[] };
      setStories(response.stories || []);
      setError(null);
    } catch (err: any) {
      setStories([]);
      setError(err?.message || "Failed to load stories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  return (
    <StoriesContext.Provider value={{ stories, loading, error, refreshStories: fetchStories }}>
      {children}
    </StoriesContext.Provider>
  );
};

export const useStories = () => {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error("useStories must be used within a StoriesProvider");
  return ctx;
};
