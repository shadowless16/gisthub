// app/api/admin/posts/route.ts
import { NextResponse } from 'next/server';
import { getPosts /*, createPost, updatePost, deletePost*/ } from '@/lib/api/posts'; // Keep other imports if you're using them

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const range = JSON.parse(searchParams.get('range') || '[0,9]');
  const filter = JSON.parse(searchParams.get('filter') || '{}');
  const sort = JSON.parse(searchParams.get('sort') || '["id","ASC"]');

  try {
    let posts = await getPosts();

    // Apply filtering (basic example, extend as needed)
    if (filter.q) {
      const searchTerm = filter.q.toLowerCase();
      posts = posts.filter(post =>
        Object.values(post).some(value =>
          String(value).toLowerCase().includes(searchTerm)
        )
      );
    }

    // Apply sorting
    posts.sort((a, b) => {
      const [field, order] = sort;
      if (order === 'ASC') {
        return a[field] > b[field] ? 1 : -1;
      }
      return a[field] < b[field] ? 1 : -1;
    });

    const totalCount = posts.length; // Get the total count *before* pagination

    // Apply pagination
    const start = range[0];
    const end = range[1];
    const paginatedPosts = posts.slice(start, end + 1);

    // This is the CRUCIAL part: setting the X-Total-Count header and exposing it
    return new NextResponse(JSON.stringify(paginatedPosts), {
      status: 200,
      headers: {
        'X-Total-Count': totalCount.toString(),
        'Access-Control-Expose-Headers': 'X-Total-Count',
        'Content-Type': 'application/json', // <--- THIS IS THE CRITICAL LINE
      },
    });
  } catch (error) {
    // ... error handling ...
    return new NextResponse(
      JSON.stringify({ /* error details */ }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json', // <--- Also for error responses
        },
      }
    );
  }
}