import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendUserEmailSummary } from '@/lib/email-summaries';

// This endpoint should be called by a cron job to send daily/weekly email reports
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret if needed
    const authHeader = req.headers.get('authorization');
    const secret = req.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret) {
      if (authHeader && authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (secret && secret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!authHeader && !secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const type = req.nextUrl.searchParams.get('type');
    const reportType = type === 'weekly' ? 'weekly' : 'daily';

    if (!type || (type !== 'daily' && type !== 'weekly')) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "daily" or "weekly"' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Get all users with email preferences matching the requested type
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, email_frequency')
      .eq('email_frequency', reportType)
      .not('email', 'is', null);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ 
        message: `No users with ${reportType} email frequency to send reports to`,
        processed: 0,
        results: []
      });
    }

    const results = [];

    for (const profile of profiles) {
      try {
        // Send email summary for user (this function handles generating the summary)
        const emailResult = await sendUserEmailSummary(profile.id);

        results.push({
          user_id: profile.id,
          email: profile.email,
          success: emailResult.success,
          error: emailResult.error,
        });
      } catch (error: any) {
        results.push({
          user_id: profile.id,
          email: profile.email,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      report_type: reportType,
      processed: profiles.length,
      sent: successCount,
      errors: errorCount,
      results,
    });
  } catch (error: any) {
    console.error('Error in send reports cron job:', error);
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}

