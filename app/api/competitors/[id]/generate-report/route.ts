import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateCompetitorReport, formatReportContent } from '@/lib/ai';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const competitorId = params.id;

    if (!competitorId) {
      return NextResponse.json({ error: 'Competitor ID required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile ID first
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get competitor and verify ownership using server-side client
    const { data: competitor, error: competitorError } = await supabase
      .from('competitors')
      .select('*')
      .eq('id', competitorId)
      .eq('user_id', profile.id)
      .single();

    if (competitorError || !competitor) {
      return NextResponse.json(
        { error: 'Competitor not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get last 2-3 snapshots using server-side client
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('snapshots')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (snapshotsError) {
      console.error('Error fetching snapshots:', snapshotsError);
      return NextResponse.json(
        { error: 'Failed to fetch snapshots' },
        { status: 500 }
      );
    }

    const recentSnapshots = snapshots || [];

    if (recentSnapshots.length === 0) {
      return NextResponse.json(
        { error: 'No snapshots available. Please scan the competitor first.' },
        { status: 400 }
      );
    }

    // Prepare data for AI
    const aiRequest = {
      competitorName: competitor.name,
      competitorWebsite: competitor.website,
      snapshots: recentSnapshots.map((snapshot) => ({
        id: snapshot.id,
        createdAt: snapshot.created_at,
        changesSummary: snapshot.changes_summary || {},
      })),
    };

    // Generate AI report
    const aiReport = await generateCompetitorReport(aiRequest);

    // Format content
    const content = formatReportContent(aiReport);

    // Save to database using server-side client
    const { data: report, error: insertError } = await supabase
      .from('competitor_reports')
      .insert({
        competitor_id: competitorId,
        title: aiReport.title,
        content,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating report:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to save report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: report.id,
      competitor_id: report.competitor_id,
      title: report.title,
      content: report.content,
      created_at: report.created_at,
    });
  } catch (error: any) {
    console.error('Error generating competitor report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}

