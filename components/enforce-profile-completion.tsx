"use client"
import { useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"

/**
 * Redirects to onboarding if any required user fields are missing.
 * Place this component at the root of your app (e.g., in layout.tsx).
 */
export function EnforceProfileCompletion() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading || !user) return;
    const requiredFields = [
      'bio',
      'interests',
      'location',
      'profilePic',
      'branch'
    ];
    const missing = requiredFields.some(field => {
      if (field === 'interests') {
        return !Array.isArray(user.interests) || user.interests.length === 0;
      }
      const value = user[field as keyof typeof user];
      return !value || (typeof value === 'string' && value.trim() === '');
    });
    if (missing && window.location.pathname !== '/auth/setup-profile') {
      window.location.href = '/auth/setup-profile';
    }
  }, [user, loading]);

  return null;
}
