// hooks/use-mentions.ts
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import type { UserSearchResult } from "@/types/posts"; // Updated import path

export const useMentions = (textareaRef: React.RefObject<HTMLTextAreaElement>) => {
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const { toast } = useToast();

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const response = await apiClient.getUsersBySearch(query) as { results: UserSearchResult[] };
      setSuggestions(response.results);
      setShowSuggestions(response.results.length > 0);
      setSelectedIndex(0);
    } catch (error) {
      toast({
        title: "Error fetching users",
        description: error instanceof Error ? error.message : "Failed to fetch user suggestions.",
        variant: "destructive",
      });
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [toast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value, selectionStart } = e.target;
    let newSearchTerm: string | null = null;
    let newMentionStartIndex = -1;

    const textBeforeCursor = value.substring(0, selectionStart);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const potentialMention = textBeforeCursor.substring(lastAtIndex + 1);
      const usernameMatch = potentialMention.match(/^([a-zA-Z0-9_]*)$/);

      if (usernameMatch && usernameMatch[1] !== undefined) {
        newSearchTerm = usernameMatch[1];
        newMentionStartIndex = lastAtIndex;
      }
    }

    setSearchTerm(newSearchTerm);
    setMentionStartIndex(newMentionStartIndex);

    if (newSearchTerm) {
      fetchSuggestions(newSearchTerm);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [fetchSuggestions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestions.length > 0) {
        e.preventDefault();
        const selectedUsername = suggestions[selectedIndex].username;
        const textarea = textareaRef.current;
        if (textarea && searchTerm !== null && mentionStartIndex !== -1) {
          const start = textarea.value.substring(0, mentionStartIndex);
          const end = textarea.value.substring(mentionStartIndex + 1 + searchTerm.length);
          const newValue = `${start}@${selectedUsername} ${end}`;
          textarea.value = newValue;
          const newCursorPos = start.length + 1 + selectedUsername.length + 1;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          const event = new Event('input', { bubbles: true });
          textarea.dispatchEvent(event);
        }
        setShowSuggestions(false);
        setSearchTerm(null);
        setSuggestions([]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSearchTerm(null);
      setSuggestions([]);
    }
  }, [showSuggestions, suggestions, selectedIndex, searchTerm, mentionStartIndex, textareaRef]);

  const handleSelectSuggestion = useCallback((username: string) => {
    const textarea = textareaRef.current;
    if (textarea && searchTerm !== null && mentionStartIndex !== -1) {
      const start = textarea.value.substring(0, mentionStartIndex);
      const end = textarea.value.substring(mentionStartIndex + 1 + searchTerm.length);
      const newValue = `${start}@${username} ${end}`;
      textarea.value = newValue;
      const newCursorPos = start.length + 1 + username.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
    setShowSuggestions(false);
    setSearchTerm(null);
    setSuggestions([]);
  }, [searchTerm, mentionStartIndex, textareaRef]);

  return {
    searchTerm,
    suggestions,
    showSuggestions,
    selectedIndex,
    handleInputChange,
    handleKeyDown,
    handleSelectSuggestion,
    setShowSuggestions
  };
};