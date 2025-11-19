import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// This endpoint should be called by a cron job service (like Vercel Cron, GitHub Actions, etc.)
// to scrape all competitors every 24 hours
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret if needed
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceClient();

    // Get all active competitors
    const { data: competitors, error } = await supabase
      .from('competitors')
      .select('id');

    if (error || !competitors) {
      return NextResponse.json(
        { error: 'Failed to fetch competitors' },
        { status: 500 }
      );
    }

    // Scrape each competitor (in production, you might want to queue these)
    const results = [];

    for (const competitor of competitors) {
      try {
        const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scrape`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ competitorId: competitor.id }),
        });

        const result = await scrapeResponse.json();
        results.push({
          competitor_id: competitor.id,
          success: scrapeResponse.ok,
          result,
        });
      } catch (error: any) {
        results.push({
          competitor_id: competitor.id,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: competitors.length,
      results,
    });
  } catch (error: any) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}

