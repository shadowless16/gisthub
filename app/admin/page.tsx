// app/admin/page.tsx
"use client";
import { Admin, Resource } from 'react-admin';
import simpleRestProvider from 'ra-data-simple-rest';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Import your list components
import { UserList } from './users/UserList';
import { PostList } from './posts/PostList';

// Dummy authentication check (replace with real logic)
function useAuth() {
  const isAuthenticated = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
  return isAuthenticated;
}

export default function AdminPage() {
  const router = useRouter();
  const isAuthenticated = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, router]);

  if (loading) {
    return <div>Loading admin dashboard...</div>;
  }

  if (!isAuthenticated) {
    return <div>Redirecting to login...</div>;
  }

  try {
    return (
      <Admin dataProvider={simpleRestProvider('/api/admin')}>
        {/* Pass the list component to the Resource */}
        <Resource name="users" list={UserList} />
        <Resource name="posts" list={PostList} />
      </Admin>
    );
  } catch (err: any) {
    setError(err.message || 'Unknown error');
    return <div>Error loading admin dashboard: {error}</div>;
  }
}