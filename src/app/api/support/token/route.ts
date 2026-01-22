import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';
const DISPATCH_API_KEY = process.env.DISPATCH_API_KEY;
const DISPATCH_SUPPORT_BRAND_ID = process.env.DISPATCH_SUPPORT_BRAND_ID;

export async function GET(request: NextRequest) {
  // Check configuration
  if (!DISPATCH_API_KEY || !DISPATCH_SUPPORT_BRAND_ID) {
    console.error('Support portal not configured:', {
      hasApiKey: !!DISPATCH_API_KEY,
      hasBrandId: !!DISPATCH_SUPPORT_BRAND_ID,
      brandId: DISPATCH_SUPPORT_BRAND_ID || 'not set',
    });
    return NextResponse.json(
      { error: 'Support portal not configured' },
      { status: 500 }
    );
  }

  console.log('Support portal request - brand:', DISPATCH_SUPPORT_BRAND_ID);

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
      const errorText = await portalResponse.text();
      console.error('Portal token generation failed:', {
        status: portalResponse.status,
        brandId: DISPATCH_SUPPORT_BRAND_ID,
        error: errorText,
      });

      // Parse error message for better user feedback
      let errorMessage = 'Failed to generate support token';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        // Use raw text if not JSON
        if (errorText) errorMessage = errorText;
      }

      return NextResponse.json(
        { error: errorMessage, status: portalResponse.status },
        { status: portalResponse.status }
      );
    }

    const portalData = await portalResponse.json();
    console.log('Support portal token generated for:', portalData.email);

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
