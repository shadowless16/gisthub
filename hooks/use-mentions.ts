import { useState, useEffect } from 'react';
import { User } from '@/types/user';

export const useMentions = () => {
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!mentionQuery || mentionQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(mentionQuery)}`);
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error('Error fetching mention suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [mentionQuery]);

  return {
    suggestions,
    loading,
    setMentionQuery,
    clearSuggestions: () => setSuggestions([])
  };
};
