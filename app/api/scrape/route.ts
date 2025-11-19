import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { competitorId } = await req.json();

    if (!competitorId) {
      return NextResponse.json({ error: 'Competitor ID is required' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Get competitor
    const { data: competitor, error: competitorError } = await supabase
      .from('competitors')
      .select('*')
      .eq('id', competitorId)
      .single();

    if (competitorError || !competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    // Fetch website
    const response = await fetch(competitor.website, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract text content
    $('script, style, nav, header, footer').remove();
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();

    // Extract pricing information (look for common pricing patterns)
    let priceInfo: string | null = null;
    $('body').find('*').each((_, elem) => {
      const text = $(elem).text();
      const priceMatch = text.match(/\$[\d,]+(\.\d{2})?/);
      if (priceMatch && !priceInfo) {
        priceInfo = priceMatch[0];
      }
    });

    // Extract features (look for lists with feature-like text)
    const features: string[] = [];
    $('ul, ol').each((_, elem) => {
      $(elem)
        .find('li')
        .each((_, li) => {
          const text = $(li).text().trim();
          if (text.length > 10 && text.length < 200) {
            features.push(text);
          }
        });
    });

    // Get previous snapshot for comparison
    const { data: previousSnapshot } = await supabase
      .from('snapshots')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Create new snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('snapshots')
      .insert({
        competitor_id: competitorId,
        html_content: html,
        text_content: textContent,
        price_info: priceInfo,
        features: features.slice(0, 20), // Limit to 20 features
        metadata: {
          url: competitor.website,
          scraped_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (snapshotError || !snapshot) {
      return NextResponse.json(
        { error: 'Failed to create snapshot' },
        { status: 500 }
      );
    }

    // Compare with previous snapshot if exists
    const changes: any[] = [];

    if (previousSnapshot) {
      // Text changes
      if (textContent !== previousSnapshot.text_content) {
        const diffLength = Math.abs(textContent.length - previousSnapshot.text_content.length);
        if (diffLength > 100) {
          changes.push({
            change_type: 'text',
            description: `Website content changed (${diffLength > 0 ? '+' : ''}${diffLength} characters)`,
            details: {
              previous_length: previousSnapshot.text_content.length,
              new_length: textContent.length,
            },
          });
        }
      }

      // Pricing changes
      if (priceInfo !== previousSnapshot.price_info) {
        changes.push({
          change_type: 'pricing',
          description: `Pricing changed from "${previousSnapshot.price_info || 'N/A'}" to "${priceInfo || 'N/A'}"`,
          details: {
            previous_price: previousSnapshot.price_info,
            new_price: priceInfo,
          },
        });
      }

      // Feature changes
      const previousFeatures = (previousSnapshot.features as string[]) || [];
      const newFeatures = features.filter((f) => !previousFeatures.includes(f));
      const removedFeatures = previousFeatures.filter((f) => !features.includes(f));

      if (newFeatures.length > 0) {
        changes.push({
          change_type: 'feature',
          description: `${newFeatures.length} new feature(s) detected: ${newFeatures.slice(0, 3).join(', ')}`,
          details: {
            new_features: newFeatures,
          },
        });
      }

      if (removedFeatures.length > 0) {
        changes.push({
          change_type: 'removed_section',
          description: `${removedFeatures.length} feature(s) removed: ${removedFeatures.slice(0, 3).join(', ')}`,
          details: {
            removed_features: removedFeatures,
          },
        });
      }
    } else {
      // First snapshot
      changes.push({
        change_type: 'new_section',
        description: 'Initial snapshot created',
        details: {
          website: competitor.website,
        },
      });
    }

    // Create change records
    if (changes.length > 0) {
      const changeRecords = changes.map((change) => ({
        competitor_id: competitorId,
        snapshot_id: snapshot.id,
        previous_snapshot_id: previousSnapshot?.id || null,
        change_type: change.change_type,
        description: change.description,
        details: change.details,
      }));

      const { error: changesError } = await supabase
        .from('changes')
        .insert(changeRecords);

      if (changesError) {
        console.error('Error creating change records:', changesError);
      } else {
        // Create alerts for the user
        const { data: competitorData } = await supabase
          .from('competitors')
          .select('user_id')
          .eq('id', competitorId)
          .single();

        if (competitorData) {
          const alertRecords = changeRecords.map((change) => ({
            user_id: competitorData.user_id,
            competitor_id: competitorId,
            change_id: change.snapshot_id, // This should be the change ID, simplified for now
          }));

          // Get the actual change IDs
          const { data: createdChanges } = await supabase
            .from('changes')
            .select('id')
            .eq('snapshot_id', snapshot.id);

          if (createdChanges && createdChanges.length > 0) {
            const alerts = createdChanges.map((change) => ({
              user_id: competitorData.user_id,
              competitor_id: competitorId,
              change_id: change.id,
            }));

            await supabase.from('alerts').insert(alerts);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      snapshot_id: snapshot.id,
      changes_detected: changes.length,
    });
  } catch (error: any) {
    console.error('Error scraping competitor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape competitor' },
      { status: 500 }
    );
  }
}

