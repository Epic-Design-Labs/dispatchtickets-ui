import { NextRequest } from 'next/server';

// This route handles magic link verification from custom verification URLs
// Stackbe sends users here with ?token=xxx&appId=xxx
// We redirect to Stackbe's verify endpoint which then redirects back to /auth/callback

const STACKBE_APP_ID = 'cmjcbidrx0001n13ye2b7pryh';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const appId = searchParams.get('appId') || STACKBE_APP_ID;

  if (!token) {
    // No token - redirect to login
    return Response.redirect(new URL('/login', request.url));
  }

  // Redirect to Stackbe's verify endpoint
  // redirect=true tells Stackbe to redirect back to our callback URL after verification
  const verifyUrl = `https://api.stackbe.io/v1/apps/${appId}/auth/verify?token=${token}&redirect=true`;

  return Response.redirect(verifyUrl);
}
