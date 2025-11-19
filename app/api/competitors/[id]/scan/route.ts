import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import * as cheerio from 'cheerio';
import { detectTextChanges } from '@/lib/utils/textDiff';
import { ChangesSummary } from '@/lib/types';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
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

    const competitorId = params.id;

    if (!competitorId) {
      return NextResponse.json({ error: 'Competitor ID required' }, { status: 400 });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get competitor and verify ownership
    const { data: competitor, error: competitorError } = await supabase
      .from('competitors')
      .select('id, name, website')
      .eq('id', competitorId)
      .eq('user_id', profile.id)
      .single();

    if (competitorError || !competitor) {
      return NextResponse.json(
        { error: 'Competitor not found' },
        { status: 404 }
      );
    }

    // Fetch website HTML
    let htmlContent: string;
    try {
      const response = await fetch(competitor.website, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
      }

      htmlContent = await response.text();
    } catch (fetchError: any) {
      console.error('Error fetching website:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch website: ${fetchError.message}` },
        { status: 500 }
      );
    }

    // Parse HTML and extract text content
    const $ = cheerio.load(htmlContent);
    
    // Remove script and style tags
    $('script, style, noscript').remove();
    
    // Extract text from body
    const textContent = $('body').text()
      .replace(/\s+/g, ' ')
      .trim();

    if (!textContent || textContent.length < 50) {
      return NextResponse.json(
        { error: 'Website content too short or inaccessible' },
        { status: 400 }
      );
    }

    // Get latest snapshot for comparison
    const { data: latestSnapshot } = await supabase
      .from('snapshots')
      .select('html_content, changes_summary')
      .eq('competitor_id', competitorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let hasChanges = false;
    let changesSummary: ChangesSummary = {};
    let alertMessage = '';

    if (latestSnapshot?.html_content) {
      // Extract text from previous snapshot
      const $old = cheerio.load(latestSnapshot.html_content);
      $old('script, style, noscript').remove();
      const oldTextContent = $old('body').text()
        .replace(/\s+/g, ' ')
        .trim();

      // Compare texts
      const diffResult = detectTextChanges(oldTextContent, textContent);

      if (diffResult.hasChanges) {
        hasChanges = true;
        changesSummary = {
          text_changes: diffResult.changes,
        };

        // Create alert message
        if (diffResult.changes.length > 0) {
          alertMessage = `Content changes detected (${diffResult.changePercentage}% difference): ${diffResult.changes[0]}`;
        } else {
          alertMessage = `Content changes detected (${diffResult.changePercentage}% difference)`;
        }
      }
    } else {
      // First snapshot - no comparison needed
      hasChanges = true;
      changesSummary = {
        text_changes: ['Initial snapshot created'],
      };
      alertMessage = 'Initial snapshot created for this competitor';
    }

    // Always create a snapshot (even if no changes, for tracking)
    const { data: newSnapshot, error: snapshotError } = await supabase
      .from('snapshots')
      .insert({
        competitor_id: competitorId,
        html_content: htmlContent,
        changes_summary: changesSummary,
      })
      .select()
      .single();

    if (snapshotError) {
      console.error('Error creating snapshot:', snapshotError);
      return NextResponse.json(
        { error: 'Failed to create snapshot' },
        { status: 500 }
      );
    }

    // Create alert only if changes were detected
    let newAlert = null;
    if (hasChanges && alertMessage) {
      const { data: alert, error: alertError } = await supabase
        .from('alerts')
        .insert({
          competitor_id: competitorId,
          type: 'content',
          message: alertMessage,
        })
        .select()
        .single();

      if (alertError) {
        console.error('Error creating alert:', alertError);
        // Don't fail the whole request if alert creation fails
      } else {
        newAlert = alert;
      }
    }

    return NextResponse.json({
      success: true,
      snapshot: newSnapshot,
      alert: newAlert,
      hasChanges,
      message: hasChanges
        ? 'Changes detected and snapshot created'
        : 'No changes detected, snapshot created',
    });
  } catch (error: any) {
    console.error('Error scanning competitor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scan competitor' },
      { status: 500 }
    );
  }
}

