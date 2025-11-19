import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';

export async function GET(req: NextRequest) {
  try {
    // Check if key exists
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      return NextResponse.json({
        error: 'STRIPE_SECRET_KEY is not set',
        hasKey: false,
      }, { status: 500 });
    }

    // Check key format
    const isValidFormat = secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_');
    
    if (!isValidFormat) {
      return NextResponse.json({
        error: 'Invalid key format',
        hasKey: true,
        keyPrefix: secretKey.substring(0, 10),
        expectedPrefix: 'sk_test_ or sk_live_',
      }, { status: 500 });
    }

    // Try to initialize Stripe and make a test API call
    try {
      const stripe = getStripe();
      
      // Make a simple API call to verify the key works
      const account = await stripe.account.retrieve();
      
      return NextResponse.json({
        success: true,
        message: 'Stripe API key is valid',
        accountId: account.id,
        keyPrefix: secretKey.substring(0, 10) + '...',
        keyLength: secretKey.length,
      });
    } catch (stripeError: any) {
      return NextResponse.json({
        error: 'Stripe API key is invalid',
        stripeError: stripeError.message,
        stripeErrorType: stripeError.type,
        hasKey: true,
        keyPrefix: secretKey.substring(0, 10) + '...',
        keyLength: secretKey.length,
        suggestion: 'Please verify your key at https://dashboard.stripe.com/apikeys',
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      hasKey: !!process.env.STRIPE_SECRET_KEY,
    }, { status: 500 });
  }
}

