import { NextRequest, NextResponse } from 'next/server';
import { sendEmailSummariesToAllUsers } from '@/lib/email-summaries';

/**
 * Cron endpoint to send email summaries to all users
 * 
 * Protect this endpoint with a secret token or use Vercel Cron
 * Example: GET /api/cron/send-email-summaries?secret=YOUR_CRON_SECRET
 */
export async function GET(req: NextRequest) {
  try {
    // Optional: Verify cron secret
    const secret = req.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if email provider is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email provider not configured. Please set RESEND_API_KEY.',
          sent: 0,
          skipped: 0,
          errors: 0,
        },
        { status: 500 }
      );
    }

    const results = await sendEmailSummariesToAllUsers();

    return NextResponse.json({
      success: true,
      message: `Email summaries sent: ${results.sent}, skipped: ${results.skipped}, errors: ${results.errors}`,
      ...results,
    });
  } catch (error: any) {
    console.error('Error in send-email-summaries cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send email summaries',
        sent: 0,
        skipped: 0,
        errors: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual triggering (useful for testing)
 */
export async function POST(req: NextRequest) {
  return GET(req);
}

