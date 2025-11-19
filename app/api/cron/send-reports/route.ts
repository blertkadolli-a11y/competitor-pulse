import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendDailyReport, sendWeeklyReport } from '@/lib/email';

// This endpoint should be called by a cron job to send daily/weekly email reports
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret if needed
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = req.nextUrl.searchParams;
    const reportType = type === 'weekly' ? 'weekly' : 'daily';

    if (!type || (type !== 'daily' && type !== 'weekly')) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "daily" or "weekly"' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Get all users with email preferences (for now, all active users)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .not('email', 'is', null);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: 'No users to send reports to' });
    }

    const results = [];

    for (const profile of profiles) {
      try {
        // Generate report for user
        const reportResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/reports/generate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // In production, you'd need to authenticate this request
              // For now, we'll use a service role or API key
            },
            body: JSON.stringify({
              type: reportType,
              userId: profile.id, // You'd need to modify the generate endpoint to accept userId
            }),
          }
        );

        if (!reportResponse.ok) {
          throw new Error('Failed to generate report');
        }

        const report = await reportResponse.json();

        // Send email
        const emailResult =
          reportType === 'daily'
            ? await sendDailyReport(profile.email!, report.content)
            : await sendWeeklyReport(profile.email!, report.content);

        results.push({
          user_id: profile.id,
          email: profile.email,
          success: emailResult.success,
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

    return NextResponse.json({
      success: true,
      report_type: reportType,
      processed: profiles.length,
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

