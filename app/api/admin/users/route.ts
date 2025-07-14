// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { getUsers, createUser, updateUser, deleteUser } from '@/lib/api/users'; // Ensure this path is correct for your 'lib/api/users.ts'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Parse query parameters sent by React-Admin's simpleRestProvider
  // These parameters control filtering, sorting, and pagination.
  const range = JSON.parse(searchParams.get('range') || '[0,9]');
  const filter = JSON.parse(searchParams.get('filter') || '{}');
  const sort = JSON.parse(searchParams.get('sort') || '["id","ASC"]');

  try {
    // 1. Fetch all users
    let users = await getUsers(); // Your function that fetches users from MongoDB

    // 2. Apply filtering
    // React-Admin's default filter for list views often uses a 'q' parameter for global search.
    if (filter.q) {
      const searchTerm = filter.q.toLowerCase();
      users = users.filter((user: any) =>
        // Iterate through user's values and check if any match the search term
        Object.values(user).some(value =>
          String(value).toLowerCase().includes(searchTerm)
        )
      );
    }
    // Add more specific filters if needed, e.g., if (filter.email) { ... }

    // 3. Apply sorting
    // 'sort' is an array like ["field", "order"], e.g., ["name", "ASC"]
    users.sort((a, b) => {
      const [field, order] = sort;
      if (order === 'ASC') {
        return a[field] > b[field] ? 1 : -1;
      }
      return a[field] < b[field] ? 1 : -1;
    });

    // 4. Get total count BEFORE pagination
    const totalCount = users.length;

    // 5. Apply pagination
    // 'range' is an array like [start, end], e.g., [0, 9] for the first 10 items
    const start = range[0];
    const end = range[1];
    const paginatedUsers = users.slice(start, end + 1);

    // 6. Return response with data and X-Total-Count header
    // The X-Total-Count header is CRITICAL for React-Admin to display pagination correctly.
    // Access-Control-Expose-Headers is necessary for the browser to allow React-Admin to read X-Total-Count.
    return new NextResponse(JSON.stringify(paginatedUsers), {
      status: 200,
      headers: {
        'X-Total-Count': totalCount.toString(), // Must be a string
        'Access-Control-Expose-Headers': 'X-Total-Count', // IMPORTANT! Expose custom headers for client-side access
        'Content-Type': 'application/json', // Ensure content type is set
      },
    });
  } catch (error) {
    console.error('Error in /api/admin/users GET:', error);
    // Return a more detailed error response for debugging
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500, // Internal Server Error
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const user = await createUser(data); // Your function to create a user
    return NextResponse.json(user, { status: 201 }); // 201 Created status
  } catch (error) {
    console.error('Error in /api/admin/users POST:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// React-Admin's simpleRestProvider for PUT and DELETE operations often puts the ID in the URL's query parameters.
// For example, PUT /api/admin/users?id=some_id
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id'); // Get ID from query parameters

    if (!id) {
      return new NextResponse(JSON.stringify({ error: 'ID is required for PUT operation' }), { status: 400 }); // Bad Request
    }

    const data = await request.json();
    // Pass the ID along with the rest of the data to your update function
    const user = await updateUser({ ...data, id });
    return NextResponse.json(user, { status: 200 }); // 200 OK
  } catch (error) {
    console.error('Error in /api/admin/users PUT:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id'); // Get ID from query parameters

    if (!id) {
      return new NextResponse(JSON.stringify({ error: 'ID is required for DELETE operation' }), { status: 400 }); // Bad Request
    }

    const result = await deleteUser(id); // Your function to delete a user
    return NextResponse.json(result, { status: 200 }); // 200 OK
  } catch (error) {
    console.error('Error in /api/admin/users DELETE:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}