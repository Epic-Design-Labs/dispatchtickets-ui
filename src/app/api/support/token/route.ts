import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';
const DISPATCH_API_KEY = process.env.DISPATCH_API_KEY;
const DISPATCH_SUPPORT_BRAND_ID = process.env.DISPATCH_SUPPORT_BRAND_ID;

export async function GET(request: NextRequest) {
  // Check configuration
  if (!DISPATCH_API_KEY || !DISPATCH_SUPPORT_BRAND_ID) {
    console.error('Support portal not configured: missing DISPATCH_API_KEY or DISPATCH_SUPPORT_BRAND_ID');
    return NextResponse.json(
      { error: 'Support portal not configured' },
      { status: 500 }
    );
  }

  // Get session token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const sessionToken = authHeader.slice(7);

  try {
    // Validate session and get user info
    const sessionResponse = await fetch(`${API_URL}/auth/session`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!sessionResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const sessionData = await sessionResponse.json();

    if (!sessionData.valid || !sessionData.email) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Generate portal token for the support brand
    const portalResponse = await fetch(
      `${API_URL}/brands/${DISPATCH_SUPPORT_BRAND_ID}/portal/token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DISPATCH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: sessionData.email,
          name: sessionData.firstName && sessionData.lastName
            ? `${sessionData.firstName} ${sessionData.lastName}`.trim()
            : sessionData.email.split('@')[0],
        }),
      }
    );

    if (!portalResponse.ok) {
      const error = await portalResponse.text();
      console.error('Portal token generation failed:', error);
      return NextResponse.json(
        { error: 'Failed to generate support token' },
        { status: 500 }
      );
    }

    const portalData = await portalResponse.json();

    // Return: { token, expiresAt, customerId, email, name }
    return NextResponse.json(portalData);
  } catch (error) {
    console.error('Support token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
